# syntax=docker/dockerfile:1.6
# ===========================================
# Next.js 生产环境 Dockerfile
# 适用于: 本地容器测试 / AWS ECS Fargate 部署
# ===========================================

# Stage 1: 依赖安装
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# Stage 2: 构建应用
FROM node:20-alpine AS builder
WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 构建时需要的 env（由 CI 注入）
ARG NEXT_PUBLIC_BASE_URL=""
ARG NEXT_PUBLIC_SITE_URL=""
ARG BETTER_AUTH_URL=""
ARG GITHUB_CLIENT_ID=""
ARG GITHUB_CLIENT_SECRET=""
ARG GOOGLE_CLIENT_ID=""
ARG GOOGLE_CLIENT_SECRET=""

ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV BETTER_AUTH_URL=${BETTER_AUTH_URL}
ENV GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
ENV GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
ENV GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
ENV GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}

# 构建应用（auth/db 初始化会在 build 阶段执行，需注入必要 secrets）
RUN --mount=type=secret,id=BETTER_AUTH_SECRET \
    --mount=type=secret,id=DATABASE_URL \
    sh -ec 'export BETTER_AUTH_SECRET="$(cat /run/secrets/BETTER_AUTH_SECRET)"; export DATABASE_URL="$(cat /run/secrets/DATABASE_URL)"; pnpm build'

# Stage 3: 生产运行
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 预创建运行时缓存目录，避免 Next.js 写入 .next/cache 时权限不足
RUN mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app/.next

# 使用非 root 用户运行
USER nextjs

# 暴露端口
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 启动应用
CMD ["node", "server.js"]
