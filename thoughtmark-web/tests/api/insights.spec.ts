import { test, expect } from '@playwright/test';

/**
 * 洞察 API 测试 (A10-A17)
 *
 * 测试 /api/insights + /api/insights/* 端点
 * 大部分需要登录，且需要有数据才能正常测试
 * 这里重点测试边界校验和错误处理
 */

const BASE = 'http://localhost:3000';

// ── 无 Auth 测试（应返回 401）──────────────

test.describe('洞察 API — 未认证', () => {
  test('A10: POST /api/insights 未登录 → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/insights`, {
      data: { type: 'comparison', clusterId: 'fake-id' },
    });
    expect(res.status()).toBe(401);
  });

  test('A11: POST /api/insights type=gaps 未登录 → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/insights`, {
      data: { type: 'gaps' },
    });
    expect(res.status()).toBe(401);
  });

  test('A12: GET /api/insights/monthly 未登录 → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/insights/monthly`);
    expect(res.status()).toBe(401);
  });
});

// ── 认知分析 API 边界校验 ──────────────

test.describe('认知分析 API — 边界校验', () => {
  // 辅助：获取 session
  const UNIQUE = Date.now();
  let cookie: string;

  test.beforeAll(async ({ request }) => {
    // 注册
    await request.post(`${BASE}/api/auth/register`, {
      data: {
        name: `insight-test-${UNIQUE}`,
        email: `insight-${UNIQUE}@test.com`,
        password: 'test1234',
      },
    });
    // 登录
    const csrfRes = await request.get(`${BASE}/api/auth/csrf`);
    const { csrfToken } = await csrfRes.json();
    const loginRes = await request.post(`${BASE}/api/auth/callback/credentials`, {
      form: {
        email: `insight-${UNIQUE}@test.com`,
        password: 'test1234',
        csrfToken,
      },
      maxRedirects: 0,
    });
    cookie = loginRes.headers()['set-cookie'] || '';
  });

  test('A13: intent-patterns 数据不足 → 400 INSUFFICIENT_DATA', async ({ request }) => {
    const res = await request.post(`${BASE}/api/insights/intent-patterns`, {
      headers: { cookie },
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.error?.code).toBe('INSUFFICIENT_DATA');
  });

  test('A14: cognitive-evolution 无 clusterId → 400 VALIDATION_ERROR', async ({ request }) => {
    const res = await request.post(`${BASE}/api/insights/cognitive-evolution`, {
      headers: { cookie },
      data: {},
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.error?.code).toBe('VALIDATION_ERROR');
  });

  test('A15: cognitive-evolution 不存在的 clusterId → 404', async ({ request }) => {
    const res = await request.post(`${BASE}/api/insights/cognitive-evolution`, {
      headers: { cookie },
      data: { clusterId: 'nonexistent-id' },
    });
    expect(res.status()).toBe(404);
    const json = await res.json();
    expect(json.error?.code).toBe('NOT_FOUND');
  });

  test('A16: learning-path 无聚类 → 400 INSUFFICIENT_DATA', async ({ request }) => {
    const res = await request.post(`${BASE}/api/insights/learning-path`, {
      headers: { cookie },
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.error?.code).toBe('INSUFFICIENT_DATA');
  });

  test('A17: interest-evolution 数据不足 → 400 INSUFFICIENT_DATA', async ({ request }) => {
    const res = await request.get(`${BASE}/api/insights/interest-evolution`, {
      headers: { cookie },
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.error?.code).toBe('INSUFFICIENT_DATA');
  });
});
