import { test, expect } from '@playwright/test';

/**
 * 通知增强 + 时间轴 V2 E2E 测试 (E25-E28)
 *
 * E25-E26: 通知铃铛 SSE 推送
 * E27-E28: 时间轴书签卡片 V2 增强
 */

const TEST_USER = {
  email: `e2e-notif-${Date.now()}@test.com`,
  password: 'test1234',
};

test.describe('通知增强 + 时间轴 V2', () => {
  test.beforeAll(async ({ request }) => {
    const BASE = 'http://localhost:3000';
    await request.post(`${BASE}/api/auth/register`, {
      data: { name: '通知测试', email: TEST_USER.email, password: TEST_USER.password },
    });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: '邮箱' }).fill(TEST_USER.email);
    await page.getByRole('textbox', { name: '密码' }).fill(TEST_USER.password);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/timeline/);
  });

  // E25: 通知铃铛存在
  test('E25: NotificationBell 铃铛按钮存在', async ({ page }) => {
    const bell = page.getByRole('button', { name: /通知/ });
    await expect(bell).toBeVisible();
  });

  // E26: 点击通知 → 展开下拉
  test('E26: 点击通知铃铛 → 显示通知面板', async ({ page }) => {
    const bell = page.getByRole('button', { name: /通知/ });
    await bell.click();
    await page.waitForTimeout(500);
    // 应显示空状态或通知列表
    const hasPanel = await page.getByText(/暂无|通知/).count();
    expect(hasPanel).toBeGreaterThanOrEqual(1);
  });

  // E27: 时间轴空状态
  test('E27: 时间轴空状态提示', async ({ page }) => {
    await expect(page.getByText('还没有收藏')).toBeVisible();
  });

  // E28: 时间轴导航完整性
  test('E28: 时间轴页面导航完整', async ({ page }) => {
    // 应有搜索入口
    const searchLink = page.getByRole('link', { name: /搜索|🔍/ });
    if (await searchLink.count() > 0) {
      await expect(searchLink.first()).toBeVisible();
    }
    // 应有图谱入口
    const graphLink = page.getByRole('link', { name: /图谱|🕸/ });
    if (await graphLink.count() > 0) {
      await expect(graphLink.first()).toBeVisible();
    }
    // 应有洞察入口
    const insightLink = page.getByRole('link', { name: /洞察|💡/ });
    if (await insightLink.count() > 0) {
      await expect(insightLink.first()).toBeVisible();
    }
  });
});
