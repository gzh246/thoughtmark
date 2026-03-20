/**
 * 离线队列同步逻辑
 *
 * 监听网络状态变化，在网络恢复时自动将离线队列中的书签
 * 批量同步到 thoughtmark-web 服务器。
 *
 * Story 3.3: 完整同步实现
 * - Service Worker 检测网络重连
 * - 逐条上传离线队列
 * - 成功后清空本地队列
 * - 字段映射：annotation → whySaved, tags → quickTags
 */
import { getOfflineQueue, removeFromQueue } from './storage';
import { apiPost } from './api';

/**
 * 同步离线队列到服务器
 *
 * 从头部开始逐条上传，每条成功后立即从队列中移除（索引 0）。
 * 如果某条失败，停止同步并保留剩余项。
 * 修复：之前全部成功才 clearOfflineQueue，部分成功时会重复上传。
 *
 * @returns 成功同步的书签数量
 */
export async function syncOfflineQueue(): Promise<number> {
  const queue = await getOfflineQueue();
  if (queue.length === 0) return 0;

  let successCount = 0;

  for (const bookmark of queue) {
    try {
      // 字段映射：OfflineBookmark → API 字段
      const res = await apiPost('/bookmarks', {
        url: bookmark.url,
        title: bookmark.title,
        whySaved: bookmark.annotation || null,
        quickTags: bookmark.tags || [],
      });

      if (!res.ok) {
        // API 返回非 2xx，停止同步保留剩余
        console.warn('[Sync] API 返回错误，停止同步', res.status);
        break;
      }

      // 立即移除已成功的条目（始终移除索引 0，因为上一条已被移除）
      await removeFromQueue(0);
      successCount++;
    } catch {
      // 网络错误，停止同步保留剩余
      console.warn('[Sync] 网络错误，停止同步');
      break;
    }
  }

  return successCount;
}

/**
 * 启动同步监听器
 * 在 background.ts （Service Worker）中调用
 *
 * 监听 WXT 的 runtime message 和网络状态恢复事件
 */
export function startSyncListener(): void {
  // 监听 Service Worker 内的在线状态恢复
  // 注意：Manifest V3 Service Worker 中 addEventListener('online') 可能不可靠
  // 使用 chrome.runtime.onMessage 作为主要触发方式
  browser.runtime.onMessage.addListener(async (message: unknown) => {
    if (message && (message as { type?: string }).type === 'SYNC_OFFLINE_QUEUE') {
      const count = await syncOfflineQueue();
      console.log(`[Sync] 同步完成，上传 ${count} 条书签`);
    }
  });

  console.log('[Sync] 同步监听器已启动');
}
