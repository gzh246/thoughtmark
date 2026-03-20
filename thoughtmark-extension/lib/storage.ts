/**
 * Chrome Storage 离线缓存工具
 *
 * 管理离线书签队列：网络断开时暂存书签数据到 Chrome Storage，
 * 网络恢复后由 sync.ts 自动同步到服务器。
 *
 * Story 3.3: 完整离线队列实现
 * - 最多存 100 条书签
 * - 超过 7 天自动清理
 * - 超出上限时丢弃最旧的
 */

// 离线队列存储键
const OFFLINE_QUEUE_KEY = 'thoughtmark_offline_queue';

/** 队列上限 */
const MAX_QUEUE_SIZE = 100;

/** 最大保留天数 */
const MAX_AGE_DAYS = 7;

/**
 * 离线书签类型定义
 *
 * 注意字段名与 API 的映射关系：
 * - annotation → whySaved（API 端）
 * - tags → quickTags（API 端）
 * sync.ts 上传时做映射
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
  try {
    const result = await browser.storage.local.get(OFFLINE_QUEUE_KEY) as Record<string, OfflineBookmark[] | undefined>;
    return result[OFFLINE_QUEUE_KEY] || [];
  } catch {
    return [];
  }
}

/**
 * 向离线队列添加书签
 *
 * 自动处理：
 * 1. 清除超过 7 天的过期项
 * 2. 如果已满 100 条，丢弃最旧的腾出空间
 */
export async function addToOfflineQueue(
  bookmark: OfflineBookmark
): Promise<void> {
  let queue = await getOfflineQueue();

  // 清除过期项
  queue = removeExpiredFromList(queue);

  // 队列已满时丢弃最旧的
  if (queue.length >= MAX_QUEUE_SIZE) {
    queue = queue.slice(queue.length - MAX_QUEUE_SIZE + 1);
  }

  queue.push(bookmark);
  await browser.storage.local.set({ [OFFLINE_QUEUE_KEY]: queue });
}

/**
 * 从队列中移除指定索引的书签（同步成功后逐条移除）
 */
export async function removeFromQueue(index: number): Promise<void> {
  const queue = await getOfflineQueue();
  if (index >= 0 && index < queue.length) {
    queue.splice(index, 1);
    await browser.storage.local.set({ [OFFLINE_QUEUE_KEY]: queue });
  }
}

/**
 * 清空离线队列
 */
export async function clearOfflineQueue(): Promise<void> {
  await browser.storage.local.remove(OFFLINE_QUEUE_KEY);
}

/**
 * 获取队列中待同步的条数
 */
export async function getQueueSize(): Promise<number> {
  const queue = await getOfflineQueue();
  return queue.length;
}

/**
 * 从列表中移除超过 7 天的过期项（纯函数，不操作 Storage）
 */
function removeExpiredFromList(queue: OfflineBookmark[]): OfflineBookmark[] {
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  return queue.filter((item) => new Date(item.savedAt).getTime() > cutoff);
}
