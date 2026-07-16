import { test, expect } from '@playwright/test';

/**
 * Thoughtmark Web App E2E 测试
 *
 * 覆盖完整用户流程：
 * 1. 注册 → 2. 登录 → 3. 时间轴 → 4. 书签详情 → 5. AI 聚类
 * 6. 设置页 → 7. 通知 → 8. 退出登录
 *
 * 运行方式：npx playwright test --project=web-app
 * 前置条件：dev server 在 localhost:3000 运行
 */

// ====================
// 测试数据
// ====================
const TEST_USER = {
  name: 'E2E测试用户',
  email: `e2e-${Date.now()}@test.com`, // 每次运行生成唯一邮箱
  password: 'test1234',
};

// ====================
// 1. 注册流程
// ====================
test.describe('用户注册', () => {
  test('应该能成功注册新用户', async ({ page }) => {
    await page.goto('/register');

    // 填写注册表单
    await page.getByRole('textbox', { name: '昵称' }).fill(TEST_USER.name);
    await page.getByRole('textbox', { name: '邮箱' }).fill(TEST_USER.email);
    await page.getByRole('textbox', { name: '密码', exact: true }).fill(TEST_USER.password);
    await page.getByRole('textbox', { name: '确认密码' }).fill(TEST_USER.password);

    // 提交
    await page.getByRole('button', { name: '注册' }).click();

    // 验证：跳转到时间轴
    await expect(page).toHaveURL(/\/timeline/);
    await expect(page.getByRole('heading', { name: 'Thoughtmark' })).toBeVisible();
  });

  test('重复邮箱应提示错误', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('textbox', { name: '邮箱' }).fill(TEST_USER.email);
    await page.getByRole('textbox', { name: '密码', exact: true }).fill(TEST_USER.password);
    await page.getByRole('textbox', { name: '确认密码' }).fill(TEST_USER.password);
    await page.getByRole('button', { name: '注册' }).click();

    // 验证：应该有错误提示（邮箱已存在）
    await expect(page.getByText(/已存在|已注册|already/i)).toBeVisible({ timeout: 5000 });
  });
});

// ====================
// 2. 登录流程
// ====================
test.describe('用户登录', () => {
  test('正确密码应该能登录', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('textbox', { name: '邮箱' }).fill(TEST_USER.email);
    await page.getByRole('textbox', { name: '密码' }).fill(TEST_USER.password);
    await page.getByRole('button', { name: '登录' }).click();

    // 验证：跳转到时间轴
    await expect(page).toHaveURL(/\/timeline/);
  });

  test('错误密码应提示错误', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('textbox', { name: '邮箱' }).fill(TEST_USER.email);
    await page.getByRole('textbox', { name: '密码' }).fill('wrong_password');
    await page.getByRole('button', { name: '登录' }).click();

    // 验证：错误提示
    await expect(page.getByText(/邮箱或密码错误/)).toBeVisible({ timeout: 5000 });
  });

  test('已登录用户访问 /login 应重定向', async ({ page }) => {
    // 先登录
    await page.goto('/login');
    await page.getByRole('textbox', { name: '邮箱' }).fill(TEST_USER.email);
    await page.getByRole('textbox', { name: '密码' }).fill(TEST_USER.password);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/timeline/);

    // 再访问 /login
    await page.goto('/login');

    // 验证：应被重定向到 timeline
    await expect(page).toHaveURL(/\/timeline/);
  });
});

// ====================
// 3. 时间轴浏览
// ====================
test.describe('时间轴', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.getByRole('textbox', { name: '邮箱' }).fill(TEST_USER.email);
    await page.getByRole('textbox', { name: '密码' }).fill(TEST_USER.password);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/timeline/);
  });

  test('新用户应看到空状态', async ({ page }) => {
    await expect(page.getByText('还没有收藏')).toBeVisible();
    await expect(page.getByText('使用浏览器插件开始收藏')).toBeVisible();
  });

  test('筛选按钮应该可点击', async ({ page }) => {
    const filters = ['全部', '今天', '本周', '本月'];
    for (const filter of filters) {
      const btn = page.getByRole('button', { name: filter });
      await expect(btn).toBeVisible();
      await btn.click();
    }
  });

  test('导航栏应包含所有链接', async ({ page }) => {
    // 通知按钮
    await expect(page.getByRole('button', { name: '通知' })).toBeVisible();
    // 聚类链接
    await expect(page.getByRole('link', { name: '🧠' })).toBeVisible();
    // 设置链接
    await expect(page.getByRole('link', { name: '⚙️' })).toBeVisible();
  });
});

// ====================
// 4. AI 聚类页
// ====================
test.describe('AI 聚类页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: '邮箱' }).fill(TEST_USER.email);
    await page.getByRole('textbox', { name: '密码' }).fill(TEST_USER.password);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/timeline/);
  });

  test('聚类页应正常加载', async ({ page }) => {
    await page.goto('/clusters');
    await expect(page.getByRole('heading', { name: 'AI 主题整理' })).toBeVisible();
    // 返回链接
    await expect(page.getByRole('link', { name: '← 返回时间轴' })).toBeVisible();
  });
});

// ====================
// 5. 设置页
// ====================
test.describe('设置页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: '邮箱' }).fill(TEST_USER.email);
    await page.getByRole('textbox', { name: '密码' }).fill(TEST_USER.password);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/timeline/);
  });

  test('应显示正确的用户信息', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('text=账户设置');

    // 验证邮箱
    await expect(page.getByText(TEST_USER.email)).toBeVisible();
    // 验证显示名称
    await expect(page.getByRole('textbox').first()).toHaveValue(TEST_USER.name);
  });

  test('应包含所有功能区块', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('text=账户设置');

    await expect(page.getByRole('heading', { name: '基本信息' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '修改密码' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '数据导出' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '危险区域' })).toBeVisible();
    await expect(page.getByRole('button', { name: '退出登录' })).toBeVisible();
  });

  test('修改密码按钮应在未填写时禁用', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('text=账户设置');

    await expect(page.getByRole('button', { name: '修改密码' })).toBeDisabled();
  });

  test('永久删除按钮应在未输入 DELETE 时禁用', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('text=账户设置');

    await expect(page.getByRole('button', { name: '永久删除' })).toBeDisabled();
  });
});

// ====================
// 6. 通知功能
// ====================
test.describe('通知', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: '邮箱' }).fill(TEST_USER.email);
    await page.getByRole('textbox', { name: '密码' }).fill(TEST_USER.password);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/timeline/);
  });

  test('点击通知应显示下拉框', async ({ page }) => {
    await page.getByRole('button', { name: '通知' }).click();
    await expect(page.getByText('暂无新通知')).toBeVisible();
  });
});

// ====================
// 7. 退出登录
// ====================
test.describe('退出登录', () => {
  test('退出后应跳转到登录页', async ({ page }) => {
    // 先登录
    await page.goto('/login');
    await page.getByRole('textbox', { name: '邮箱' }).fill(TEST_USER.email);
    await page.getByRole('textbox', { name: '密码' }).fill(TEST_USER.password);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/timeline/);

    // 退出
    await page.goto('/settings');
    await page.waitForSelector('text=退出登录');
    await page.getByRole('button', { name: '退出登录' }).click();

    // 验证：跳转到登录页
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: '登录 Thoughtmark' })).toBeVisible();
  });
});
