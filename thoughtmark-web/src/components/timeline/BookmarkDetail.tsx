"use client";

/**
 * 书签详情侧边栏（Story 4.3 + 4.4）
 *
 * 功能：
 * - 完整信息展示：URL、标题、注解、标签、收藏时间
 * - 编辑注解（inline）
 * - 手动标签管理（回车添加 + × 删除）
 * - 删除书签（确认对话框）
 */
import { useState } from "react";
import type { Bookmark } from "@/lib/types";
import { timeAgo, extractDomain } from "@/lib/utils";

interface BookmarkDetailProps {
  bookmark: Bookmark;
  onClose: () => void;
  onUpdated: (updated: Bookmark) => void;
  onDeleted: (id: string) => void;
}

export default function BookmarkDetail({
  bookmark,
  onClose,
  onUpdated,
  onDeleted,
}: BookmarkDetailProps) {
  const [editing, setEditing] = useState(false);
  const [whySaved, setWhySaved] = useState(bookmark.whySaved || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Story 4.4: 手动标签管理
  const [tags, setTags] = useState<string[]>(bookmark.quickTags);
  const [tagInput, setTagInput] = useState("");
  // Story 12.1: 分享
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // ── 保存编辑 ──────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/bookmarks/${bookmark.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whySaved: whySaved || null }),
      });
      if (res.ok) {
        const json = await res.json();
        onUpdated(json.data);
        setEditing(false);
      }
    } catch {
      // 静默失败
    } finally {
      setSaving(false);
    }
  };

  // ── 删除书签 ──────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/bookmarks/${bookmark.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDeleted(bookmark.id);
      }
    } catch {
      // 静默失败
    } finally {
      setDeleting(false);
    }
  };

  // ── Story 4.4: 添加标签 ────────────────────
  const updateTags = async (newTags: string[]) => {
    setTags(newTags);
    try {
      const res = await fetch(`/api/bookmarks/${bookmark.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quickTags: newTags }),
      });
      if (res.ok) {
        const json = await res.json();
        onUpdated(json.data);
      }
    } catch {
      // 回滚
      setTags(bookmark.quickTags);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (!tag || tags.includes(tag)) {
      setTagInput("");
      return;
    }
    updateTags([...tags, tag]);
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    updateTags(tags.filter((t) => t !== tag));
  };

  return (
    <div className="fixed inset-y-0 right-0 z-20 w-full max-w-md border-l border-tm bg-tm2 shadow-xl overflow-y-auto">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-tm px-5 py-4">
        <h2 className="text-sm font-semibold text-tm">
          书签详情
        </h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-tm-muted hover:bg-tm-hover hover:text-tm2"
        >
          ✕
        </button>
      </div>

      <div className="space-y-5 px-5 py-5">
        {/* 标题 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-tm-muted">标题</label>
          <p className="text-sm font-medium text-tm">
            {bookmark.title}
          </p>
        </div>

        {/* URL */}
        <div>
          <label className="mb-1 block text-xs font-medium text-tm-muted">链接</label>
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-sm text-tm-accent hover:underline"
          >
            {extractDomain(bookmark.url)}
            <span className="ml-1 text-tm-muted">↗</span>
          </a>
        </div>

        {/* 注解（可编辑）*/}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-tm-muted">注解</label>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-tm-accent hover:text-tm-accent-h"
              >
                编辑
              </button>
            )}
          </div>
          {editing ? (
            <div>
              <textarea
                value={whySaved}
                onChange={(e) => setWhySaved(e.target.value)}
                maxLength={140}
                rows={3}
                className="w-full rounded-lg border border-tm bg-tm-card px-3 py-2 text-sm text-tm outline-none focus:border-tm-accent"
                placeholder="为什么收藏这个？"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setWhySaved(bookmark.whySaved || "");
                  }}
                  className="rounded px-3 py-1 text-xs text-tm2 hover:bg-tm-hover"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-accent rounded px-3 py-1 text-xs"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-tm2">
              {bookmark.whySaved || "暂无注解"}
            </p>
          )}
        </div>

        {/* Story 7.4: AI 正文摘要 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-tm-muted">
            AI 摘要
          </label>
          {bookmark.contentSummary ? (
            <p className="text-sm text-tm2 leading-relaxed">
              {bookmark.contentSummary}
            </p>
          ) : bookmark.pageContent ? (
            <p className="text-xs text-tm-muted italic">
              ⏳ AI 正在生成摘要...
            </p>
          ) : (
            <p className="text-xs text-tm-muted italic">
              📄 未提取到正文
            </p>
          )}
        </div>

        {/* 标签（Story 4.4: 可编辑）*/}
        <div>
          <label className="mb-1 block text-xs font-medium text-tm-muted">标签</label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-tm-accent-sub px-2.5 py-0.5 text-xs font-medium text-tm-accent"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-0.5 text-tm-accent-60 hover:text-tm-error transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
            placeholder="输入标签名，按回车添加"
            className="mt-2 w-full rounded-lg border border-tm bg-tm-card px-3 py-1.5 text-xs text-tm outline-none focus:border-tm-accent"
          />
        </div>

        {/* 收藏时间 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-tm-muted">收藏时间</label>
          <p className="text-sm text-tm2">
            {timeAgo(bookmark.createdAt)}
            <span className="ml-2 text-xs text-tm-muted">
              ({new Date(bookmark.createdAt).toLocaleString("zh-CN")})
            </span>
          </p>
        </div>

        {/* Story 12.1: 分享按钮 */}
        <div className="border-t border-tm pt-4">
          {shareUrl ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 rounded-lg border border-tm bg-tm-card px-2 py-1 text-xs text-tm"
              />
              <button
                onClick={() => { navigator.clipboard.writeText(shareUrl); }}
                className="rounded-lg bg-tm-accent-sub px-2.5 py-1 text-xs text-tm-accent hover:opacity-80"
              >
                📋 复制
              </button>
            </div>
          ) : (
            <button
              onClick={async () => {
                setSharing(true);
                try {
                  const res = await fetch(`/api/bookmarks/${bookmark.id}/share`, { method: "POST" });
                  const json = await res.json();
                  if (json.data?.shareUrl) setShareUrl(json.data.shareUrl);
                } catch { /* ignore */ }
                setSharing(false);
              }}
              disabled={sharing}
              className="text-xs text-tm-accent hover:brightness-110 disabled:opacity-50"
            >
              {sharing ? "生成中..." : "🔗 生成分享链接"}
            </button>
          )}
        </div>

        {/* 删除 */}
        <div className="border-t border-tm pt-4">
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-tm-error">确认删除？</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded bg-tm-error px-3 py-1 text-xs text-white hover:brightness-110 disabled:opacity-50"
              >
                {deleting ? "删除中..." : "确认"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-tm2 hover:text-tm"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-tm-error hover:brightness-110"
            >
              🗑️ 删除书签
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
