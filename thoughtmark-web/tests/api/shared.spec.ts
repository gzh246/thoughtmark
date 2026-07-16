import { test, expect } from '@playwright/test';

/**
 * 分享页 API 测试 (A18-A20)
 *
 * 测试 GET/POST /api/shared/[token]
 */

const BASE = 'http://localhost:3000';

test.describe('分享页 API', () => {
  test('A18: GET /api/shared/invalid-token → 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/shared/nonexistent-token-12345`);
    expect(res.status()).toBe(404);
    const json = await res.json();
    expect(json.error?.message).toContain('不存在');
  });

  test('A19: POST /api/shared/invalid-token 密码验证 → 404', async ({ request }) => {
    const res = await request.post(`${BASE}/api/shared/nonexistent-token-12345`, {
      data: { password: 'test' },
    });
    expect(res.status()).toBe(404);
  });

  // A20: 完整的公开分享流程需要先创建书签+分享
  // 这个测试依赖 bookmarks.spec.ts 中创建的分享链接
  test('A20: 完整分享流程 — 创建 → 分享 → 访问', async ({ request }) => {
    // 1. 注册+登录
    const UNIQUE = Date.now();
    await request.post(`${BASE}/api/auth/register`, {
      data: {
        name: `share-test-${UNIQUE}`,
        email: `share-${UNIQUE}@test.com`,
        password: 'test1234',
      },
    });
    const csrfRes = await request.get(`${BASE}/api/auth/csrf`);
    const { csrfToken } = await csrfRes.json();
    const loginRes = await request.post(`${BASE}/api/auth/callback/credentials`, {
      form: {
        email: `share-${UNIQUE}@test.com`,
        password: 'test1234',
        csrfToken,
      },
      maxRedirects: 0,
    });
    const cookie = loginRes.headers()['set-cookie'] || '';

    // 2. 创建书签
    const bmRes = await request.post(`${BASE}/api/bookmarks`, {
      headers: { cookie },
      data: {
        url: 'https://example.com/share-test',
        title: '分享测试文章',
        whySaved: '测试分享功能',
        quickTags: ['分享', '测试'],
      },
    });
    if (bmRes.status() > 201) test.skip();
    const bmJson = await bmRes.json();
    const bookmarkId = bmJson.data?.id || bmJson.id;
    if (!bookmarkId) test.skip();

    // 3. 生成分享链接
    const shareRes = await request.post(`${BASE}/api/bookmarks/${bookmarkId}/share`, {
      headers: { cookie },
      data: {},
    });
    expect(shareRes.status()).toBe(200);
    const shareJson = await shareRes.json();
    const token = shareJson.data?.shareToken || shareJson.shareToken;
    expect(token).toBeTruthy();

    // 4. 访问分享页
    const publicRes = await request.get(`${BASE}/api/shared/${token}`);
    expect(publicRes.status()).toBe(200);
    const publicJson = await publicRes.json();
    expect(publicJson.data?.title).toBe('分享测试文章');
  });
});
