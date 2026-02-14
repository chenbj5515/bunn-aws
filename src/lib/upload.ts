'use client';

// 上传API的客户端调用helper
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
   * 是否检查上传限制，默认为true
   */
  checkLimits?: boolean;

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

  /**
   * 仅用于服务端透传请求头（例如 Cookie）。不会被服务端使用到。
   */
  requestHeaders?: Record<string, string>;
}

// 上传结果接口
export interface UploadResult {
  success: boolean;
  url?: string;
  message?: string;
  error?: Error;
}

// 生成 API 基础地址：
// - 浏览器环境返回空字符串，保持相对路径
// - 服务端环境返回绝对地址（优先环境变量，回退到本地）
function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') return '';
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.VERCEL_URL;
  if (envUrl) {
    const trimmed = envUrl.replace(/\/$/, '');
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}`;
}

/**
 * 上传文件到Vercel Blob（通过API调用）
 * @param file 要上传的文件
 * @param options 上传选项
 * @returns 上传结果
 */
export async function uploadFile(file: File, options: UploadOptions): Promise<UploadResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('options', JSON.stringify(options));

    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      // 浏览器端自动附带 cookie；服务端通过 requestHeaders 透传
      credentials: 'include',
      headers: options.requestHeaders,
      body: formData,
    });

    const contentType = response.headers.get('content-type') || '';
    let result: any = null;
    try {
      if (contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const rawText = await response.text();
        if (response.ok) {
          // 非JSON但ok，无法解析结构，返回通用失败
          return {
            success: false,
            message: '上传返回非JSON响应',
            error: new Error('上传返回非JSON响应')
          };
        }
        return {
          success: false,
          message: rawText?.slice(0, 200) || `HTTP ${response.status}`,
          error: new Error(rawText?.slice(0, 200) || `HTTP ${response.status}`)
        };
      }
    } catch (e) {
      // JSON解析失败，回退到text
      const rawText = await response.text().catch(() => '');
      const msg = rawText?.slice(0, 200) || (e instanceof Error ? e.message : '解析响应失败');
      return {
        success: false,
        message: msg,
        error: new Error(msg)
      };
    }

    if (!response.ok) {
      return {
        success: false,
        message: result?.message || `HTTP ${response.status}`,
        error: new Error(result?.message || `HTTP ${response.status}`)
      };
    }

    return result;
  } catch (error) {
    console.error('文件上传失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '上传失败',
      error: error instanceof Error ? error : new Error('上传失败')
    };
  }
}
