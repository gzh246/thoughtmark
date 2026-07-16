/**
 * Thoughtmark 插件弹窗 — 一键收藏表单
 *
 * Story 3.1: 核心收藏功能
 * Story 7.1: 网页正文提取
 * Story 8.2: AI 注解建议（异步加载，一键采纳）
 * Story 8.3: AI 标签推荐（异步加载，一键确认）
 * Story 8.4: 重复内容检测（保存前弹窗提醒）
 */
import { useState, useEffect } from 'react';
import { apiPost, apiPut, isAuthenticated, saveAuthToken } from '@/lib/api';
import { addToOfflineQueue, getQueueSize } from '@/lib/storage';
import type { OfflineBookmark } from '@/lib/storage';
import Onboarding from './Onboarding';
import './App.css';

/** 快选标签选项 */
const QUICK_TAG_OPTIONS = ['学习资料', '工作参考', '灵感收藏'] as const;

/** 注解最大长度 */
const MAX_WHY_SAVED_LENGTH = 140;

function App() {
  // ── 状态 ──────────────────────────────────
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [whySaved, setWhySaved] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'offline' | 'duplicate'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [offlineCount, setOfflineCount] = useState(0);
  // Story 3.4: 去重冲突数据
  const [conflictData, setConflictData] = useState<{ id: string; createdAt: string } | null>(null);
  // Story 3.5: Onboarding 引导状态
  const [showOnboarding, setShowOnboarding] = useState(false);
  // S1: 主题切换（方向 A Dark / 方向 B Light）
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  // Story 7.1: 网页正文提取
  const [pageContent, setPageContent] = useState<string | null>(null);
  // Story 8.2+8.3: AI 建议
  const [aiAnnotations, setAiAnnotations] = useState<string[]>([]);
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  // Story 8.4: 重复检测
  const [duplicateWarning, setDuplicateWarning] = useState<{ message: string; similar: { title: string }[] } | null>(null);

  // ── 初始化：获取当前 Tab + 检查登录 ──────────
  useEffect(() => {
    (async () => {
      // 获取当前活动 Tab
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        setUrl(tab.url || '');
        setTitle(tab.title || '');
      }

      // 检查登录状态
      const loggedIn = await isAuthenticated();
      setIsLoggedIn(loggedIn);

      // S1: 读取主题偏好
      const themeResult = await browser.storage.local.get('theme') as Record<string, string | undefined>;
      const savedTheme = (themeResult.theme === 'light' ? 'light' : 'dark') as 'dark' | 'light';
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);

      // Story 3.5: 检查 onboarding 状态
      if (loggedIn) {
        const result = await browser.storage.local.get('onboardingCompleted') as Record<string, boolean | undefined>;
        if (!result.onboardingCompleted) {
          setShowOnboarding(true);
        }
      }

      // Story 7.1: 通过 content script 提取网页正文
      if (tab?.id) {
        try {
          const response = await browser.tabs.sendMessage(tab.id, { type: 'EXTRACT_CONTENT' }) as
            { success: boolean; data?: { textContent: string } } | undefined;
          if (response?.success && response.data?.textContent) {
            setPageContent(response.data.textContent);
          }
          // Story 8.2+8.3: 异步加载 AI 建议（不阻塞收藏流程）
          if (response?.success && response.data?.textContent) {
            setAiLoading(true);
            apiPost('/ai/suggestions', {
              pageContent: response.data.textContent.slice(0, 3000),
              title: tab.title || '',
            }).then(async (aiRes) => {
              if (aiRes.ok) {
                const aiJson = await aiRes.json();
                setAiAnnotations(aiJson.data?.annotations || []);
                setAiTags(aiJson.data?.tags || []);
              }
            }).catch(() => {}).finally(() => setAiLoading(false));
          }
        } catch {
          // 提取失败不阻塞收藏流程（AC2）
          console.warn('[Thoughtmark] 正文提取失败，继续收藏');
        }
      }
    })();
  }, []);

  // ── S1: 切换主题 ──────────────────────────
  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    await browser.storage.local.set({ theme: newTheme });
  };

  // ── 切换快选标签 ──────────────────────────
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  // ── 保存书签 ──────────────────────────────
  const handleSave = async (skipAnnotation = false) => {
    setLoading(true);
    setStatus('idle');
    setErrorMsg('');
    setDuplicateWarning(null);

    // Story 8.4: 保存前重复检测
    try {
      const dupRes = await apiPost('/bookmarks/check-duplicate', {
        url,
        pageContent: pageContent?.slice(0, 3000) || undefined,
      });
      if (dupRes.ok) {
        const dupJson = await dupRes.json();
        if (dupJson.data?.isDuplicate && dupJson.data.type === 'content_similar') {
          setDuplicateWarning({
            message: dupJson.data.message,
            similar: dupJson.data.similar || [],
          });
          setLoading(false);
          return; // 用户需要确认后再保存
        }
      }
    } catch {
      // 检测失败不阻塞保存
    }

    await doSave(skipAnnotation);
  };

  /** 实际执行保存 */
  const doSave = async (skipAnnotation = false) => {
    setLoading(true);

    try {
      const res = await apiPost('/bookmarks', {
        url,
        title,
        whySaved: skipAnnotation ? null : (whySaved || null),
        quickTags: skipAnnotation ? [] : selectedTags,
        // Story 7.1: 附带正文内容（可为 null）
        pageContent: pageContent || null,
      });

      if (res.ok) {
        setStatus('success');
        // 1 秒后关闭弹窗
        setTimeout(() => window.close(), 1000);
      } else if (res.status === 409) {
        // Story 3.4: URL 去重冲突
        const data = await res.json();
        const existing = data.data?.existingBookmark;
        if (existing) {
          setConflictData({ id: existing.id, createdAt: existing.createdAt });
          setStatus('duplicate');
        } else {
          setErrorMsg(data.error?.message || '已收藏过');
          setStatus('error');
        }
      } else {
        const data = await res.json();
        setErrorMsg(data.error?.message || '保存失败');
        setStatus('error');
      }
    } catch {
      // 网络错误 → 走离线保存路径（Story 3.3）
      try {
        const offlineBookmark: OfflineBookmark = {
          url,
          title,
          annotation: skipAnnotation ? undefined : (whySaved || undefined),
          tags: skipAnnotation ? [] : selectedTags,
          savedAt: new Date().toISOString(),
        };
        await addToOfflineQueue(offlineBookmark);
        const count = await getQueueSize();
        setOfflineCount(count);
        setStatus('offline');
        // 2 秒后关闭弹窗
        setTimeout(() => window.close(), 2000);
      } catch {
        setErrorMsg('保存失败，请稍后重试');
        setStatus('error');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Token 登录 ──────────────────────────
  const handleTokenLogin = async () => {
    if (!tokenInput.trim()) return;
    await saveAuthToken(tokenInput.trim());
    setIsLoggedIn(true);
  };

  // ── 覆盖更新（Story 3.4: URL 去重冲突时） ────────
  const handleOverwrite = async () => {
    if (!conflictData) return;
    setLoading(true);
    try {
      const res = await apiPut(`/bookmarks/${conflictData.id}`, {
        title,
        whySaved: whySaved || null,
        quickTags: selectedTags,
      });
      if (res.ok) {
        setStatus('success');
        setTimeout(() => window.close(), 1000);
      } else {
        const data = await res.json();
        setErrorMsg(data.error?.message || '更新失败');
        setStatus('error');
      }
    } catch {
      setErrorMsg('网络错误');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // ── 未登录：显示 Token 输入界面 ──────────
  if (!isLoggedIn) {
    return (
      <div className="popup-container">
        <div className="popup-header">
          <h2 className="popup-title" style={{ marginBottom: 0, textAlign: 'left', flex: 1 }}>🔖 Thoughtmark</h2>
          <button className="theme-toggle" onClick={toggleTheme} title="切换主题">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
        <p className="popup-subtitle">请先登录</p>
        <div className="token-section">
          <p className="token-hint">
            在 Web App 获取你的 API Token，粘贴到下方：
          </p>
          <input
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="粘贴 Token..."
            className="token-input"
          />
          <button
            onClick={handleTokenLogin}
            className="btn btn-primary"
            disabled={!tokenInput.trim()}
          >
            连接
          </button>
        </div>
      </div>
    );
  }

  // ── 新用户引导（Story 3.5）────────────────
  if (showOnboarding) {
    return (
      <div className="popup-container">
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      </div>
    );
  }

  // ── 保存成功 ──────────────────────────────
  if (status === 'success') {
    return (
      <div className="popup-container">
        <div className="success-message">
          <span className="success-icon">✅</span>
          <p className="success-text">已保存到时间轴</p>
        </div>
      </div>
    );
  }

  // ── 离线暂存成功（Story 3.3）────────────────
  if (status === 'offline') {
    return (
      <div className="popup-container">
        <div className="offline-message">
          <span className="success-icon">📦</span>
          <p>已暂存，待网络恢复后同步</p>
          <p className="offline-count">队列中共 {offlineCount} 条待同步</p>
        </div>
      </div>
    );
  }

  // ── URL 去重冲突（Story 3.4）────────────────
  if (status === 'duplicate' && conflictData) {
    const hoursAgo = Math.round(
      (Date.now() - new Date(conflictData.createdAt).getTime()) / (1000 * 60 * 60)
    );
    return (
      <div className="popup-container">
        <div className="conflict-message">
          <span className="success-icon">⚠️</span>
          <p>你在 {hoursAgo > 0 ? `${hoursAgo} 小时` : '刚刚'} 前已收藏过这个页面</p>
          <div className="conflict-actions">
            <button
              className="btn btn-primary"
              onClick={handleOverwrite}
              disabled={loading}
            >
              {loading ? '更新中...' : '覆盖更新'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => window.close()}
            >
              取消
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 主界面：收藏表单 ──────────────────────
  return (
    <div className="popup-container">
      {/* S1: 头部 + 主题切换 */}
      <div className="popup-header">
        <h2 className="popup-title" style={{ marginBottom: 0, textAlign: 'left', flex: 1 }}>🔖 收藏到 Thoughtmark</h2>
        <button className="theme-toggle" onClick={toggleTheme} title="切换主题">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      {/* URL + 标题（只读预览） */}
      <div className="page-info">
        <div className="page-title" title={title}>{title || '无标题'}</div>
        <div className="page-url" title={url}>{url}</div>
      </div>

      {/* 注解输入 */}
      <div className="annotation-section">
        <label className="label">
          为什么收藏？
          <span className={`char-count${whySaved.length >= 120 && whySaved.length < MAX_WHY_SAVED_LENGTH ? ' char-warning' : ''}${whySaved.length >= MAX_WHY_SAVED_LENGTH ? ' char-limit' : ''}`}>
            {whySaved.length}/{MAX_WHY_SAVED_LENGTH}
          </span>
        </label>
        <textarea
          value={whySaved}
          onChange={(e) => {
            if (e.target.value.length <= MAX_WHY_SAVED_LENGTH) {
              setWhySaved(e.target.value);
            }
          }}
          placeholder="为什么要看这个？"
          className="annotation-input"
          rows={3}
        />
      </div>

      {/* Story 8.2: AI 注解建议 */}
      {aiAnnotations.length > 0 && (
        <div className="ai-suggestions">
          <div className="label" style={{ marginBottom: '4px' }}>🤖 AI 建议</div>
          <div className="tags-section">
            {aiAnnotations.map((a, i) => (
              <button
                key={i}
                className="tag-btn"
                onClick={() => setWhySaved(a)}
                title="点击采纳"
              >
                💡 {a}
              </button>
            ))}
          </div>
        </div>
      )}
      {aiLoading && (
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          🤖 AI 建议加载中...
        </div>
      )}

      {/* 快选标签 */}
      <div className="tags-section">
        {QUICK_TAG_OPTIONS.map((tag) => (
          <button
            key={tag}
            className={`tag-btn ${selectedTags.includes(tag) ? 'tag-selected' : ''}`}
            onClick={() => toggleTag(tag)}
          >
            {selectedTags.includes(tag) ? `✓ ${tag}` : tag}
          </button>
        ))}
        {/* Story 8.3: AI 推荐标签 */}
        {aiTags.filter(t => !QUICK_TAG_OPTIONS.includes(t as typeof QUICK_TAG_OPTIONS[number])).map((tag) => (
          <button
            key={tag}
            className={`tag-btn ${selectedTags.includes(tag) ? 'tag-selected' : ''}`}
            onClick={() => toggleTag(tag)}
            style={{ borderStyle: 'dashed' }}
          >
            {selectedTags.includes(tag) ? `✓ ${tag}` : `🤖 ${tag}`}
          </button>
        ))}
      </div>

      {/* Story 8.4: 重复检测警告 */}
      {duplicateWarning && (
        <div className="conflict-message" style={{ marginBottom: '8px' }}>
          <p style={{ fontSize: '12px', marginBottom: '4px' }}>⚠️ {duplicateWarning.message}</p>
          {duplicateWarning.similar.map((s, i) => (
            <p key={i} style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>· {s.title}</p>
          ))}
          <div className="conflict-actions" style={{ marginTop: '6px' }}>
            <button className="btn btn-primary" onClick={() => { setDuplicateWarning(null); doSave(false); }}>
              仍然收藏
            </button>
            <button className="btn btn-secondary" onClick={() => setDuplicateWarning(null)}>
              取消
            </button>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {status === 'error' && (
        <div className="error-message">{errorMsg}</div>
      )}

      {/* 操作按钮 */}
      <div className="actions">
        <button
          className="btn btn-secondary"
          onClick={() => handleSave(true)}
          disabled={loading}
        >
          跳过
        </button>
        <button
          className="btn btn-primary"
          onClick={() => handleSave(false)}
          disabled={loading}
        >
          {loading ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
}

export default App;
