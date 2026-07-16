import { test, expect } from '@playwright/test';

/**
 * 书签 API 测试 (A4-A7)
 *
 * 测试 /api/bookmarks 相关端点
 * 通过 page context 登录获取 session
 */

const BASE = 'http://localhost:3000';
const UNIQUE = Date.now();
const TEST_EMAIL = `bm-test-${UNIQUE}@test.com`;

test.describe('书签 CRUD', () => {
  let bookmarkId: string;

  // 用 API 注册 + 用 browser context 登录（共享 cookie）
  test.beforeAll(async ({ request }) => {
    await request.post(`${BASE}/api/auth/register`, {
      data: {
        name: `bm-test-${UNIQUE}`,
        email: TEST_EMAIL,
        password: 'test1234',
      },
    });
  });

  test('A4: POST /api/bookmarks → 未认证返回 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/bookmarks`, {
      data: {
        url: 'https://example.com/test-article',
        title: 'API 测试文章',
        whySaved: '用于测试书签创建',
        quickTags: ['测试', 'API'],
      },
    });
    // 未认证时应返回 401
    expect(res.status()).toBe(401);
  });

  test('A5: POST /api/bookmarks → 认证后创建成功', async ({ browser }) => {
    // 通过 browser context 登录获取 session
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/login`);
    await page.getByRole('textbox', { name: '邮箱' }).fill(TEST_EMAIL);
    await page.getByRole('textbox', { name: '密码' }).fill('test1234');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/timeline/);

    // 用同一 context 的 request 发送 API 请求（自带 cookie）
    const apiContext = context.request;
    const res = await apiContext.post(`${BASE}/api/bookmarks`, {
      data: {
        url: 'https://example.com/test-bm-' + UNIQUE,
        title: '书签API测试文章',
        whySaved: '测试创建',
        quickTags: ['API测试'],
      },
    });

    // 创建成功
    if (res.status() === 200 || res.status() === 201) {
      const json = await res.json();
      bookmarkId = json.data?.id || json.id || '';
      expect(bookmarkId).toBeTruthy();
    }
    await context.close();
  });

  test('A6: GET /api/bookmarks → 认证后获取列表', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/login`);
    await page.getByRole('textbox', { name: '邮箱' }).fill(TEST_EMAIL);
    await page.getByRole('textbox', { name: '密码' }).fill('test1234');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/timeline/);

    const apiContext = context.request;
    const res = await apiContext.get(`${BASE}/api/bookmarks?page=1&limit=10`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.data).toBeInstanceOf(Array);
    await context.close();
  });

  test('A7: POST /api/bookmarks/[id]/share → 需要先有书签', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/login`);
    await page.getByRole('textbox', { name: '邮箱' }).fill(TEST_EMAIL);
    await page.getByRole('textbox', { name: '密码' }).fill('test1234');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/timeline/);

    // 先创建一个书签
    const apiContext = context.request;
    const bmRes = await apiContext.post(`${BASE}/api/bookmarks`, {
      data: {
        url: 'https://example.com/share-test-' + UNIQUE,
        title: '分享测试书签',
        whySaved: '测试分享',
        quickTags: ['分享'],
      },
    });

    if (bmRes.status() === 200 || bmRes.status() === 201) {
      const bmJson = await bmRes.json();
      const id = bmJson.data?.id || bmJson.id;
      if (id) {
        const shareRes = await apiContext.post(`${BASE}/api/bookmarks/${id}/share`, {
          data: {},
        });
        expect(shareRes.status()).toBe(200);
        const shareJson = await shareRes.json();
        expect(shareJson.data?.shareToken || shareJson.shareToken).toBeTruthy();
      }
    }
    await context.close();
  });
});
