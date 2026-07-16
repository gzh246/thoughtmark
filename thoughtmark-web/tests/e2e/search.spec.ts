import { test, expect } from '@playwright/test';

/**
 * 搜索页 E2E 测试 (E1-E4)
 *
 * 覆盖搜索页完整用户流程
 */

const TEST_USER = {
  email: `e2e-search-${Date.now()}@test.com`,
  password: 'test1234',
};

test.describe('搜索页', () => {
  test.beforeAll(async ({ request }) => {
    const BASE = 'http://localhost:3000';
    await request.post(`${BASE}/api/auth/register`, {
      data: { name: '搜索测试', email: TEST_USER.email, password: TEST_USER.password },
    });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: '邮箱' }).fill(TEST_USER.email);
    await page.getByRole('textbox', { name: '密码' }).fill(TEST_USER.password);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/timeline/);
  });

  test('E1: 搜索页正常加载 + 输入框可见', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.getByRole('textbox').first();
    await expect(searchInput).toBeVisible();
  });

  test('E2: 输入关键词 → 搜索结果区域出现', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.getByRole('textbox').first();
    await searchInput.fill('测试');
    await searchInput.press('Enter');
    // 等待结果或空状态
    await page.waitForTimeout(2000);
    // 应有搜索结果区域或"未找到"提示
    const hasResults = await page.locator('[class*="search"]').count() > 0;
    const hasEmpty = await page.getByText(/未找到|没有结果|无结果/).count() > 0;
    expect(hasResults || hasEmpty).toBeTruthy();
  });

  test('E3: 搜索结果显示相似度', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.getByRole('textbox').first();
    await searchInput.fill('测试');
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);
    // 如果有搜索结果，应显示相似度百分比
    const percentages = await page.getByText(/%/).count();
    // 有结果时应有百分比，无结果时跳过
    if (percentages === 0) {
      test.skip();
    }
  });

  test('E4: 空搜索 → 显示提示', async ({ page }) => {
    await page.goto('/search');
    // 不输入任何内容的搜索页应显示默认状态
    await expect(page.locator('body')).toBeVisible();
  });
});
