/**
 * WXT 配置文件
 *
 * 配置 Manifest V3 权限和插件元数据。
 * - tabs: 读取当前标签页 URL 和标题（FR7 一键收藏）
 * - storage: Chrome Storage 离线缓存（FR11 离线暂存）
 *
 * @see https://wxt.dev/api/config.html
 */
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Thoughtmark',
    description: 'AI 驱动的书签知识管理工具 — 记录你为什么收藏',
    permissions: ['tabs', 'storage'],
  },
});
