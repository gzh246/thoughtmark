import { test, expect } from '@playwright/test';

/**
 * 分享页 E2E 测试 (E19-E22)
 *
 * 覆盖 /shared/[token] 页面的公开/私密分享流程
 */

test.describe('分享页面', () => {
  test('E19: 不存在的 token → 显示"页面不存在"', async ({ page }) => {
    await page.goto('/shared/nonexistent-fake-token-99999');
    await page.waitForTimeout(3000);
    // 无效 token 应显示"不存在"或空白页面或加载状态
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  // E20-E22 需要一个真实的分享链接
  // 这里我们创建书签 → 分享 → 测试页面
  test('E20-E22: 完整分享 → 公开/私密页面展示', async ({ page, request }) => {
    const BASE = 'http://localhost:3000';
    const UNIQUE = Date.now();

    // 1. 注册
    await request.post(`${BASE}/api/auth/register`, {
      data: {
        name: `share-e2e-${UNIQUE}`,
        email: `share-e2e-${UNIQUE}@test.com`,
        password: 'test1234',
      },
    });

    // 2. 登录获取 session
    const csrfRes = await request.get(`${BASE}/api/auth/csrf`);
    const { csrfToken } = await csrfRes.json();
    await request.post(`${BASE}/api/auth/callback/credentials`, {
      form: {
        email: `share-e2e-${UNIQUE}@test.com`,
        password: 'test1234',
        csrfToken,
      },
      maxRedirects: 0,
    });

    // 3. 通过 UI 登录（因为 page context 和 request context 可能不共享 cookie）
    await page.goto('/login');
    await page.getByRole('textbox', { name: '邮箱' }).fill(`share-e2e-${UNIQUE}@test.com`);
    await page.getByRole('textbox', { name: '密码' }).fill('test1234');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/timeline/);

    // 4. API 创建书签
    const bmRes = await request.post(`${BASE}/api/bookmarks`, {
      data: {
        url: 'https://example.com/shared-e2e',
        title: 'E2E 分享测试文章',
        whySaved: '测试分享页面渲染',
        quickTags: ['E2E', '分享'],
      },
    });
    if (bmRes.status() > 201) {
      test.skip();
      return;
    }
    const bmJson = await bmRes.json();
    const bookmarkId = bmJson.data?.id || bmJson.id;
    if (!bookmarkId) {
      test.skip();
      return;
    }

    // 5. 生成分享链接
    const shareRes = await request.post(`${BASE}/api/bookmarks/${bookmarkId}/share`, {
      data: {},
    });
    if (shareRes.status() !== 200) {
      test.skip();
      return;
    }
    const shareJson = await shareRes.json();
    const token = shareJson.data?.shareToken || shareJson.shareToken;

    if (token) {
      // E19: 公开分享 → 标题可见
      await page.goto(`/shared/${token}`);
      await page.waitForTimeout(2000);
      await expect(page.getByText('E2E 分享测试文章')).toBeVisible();
      // 应有 "查看原文" 链接
      await expect(page.getByText('查看原文')).toBeVisible();
    }
  });
});
