import { NotFoundError } from '@/lib/errors';
import { blobToBase64 } from '@/lib/blob-utils';
import { trpc } from "@/lib/trpc-client";
import { ERROR_CODES } from '@/server/constants';
import { CaptureFailureReason } from "../types";

// ============================================
// Result Types
// ============================================

export type RequestPermissionResult =
  | { ok: true; stream: MediaStream }
  | { ok: false; reason: CaptureFailureReason.PermissionDenied };

export type CaptureScreenshotResult =
  | { ok: true; imageBlob: Blob; imageUrl: string }
  | { ok: false; reason: CaptureFailureReason.NoVideoTrack };

export type ExtractSubtitlesResult =
  | { ok: true; subtitles: string }
  | { ok: false; reason: CaptureFailureReason.RateLimited }
  | { ok: false; reason: CaptureFailureReason.NoSubtitle };

// ============================================
// Screen Capture Utilities
// ============================================

/**
 * 请求屏幕共享权限
 */
async function requestDisplayMedia(): Promise<MediaStream> {
  return navigator.mediaDevices.getDisplayMedia({
    video: {
      displaySurface: 'browser',
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { max: 1 },
    },
    preferCurrentTab: true,
  } as DisplayMediaStreamOptions);
}

/**
 * 获取视频播放器的 iframe 或容器元素
 */
async function getIframeOrThrow(videoId: string): Promise<HTMLElement> {
  const prefix = 'channel-player-';
  const isPrefixed = videoId.startsWith(prefix);
  const containerSelector = isPrefixed ? `#${videoId}` : `#${prefix}${videoId}`;
  const fallbackSelector = `#${videoId}`;

  const tryFind = (): HTMLElement | null => {
    const channelPlayerContainer = document.querySelector(containerSelector) as HTMLElement | null;
    if (channelPlayerContainer) {
      const iframe = channelPlayerContainer.querySelector('iframe') as HTMLElement | null;
      if (iframe) return iframe;
      return channelPlayerContainer;
    }
    const directElement = document.querySelector(fallbackSelector) as HTMLElement | null;
    if (directElement) return directElement;
    return null;
  };

  const maxAttempts = 10;
  const delayMs = 150;
  let found: HTMLElement | null = tryFind();
  let attempt = 1;
  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  while (!found && attempt < maxAttempts) {
    attempt += 1;
    await wait(delayMs);
    found = tryFind();
  }

  if (found) return found;
  throw new NotFoundError('IFRAME_NOT_FOUND', 7001);
}

/**
 * 尝试将视频轨道裁剪到指定元素区域
 */
async function tryCropTrackToElement(track: MediaStreamTrack, el: HTMLElement): Promise<void> {
  const cropToWithTimeout = async (timeoutMs = 100): Promise<boolean> => {
    const cropPromise = (async () => {
      try {
        const cropTarget = await (window as any).CropTarget.fromElement(el);
        await (track as any).cropTo(cropTarget);
        return true;
      } catch (err) {
        console.error('裁剪到iframe失败，将使用整个屏幕内容:', err);
        return false;
      }
    })();

    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), timeoutMs);
    });

    return Promise.race([cropPromise, timeoutPromise]);
  };

  try {
    await cropToWithTimeout(100);
  } catch (err) {
    console.error('裁剪超时或失败，继续使用整屏捕获:', err);
  }
}

/**
 * 从屏幕共享流中截取指定区域的图片
 */
