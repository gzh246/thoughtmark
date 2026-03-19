/**
 * Chrome Storage 离线缓存工具
 *
 * 管理离线书签队列：网络断开时暂存书签数据到 Chrome Storage，
 * 网络恢复后由 sync.ts 自动同步到服务器。
 *
 * TODO(Story-3.3): 实现完整的离线队列逻辑（最多 7 天 / 100 条）
 */

// 离线队列存储键
const OFFLINE_QUEUE_KEY = 'thoughtmark_offline_queue';

/**
 * 离线书签类型定义
 */
export interface OfflineBookmark {
  url: string;
  title: string;
  annotation?: string;
  tags?: string[];
  savedAt: string; // ISO 8601
}

/**
 * 获取离线队列中的所有书签
 */
export async function getOfflineQueue(): Promise<OfflineBookmark[]> {
  // TODO(Story-3.3): 实现 Chrome Storage 读取
  return [];
}

/**
 * 向离线队列添加书签
 */
export async function addToOfflineQueue(
  bookmark: OfflineBookmark
): Promise<void> {
  // TODO(Story-3.3): 实现 Chrome Storage 写入
}

/**
 * 清空离线队列
 */
export async function clearOfflineQueue(): Promise<void> {
  // TODO(Story-3.3): 实现 Chrome Storage 清空
}
