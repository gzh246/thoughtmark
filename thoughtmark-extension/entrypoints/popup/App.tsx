/**
 * Thoughtmark 插件弹窗 — 一键收藏表单
 *
 * Story 3.1: 核心收藏功能
 * - 自动获取当前 Tab 的 URL + 标题
 * - 注解文本框（可选，140 字限制）
 * - 快选标签（学习资料/工作参考/灵感收藏，可多选）
 * - "保存" 和 "跳过" 按钮
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

      // Story 3.5: 检查 onboarding 状态
      if (loggedIn) {
        const result = await browser.storage.local.get('onboardingCompleted') as Record<string, boolean | undefined>;
        if (!result.onboardingCompleted) {
          setShowOnboarding(true);
        }
      }
    })();
  }, []);

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

    try {
      const res = await apiPost('/bookmarks', {
        url,
        title,
        whySaved: skipAnnotation ? null : (whySaved || null),
        quickTags: skipAnnotation ? [] : selectedTags,
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
        <h2 className="popup-title">🔖 Thoughtmark</h2>
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
          <p>收藏成功！</p>
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
      <h2 className="popup-title">🔖 收藏到 Thoughtmark</h2>

      {/* URL + 标题（只读预览） */}
      <div className="page-info">
        <div className="page-title" title={title}>{title || '无标题'}</div>
        <div className="page-url" title={url}>{url}</div>
      </div>

      {/* 注解输入 */}
      <div className="annotation-section">
        <label className="label">
          这让我想到……
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
          placeholder="一句话记录你的想法（可选）"
          className="annotation-input"
          rows={3}
        />
      </div>

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
      </div>

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
