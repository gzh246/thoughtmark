/**
 * 基础 HTTP 客户端
 *
 * 携带认证 Header 调用 thoughtmark-web REST API。
 * 所有插件端的网络请求都通过这个客户端发出。
 *
 * Story 3.1: 添加 Authorization header（从 Chrome Storage 读取 token）
 * TODO(Story-3.3): 离线时拦截请求，写入本地队列
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/**
 * 从 Chrome Storage 获取保存的 auth token
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const result = await browser.storage.local.get('authToken') as Record<string, string | undefined>;
    return result.authToken || null;
  } catch {
    return null;
  }
}

/**
 * 保存 auth token 到 Chrome Storage
 */
export async function saveAuthToken(token: string): Promise<void> {
  await browser.storage.local.set({ authToken: token });
}

/**
 * 清除 auth token
 */
export async function clearAuthToken(): Promise<void> {
  await browser.storage.local.remove('authToken');
}

/**
 * 检查是否已登录（token 是否存在）
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return !!token;
}

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
  const token = await getAuthToken();

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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

/**
 * PUT 请求快捷方法（Story 3.4: 覆盖更新）
 */
export async function apiPut(
  path: string,
  body: unknown
): Promise<Response> {
  return apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}
