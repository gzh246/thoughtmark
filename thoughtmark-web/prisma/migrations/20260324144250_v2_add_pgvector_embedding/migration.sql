-- Story 7.3: pgvector 扩展 + 正文 Embedding 向量存储
-- 通义千问 text-embedding-v3 输出 1024 维向量

-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 为 bookmarks 表添加向量列（1024 维）
ALTER TABLE bookmarks ADD COLUMN content_embedding vector(1024);

-- IVFFlat 索引（适用于 < 100k 行，余弦距离）
-- 注意：需要至少有数据后才能建索引，故使用 IF NOT EXISTS 或后续手动建
-- CREATE INDEX IF NOT EXISTS idx_bookmarks_embedding ON bookmarks
--   USING ivfflat (content_embedding vector_cosine_ops) WITH (lists = 100);
-- TODO(Story-9.1): 数据量达标后启用 IVFFlat 索引，初期先用暴力扫描