/**
 * Thoughtmark Service Worker (Background Script)
 *
 * Manifest V3 Service Worker — 无持久后台页，
 * 由浏览器按需唤醒。
 *
 * Story 3.3: 离线同步
 * - 启动时注册同步监听器
 * - 监听网络恢复事件，触发离线队列同步
 */
import { startSyncListener, syncOfflineQueue } from '@/lib/sync';
import { getQueueSize } from '@/lib/storage';

export default defineBackground(() => {
  console.log('[Background] Thoughtmark Service Worker 启动', {
    id: browser.runtime.id,
  });

  // 注册同步监听器（监听 popup 发来的 SYNC_OFFLINE_QUEUE 消息）
  startSyncListener();

  // 安装完成时尝试同步
  browser.runtime.onInstalled.addListener(async () => {
    const size = await getQueueSize();
    if (size > 0) {
      console.log(`[Background] 发现 ${size} 条离线书签，尝试同步...`);
      await syncOfflineQueue();
    }
  });

  // Service Worker 被唤醒时检查离线队列
  // 注意：MV3 Service Worker 会被频繁休眠/唤醒
  (async () => {
    const size = await getQueueSize();
    if (size > 0 && navigator.onLine) {
      console.log(`[Background] 检测到 ${size} 条待同步书签，自动同步...`);
      await syncOfflineQueue();
    }
  })();
});
