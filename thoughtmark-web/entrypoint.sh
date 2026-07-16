#!/bin/sh
# Thoughtmark 生产环境入口脚本
# 同时启动 Next.js 服务 + BullMQ Worker 进程

echo "[Entrypoint] 启动 BullMQ Workers (Embedding + Summary)..."
npx tsx src/worker-entry.ts &
WORKER_PID=$!

echo "[Entrypoint] Worker PID: $WORKER_PID"
echo "[Entrypoint] 启动 Next.js 服务 (port 3000)..."
exec node server.js
