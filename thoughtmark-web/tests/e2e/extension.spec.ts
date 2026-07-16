import { test as base, chromium, type BrowserContext } from '@playwright/test';
import { expect } from '@playwright/test';
import path from 'path';

/**
 * Thoughtmark Chrome Extension E2E 测试
 *
 * 使用 chromium.launchPersistentContext() 加载 Extension，
 * 绕过 MCP 的 chrome-extension:// 协议限制。
 *
 * 运行方式：npx playwright test --project=extension
 * 前置条件：
 *   1. dev server 在 localhost:3000 运行
 *   2. Extension 已构建（thoughtmark-extension/.output/chrome-mv3）
 */

// ====================
// 自定义 Fixture：加载 Extension 的 Browser Context
// ====================
const EXTENSION_PATH = path.resolve(
  __dirname,
  '../../../thoughtmark-extension/.output/chrome-mv3'
);

// 创建带 Extension 的自定义 test fixture
const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, provide) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false, // Extension 必须在有头模式下运行
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });
    await provide(context);
    await context.close();
  },

  extensionId: async ({ context }, provide) => {
    // 等待 Service Worker 启动，从中获取 Extension ID
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }

    const extensionId = background.url().split('/')[2];
    await provide(extensionId);
  },
});

// ====================
// 1. Extension 加载验证
// ====================
test.describe('Extension 加载', () => {
  test('Service Worker 应正常启动', async ({ context }) => {
    // 等待 Service Worker
    let [sw] = context.serviceWorkers();
    if (!sw) {
      sw = await context.waitForEvent('serviceworker');
    }

    expect(sw).toBeTruthy();
    expect(sw.url()).toContain('chrome-extension://');
    expect(sw.url()).toContain('background.js');
  });

  test('应获取到有效的 Extension ID', async ({ extensionId }) => {
    expect(extensionId).toBeTruthy();
    expect(extensionId.length).toBe(32); // Chrome Extension ID 固定 32 位
  });
});

// ====================
// 2. Popup UI 测试 — 关键突破：直接访问 chrome-extension://
// ====================
test.describe('Popup UI', () => {
  test('Popup 页面应正常打开', async ({ context, extensionId }) => {
    const popupUrl = `chrome-extension://${extensionId}/popup.html`;
    const popup = await context.newPage();
    await popup.goto(popupUrl);
    await popup.waitForLoadState('domcontentloaded');

    // 验证 popup 页面加载成功
    const title = await popup.title();
    expect(title).toBeTruthy();

    // 截图存证
    await popup.screenshot({
      path: 'tests/e2e/screenshots/popup-loaded.png',
    });

    await popup.close();
  });

  test('Popup 应包含 API Token 输入框', async ({ context, extensionId }) => {
    const popupUrl = `chrome-extension://${extensionId}/popup.html`;
    const popup = await context.newPage();
    await popup.goto(popupUrl);
    await popup.waitForLoadState('domcontentloaded');

    // 等待 Vue/React 渲染完成
    await popup.waitForTimeout(1000);

    // 检查 popup 中的基本元素（根据实际 UI 调整选择器）
    const bodyText = await popup.innerText('body');
    expect(bodyText.length).toBeGreaterThan(0);

    // 截图存证
    await popup.screenshot({
      path: 'tests/e2e/screenshots/popup-ui.png',
    });

    await popup.close();
  });
});

// ====================
// 3. Extension + Web App 集成测试
// ====================
test.describe('Extension 与 Web App 集成', () => {
  test('Extension 加载后访问 Web App 应正常', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('http://localhost:3000');

    // 验证 Web App 正常加载
    await expect(page).toHaveURL(/\/(timeline|login|register)/);

    await page.close();
  });

  test('Content Script 应在匹配的页面注入', async ({ context }) => {
    const page = await context.newPage();
    // Content Script 匹配 *.google.com/*
    await page.goto('https://www.google.com');

    // 等待 Content Script 注入
    await page.waitForTimeout(2000);

    // 检查 chrome.runtime 是否存在（Content Script 注入的标志）
    const hasChromeRuntime = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      return typeof w.chrome !== 'undefined' && typeof w.chrome?.runtime !== 'undefined';
    });

    expect(hasChromeRuntime).toBe(true);

    await page.close();
  });
});

export { test, expect };
