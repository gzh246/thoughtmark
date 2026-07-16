# Thoughtmark Web — 多阶段构建（DaoCloud 国内镜像源）
# 使用 Debian slim 而非 Alpine，避免 Prisma OpenSSL 兼容问题
# Stage 1: 依赖安装 + 构建
FROM docker.m.daocloud.io/library/node:20-slim AS builder
WORKDIR /app
# Prisma 需要 openssl
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: 生产运行
FROM docker.m.daocloud.io/library/node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
# Next.js standalone
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Prisma client + schema（运行时需要）
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
# V2: Worker 运行时依赖（完整 node_modules + 源文件）
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src/lib ./src/lib
COPY --from=builder /app/src/worker-entry.ts ./src/worker-entry.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/package.json ./package.json
# 入口脚本
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["./entrypoint.sh"]
