/**
 * 基础 HTTP 客户端
 *
 * 携带认证 Header 调用 thoughtmark-web REST API。
 * 所有插件端的网络请求都通过这个客户端发出。
 *
 * TODO(Story-2.1): 从 Cookie/Storage 获取 auth token 并附加到 Header
 * TODO(Story-3.3): 离线时拦截请求，写入本地队列
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/**
 * 统一的 API 请求方法
 * @param path - API 路径，如 '/bookmarks'
 * @param options - fetch 选项
 * @returns Response
 */
export async function apiFetch(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const url = `${API_BASE}${path}`;

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // TODO(Story-2.1): 添加 Authorization header
      ...options?.headers,
    },
  });
}

/**
 * GET 请求快捷方法
 */
export async function apiGet(path: string): Promise<Response> {
  return apiFetch(path, { method: 'GET' });
}

/**
 * POST 请求快捷方法
 */
export async function apiPost(
  path: string,
  body: unknown
): Promise<Response> {
  return apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
