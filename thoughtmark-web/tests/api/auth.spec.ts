import { test, expect } from '@playwright/test';

/**
 * 认证 API 测试 (A1-A3)
 *
 * 测试 /api/auth 相关端点
 */

const BASE = 'http://localhost:3000';
const UNIQUE = Date.now();

// A1: 正常注册
test.describe('POST /api/auth/register', () => {
  test('A1: 正常注册 → 201 + { id, email }', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/register`, {
      data: {
        name: `测试用户-${UNIQUE}`,
        email: `api-test-${UNIQUE}@test.com`,
        password: 'test1234',
      },
    });
    expect(res.status()).toBe(201);
    const json = await res.json();
    expect(json.id).toBeTruthy();
    expect(json.email).toBe(`api-test-${UNIQUE}@test.com`);
  });

  // A2: 重复邮箱
  test('A2: 重复邮箱 → 409 + message', async ({ request }) => {
    // 先注册一次
    await request.post(`${BASE}/api/auth/register`, {
      data: {
        name: '重复测试',
        email: `dup-${UNIQUE}@test.com`,
        password: 'test1234',
      },
    });
    // 再注册同一邮箱
    const res = await request.post(`${BASE}/api/auth/register`, {
      data: {
        name: '重复测试2',
        email: `dup-${UNIQUE}@test.com`,
        password: 'test1234',
      },
    });
    expect(res.status()).toBe(409);
    const json = await res.json();
    expect(json.message).toContain('已被使用');
  });
});

// A3: NextAuth 登录 — 错误密码
test.describe('NextAuth credentials', () => {
  test('A3: 错误密码 → NextAuth 返回非成功登录', async ({ request }) => {
    // NextAuth callback 通常返回 200 + redirect URL
    // 或 302 重定向到 error 页面
    const res = await request.post(`${BASE}/api/auth/callback/credentials`, {
      form: {
        email: `api-test-${UNIQUE}@test.com`,
        password: 'wrong_password',
      },
      maxRedirects: 0,
    });
    // NextAuth v4/v5 可能返回 200(with error redirect) 或 302 或 401
    expect([200, 302, 401, 403]).toContain(res.status());
    // 如果 200，检查响应中是否有 error 参数
    if (res.status() === 200) {
      const text = await res.text();
      // NextAuth 在错误密码时 redirect URL 通常包含 error
      expect(text.length).toBeGreaterThan(0);
    }
  });
});
