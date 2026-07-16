/**
 * Content Script — 网页正文提取
 *
 * Story 7.1: 注入到所有网页，监听来自 popup 的提取请求。
 * 使用 @mozilla/readability 提取正文内容。
 *
 * 消息协议:
 * - 请求: { type: 'EXTRACT_CONTENT' }
 * - 响应: { success: true, data: ExtractedContent } | { success: false }
 */
import { extractPageContent } from '@/lib/readability';

/** Content Script 消息类型 */
interface ExtractMessage {
  type: 'EXTRACT_CONTENT';
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main() {
    // 监听来自 popup 的消息
    browser.runtime.onMessage.addListener(
      (message: unknown, _sender, sendResponse) => {
        const msg = message as ExtractMessage;
        if (msg?.type === 'EXTRACT_CONTENT') {
          const result = extractPageContent();

          if (result) {
            sendResponse({ success: true, data: result });
          } else {
            sendResponse({ success: false });
          }
        }
        return true;
      }
    );
  },
});
