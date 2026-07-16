import { test, expect } from '@playwright/test';

/**
 * 管理 API 测试 (A21-A22)
 *
 * 测试 /api/admin 端点的权限控制
 */

const BASE = 'http://localhost:3000';

test.describe('管理后台 API', () => {
  test('A21: 未登录访问 /api/admin/stats → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/admin/stats`);
    expect([401, 403]).toContain(res.status());
  });

  test('A22: 非管理员访问 /api/admin/stats → 403', async ({ request }) => {
    // 注册普通用户
    const UNIQUE = Date.now();
    await request.post(`${BASE}/api/auth/register`, {
      data: {
        name: `admin-test-${UNIQUE}`,
        email: `admin-${UNIQUE}@test.com`,
        password: 'test1234',
      },
    });
    // 登录
    const csrfRes = await request.get(`${BASE}/api/auth/csrf`);
    const { csrfToken } = await csrfRes.json();
    const loginRes = await request.post(`${BASE}/api/auth/callback/credentials`, {
      form: {
        email: `admin-${UNIQUE}@test.com`,
        password: 'test1234',
        csrfToken,
      },
      maxRedirects: 0,
    });
    const cookie = loginRes.headers()['set-cookie'] || '';

    const res = await request.get(`${BASE}/api/admin/stats`, {
      headers: { cookie },
    });
    expect([401, 403]).toContain(res.status());
  });
});