async function captureCenterRegion(
  stream: MediaStream,
  iframeEl: HTMLElement,
  cropWidth?: number,
  cropHeight?: number,
  keepPlaying: boolean = false,
  playbackRate: number = 1.0
): Promise<Blob> {
  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  (video as any).playsInline = true;
  video.playbackRate = playbackRate;
  await video.play();

  // 等待首帧稳定
  const waitStableFrame = async () => {
    const vAny = video as any;
    if (typeof vAny.requestVideoFrameCallback === 'function') {
      await new Promise<void>((resolve) => vAny.requestVideoFrameCallback(() => resolve()));
    } else {
      const start = performance.now();
      while (video.readyState < 2 && performance.now() - start < 500) {
        await new Promise((r) => setTimeout(r, 16));
      }
      await new Promise((r) => setTimeout(r, 16));
    }
  };
  await waitStableFrame();

  const iframeRect = iframeEl.getBoundingClientRect();
  const srcW = (video as any).videoWidth || Math.max(1, Math.floor(iframeRect.width));
  const srcH = (video as any).videoHeight || Math.max(1, Math.floor(iframeRect.height));

  // 计算裁剪区域
  let finalW: number;
  let finalH: number;
  let sx: number;
  let sy: number;

  if (cropWidth && cropHeight) {
    finalW = cropWidth;
    finalH = cropHeight;
    sx = Math.max(0, (srcW - cropWidth) / 2);
    sy = Math.max(0, (srcH - cropHeight) / 2);
  } else {
    // 默认截取底部 1/3 区域（字幕区域）
    finalW = srcW;
    finalH = Math.floor(srcH / 3);
    sx = 0;
    sy = srcH - finalH;
  }

  // 强制缩放，限制最大宽度
  const MAX_W = 1280;
  const scale = Math.min(1, MAX_W / finalW);
  const outW = Math.max(1, Math.round(finalW * scale));
  const outH = Math.max(1, Math.round(finalH * scale));

  const makeCanvas = (w: number, h: number): HTMLCanvasElement | OffscreenCanvas => {
    if ('OffscreenCanvas' in window) {
      return new (window as any).OffscreenCanvas(w, h);
    }
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  };

  const get2d = (c: any) => {
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('无法创建画布上下文');
    return ctx as CanvasRenderingContext2D;
  };

  const tmpCanvas = makeCanvas(finalW, finalH);
  const outCanvas = makeCanvas(outW, outH);
  const tmpCtx = get2d(tmpCanvas as any);
  const outCtx = get2d(outCanvas as any);

  tmpCtx.drawImage(video, sx, sy, finalW, finalH, 0, 0, finalW, finalH);
  outCtx.drawImage(tmpCanvas as any, 0, 0, finalW, finalH, 0, 0, outW, outH);

  const toBlobWithTimeout = async (
    canvas: any,
    mime = 'image/jpeg',
    quality = 0.85,
    timeoutMs = 1500
  ): Promise<Blob> => {
    const convertOnce = (q: number): Promise<Blob> => {
      const encode = () => {
        if ((canvas as any).convertToBlob) {
          return (canvas as OffscreenCanvas).convertToBlob({ type: mime, quality: q });
        }
        return new Promise<Blob>((resolve, reject) => {
          (canvas as HTMLCanvasElement).toBlob(
            (blob) => {
              if (!blob) return reject(new Error('无法创建图像blob'));
              resolve(blob);
            },
            mime,
            q
          );
        });
      };

      return new Promise<Blob>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('编码超时')), timeoutMs);
        encode().then(
          (b) => {
            clearTimeout(timer);
            resolve(b);
          },
          (e) => {
            clearTimeout(timer);
            reject(e);
          }
        );
      });
    };

    const qualities = [quality, 0.7, 0.55];
    for (let i = 0; i < qualities.length; i++) {
      const q = qualities[i] ?? 0.7;
      try {
        return await convertOnce(q);
      } catch (e) {
        if (i === qualities.length - 1) throw e;
      }
    }
    throw new Error('编码失败');
  };

  try {
    const blob = await toBlobWithTimeout(outCanvas);
    return blob;
  } finally {
    if (!keepPlaying) {
      try {
        video.pause();
        (video as any).srcObject = null;
      } catch {}
      stream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
    }
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * 请求屏幕共享权限
 */
export async function requestScreenPermission(): Promise<RequestPermissionResult> {
  try {
    const stream = await requestDisplayMedia();
    return { ok: true, stream };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      return { ok: false, reason: CaptureFailureReason.PermissionDenied };
    }
    throw error;
  }
}

/**
 * 从屏幕共享流中截取图片
 */
export async function captureScreenshot(
  stream: MediaStream,
  videoId: string
): Promise<CaptureScreenshotResult> {
  const [screenData] = stream.getVideoTracks();
  if (!screenData) {
    stream.getTracks().forEach(t => t.stop());
    return { ok: false, reason: CaptureFailureReason.NoVideoTrack };
  }

  const iframe = await getIframeOrThrow(videoId);
  await tryCropTrackToElement(screenData, iframe);
  const imageBlob = await captureCenterRegion(stream, iframe, undefined, undefined, true, 0.25);

  stream.getTracks().forEach(t => t.stop());

  const imageUrl = URL.createObjectURL(imageBlob);
  return { ok: true, imageBlob, imageUrl };
}

/**
 * 从图片中提取字幕
 */
export async function extractSubtitlesFromImage(
  imageBlob: Blob
): Promise<ExtractSubtitlesResult> {
  const imageBase64 = await blobToBase64(imageBlob);
  const result = await trpc.ai.extractSubtitles.mutate({ imageBase64 });

  if (result.errorCode !== null) {
    return {
      ok: false,
      reason: result.errorCode === ERROR_CODES.TOKEN_LIMIT_EXCEEDED ? CaptureFailureReason.RateLimited : CaptureFailureReason.NoSubtitle,
    };
  }

  if (!result.subtitles?.trim()) {
    return { ok: false, reason: CaptureFailureReason.NoSubtitle };
  }

  return { ok: true, subtitles: result.subtitles };
}

/**
 * 为 YouTube URL 添加当前播放时间戳
 */
export function appendTimestampToYouTubeUrl(
  contextUrl: string,
  getCurrentTime: () => number
): string {
  if (!contextUrl.includes('youtube.com')) {
    return contextUrl;
  }

  const currentTime = getCurrentTime();
  if (currentTime <= 0) {
    return contextUrl;
  }

  const url = new URL(contextUrl);
  url.searchParams.set('t', Math.floor(currentTime).toString());
  return url.toString();
}
