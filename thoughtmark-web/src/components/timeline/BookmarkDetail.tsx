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
    <div className="fixed inset-y-0 right-0 z-20 w-full max-w-md border-l border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900 overflow-y-auto">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          书签详情
        </h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
        >
          ✕
        </button>
      </div>

      <div className="space-y-5 px-5 py-5">
        {/* 标题 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">标题</label>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {bookmark.title}
          </p>
        </div>

        {/* URL */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">链接</label>
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-sm text-indigo-600 hover:underline dark:text-indigo-400"
          >
            {extractDomain(bookmark.url)}
            <span className="ml-1 text-zinc-400">↗</span>
          </a>
        </div>

        {/* 注解（可编辑）*/}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-400">注解</label>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-indigo-500 hover:text-indigo-600"
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
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="为什么收藏这个？"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setWhySaved(bookmark.whySaved || "");
                  }}
                  className="rounded px-3 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {bookmark.whySaved || "暂无注解"}
            </p>
          )}
        </div>

        {/* 标签（Story 4.4: 可编辑）*/}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">标签</label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-0.5 text-indigo-400 hover:text-red-500 transition-colors"
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
            className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        {/* 收藏时间 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">收藏时间</label>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {timeAgo(bookmark.createdAt)}
            <span className="ml-2 text-xs text-zinc-400">
              ({new Date(bookmark.createdAt).toLocaleString("zh-CN")})
            </span>
          </p>
        </div>

        {/* 删除 */}
        <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-red-500">确认删除？</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "删除中..." : "确认"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-zinc-500 hover:text-zinc-700"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-red-500 hover:text-red-600"
            >
              🗑️ 删除书签
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
