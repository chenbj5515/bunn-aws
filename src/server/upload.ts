import { del, put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';
import { getSession, trackUsage } from '@/lib/auth';
import { validateUserAndTokenLimit } from '@/utils/error-handling';

// 上传结果接口（服务端）
export interface UploadResult {
  success: boolean;
  url?: string;
  message?: string;
  /**
   * 给 Route Handler 用的 HTTP status（server actions 可忽略）
   */
  status?: number;
}

// 删除结果接口（服务端）
export interface DeleteResult {
  success: boolean;
  message?: string;
  status?: number;
}

// 上传选项接口（服务端）
export interface UploadOptions {
  /**
   * 上传文件的目录路径，例如: "channel-avatars", "series-covers"
   */
  directory: string;

  /**
   * 目录下的子路径，通常包含用户ID和资源ID，例如: "${userId}/${channelId}"
   * 如果不提供，会自动使用当前用户ID
   */
  path?: string;

  /**
   * 是否记录上传统计，默认为true
   */
  trackUpload?: boolean;

  /**
   * 访问权限，默认为"public"
   */
  access?: 'public';

  /**
   * 是否为文件名添加随机后缀，默认为false
   */
  addRandomSuffix?: boolean;

  /**
   * 自定义处理文件名的函数
   */
  fileNameHandler?: (fileName: string) => string;
}

// 规范化目录与路径片段，避免出现 "//" 等非法路径
function sanitizePathSegment(
  segment: string | undefined | null,
  fallback: string,
): string {
  const raw = (segment ?? '').toString();
  // 允许字母数字、下划杠、减号与正斜杠，其他替换为下划杠
  let cleaned = raw.replace(/[^a-zA-Z0-9_\/-]/g, '_');
  // 折叠多余斜杠
  cleaned = cleaned.replace(/\/+/g, '/');
  // 去掉首尾斜杠
  cleaned = cleaned.replace(/^\/+|\/+$/g, '');
  // 防止为空
  if (!cleaned) {
    cleaned = fallback
      .replace(/[^a-zA-Z0-9_\/-]/g, '_')
      .replace(/^\/+|\/+$/g, '');
  }
  return cleaned;
}

function sanitizeFileName(fileName: string): string {
  return (fileName || 'file').replace(/[^a-zA-Z0-9.-]/g, '_');
}

/**
 * 服务端直接上传到 Vercel Blob（用于 server actions / route handlers）
 * 关键点：不再通过内部 fetch(/api/upload)，从而不会丢失 cookie / session。
 */
export async function uploadToBlob(
  file: File,
  options: UploadOptions,
): Promise<UploadResult> {
  try {
    if (!file) {
      return { success: false, message: '未找到上传文件', status: 400 };
    }

    const session = await getSession();
    const userId = session?.user?.id;
    if (!userId) {
      return { success: false, message: '请先登录', status: 401 };
    }

    const mergedOptions: UploadOptions = {
      ...options,
      directory: options.directory ?? 'uploads',
    };

    // 费用相关：统一限流检查（token cost / blob cost 聚合的入口）
    {
      const validation = await validateUserAndTokenLimit();
      if (!validation.isValid && validation.errorResponse) {
        const { response, status } = validation.errorResponse;
        return {
          success: false,
          message: response.error,
          status,
        };
      }
    }

    // 处理文件名
    let fileName = file.name;
    if (mergedOptions.fileNameHandler) {
      fileName = mergedOptions.fileNameHandler(fileName);
    } else {
      fileName = sanitizeFileName(fileName);
    }

    // 构建路径（清洗目录与路径片段，防止出现 "//"）
    const sanitizedDirectory = sanitizePathSegment(
      mergedOptions.directory,
      'uploads',
    );
    const sanitizedPath = sanitizePathSegment(
      mergedOptions.path,
      userId,
    );
    let filePath = `${sanitizedDirectory}/${sanitizedPath}/${uuidv4()}-${fileName}`;
    filePath = filePath.replace(/\/+/g, '/');

    // 上传
    const blob = await put(filePath, file, {
      access: mergedOptions.access || 'public',
      addRandomSuffix: mergedOptions.addRandomSuffix || false,
    });

    // 异步记录 Blob 成本（如果启用）
    if (mergedOptions.trackUpload !== false && file.type?.startsWith('image/')) {
      trackUsage({
        inputTokens: 0,
        outputTokens: 0,
        model: 'blob',
        costMeta: {
          provider: 'blob',
          bytes: file.size,
        },
      }).catch(() => {});
    }

    return { success: true, url: blob.url };
  } catch (error) {
    console.error('文件上传失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '上传失败',
      status: 500,
    };
  }
}

/**
 * 服务端删除 Vercel Blob（用于 server actions / route handlers）
 */
export async function deleteBlobByUrl(url: string | null | undefined): Promise<DeleteResult> {
  try {
    if (!url) return { success: true };

    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, message: '请先登录', status: 401 };
    }

    const urlObj = new URL(url);
    const pathName = urlObj.pathname.startsWith('/')
      ? urlObj.pathname.substring(1)
      : urlObj.pathname;

    await del(pathName);
    return { success: true };
  } catch (error) {
    console.error('删除文件失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '删除失败',
      status: 500,
    };
  }
}