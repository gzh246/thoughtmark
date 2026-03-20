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
import { apiPost, isAuthenticated, saveAuthToken } from '@/lib/api';
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
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

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
      } else {
        const data = await res.json();
        setErrorMsg(data.error?.message || '保存失败');
        setStatus('error');
      }
    } catch {
      setErrorMsg('网络错误，请检查连接');
      setStatus('error');
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
