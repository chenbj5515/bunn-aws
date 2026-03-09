# Bunn AWS - Full Stack Next.js Application

一个使用最新技术栈构建的全栈应用模板。

## 技术栈

- **Next.js 16** - React 框架，使用 App Router 和 Turbopack
- **TailwindCSS 4** - CSS-first 配置，5x 更快的构建速度
- **next-intl 4** - 国际化支持（中文/英文）
- **Drizzle ORM** - 类型安全的 TypeScript ORM
- **Better Auth** - 现代化的身份认证解决方案
- **PostgreSQL 16** - 通过 Docker 自托管，开发/生产环境均使用容器管理

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动本地数据库（Docker）

```bash
# 启动 PostgreSQL 和 Redis
docker compose up -d postgres redis
```

默认连接信息：
- PostgreSQL：`postgresql://postgres:postgres@localhost:5432/bunn_db`
- Redis：`redis://localhost:6379`

### 3. 配置环境变量

复制 `.env.development` 到 `.env.local`：

```bash
cp .env.development .env.local
```

在 `.env.local` 中追加以下配置：

```env
# Better Auth 密钥 (使用 openssl rand -base64 32 生成)
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"

# 公共 URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. 初始化数据库

```bash
# 推送 schema 到数据库
pnpm db:push

# 或者生成并运行迁移
pnpm db:generate
pnpm db:migrate
```

### 5. 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 项目结构

```
src/
├── app/
│   ├── [locale]/           # 国际化路由
│   │   ├── layout.tsx      # 本地化布局
│   │   ├── page.tsx        # 首页
│   │   ├── sign-in/        # 登录页
│   │   ├── sign-up/        # 注册页
│   │   └── dashboard/      # 仪表盘（需登录）
│   └── api/
│       └── auth/[...all]/  # Better Auth API 路由
├── components/
│   ├── auth/               # 认证相关组件
│   └── language-switcher.tsx
├── i18n/
│   ├── routing.ts          # 路由配置
│   ├── request.ts          # 请求配置
│   └── navigation.ts       # 导航工具
├── lib/
│   ├── auth.ts             # Better Auth 服务端配置
│   ├── auth-client.ts      # Better Auth 客户端
│   └── db/
│       ├── index.ts        # Drizzle 客户端
│       └── schema.ts       # 数据库 Schema
└── middleware.ts           # next-intl 中间件
messages/
├── en.json                 # 英文翻译
└── zh.json                 # 中文翻译
drizzle.config.ts           # Drizzle 配置
```

## 可用脚本

```bash
pnpm dev          # 启动开发服务器 (Turbopack)
pnpm build        # 构建生产版本
pnpm start        # 启动生产服务器
pnpm lint         # 运行 ESLint

# 数据库命令
pnpm db:generate  # 生成迁移文件
pnpm db:migrate   # 运行迁移
pnpm db:push      # 推送 schema 到数据库（开发用）
pnpm db:studio    # 打开 Drizzle Studio

# 部署命令
./deploy.sh init --domain bunn.ink --image ghcr.io/<owner>/bunn-aws:latest
./deploy.sh deploy --domain bunn.ink --image ghcr.io/<owner>/bunn-aws:sha-<commit>
./deploy.sh rollback --domain bunn.ink --image ghcr.io/<owner>/bunn-aws:<old-tag>
```

## 功能特性

### 国际化 (i18n)

- 支持中文和英文
- URL 前缀路由 (`/en/...`, `/zh/...`)
- 自动语言检测和重定向
- 服务端和客户端组件都支持翻译

### 身份认证

- 邮箱/密码注册和登录
- 会话管理
- 服务端和客户端会话获取
- 可扩展社交登录（Google、GitHub）

### 数据库

- 类型安全的 Drizzle ORM
- PostgreSQL 16，通过 Docker 容器自托管
- 自动迁移生成
- Drizzle Studio 可视化管理

## 添加新语言

1. 在 `src/i18n/routing.ts` 中添加 locale：

```typescript
export const routing = defineRouting({
  locales: ["en", "zh", "ja"], // 添加新语言
  defaultLocale: "en",
});
```

2. 创建 `messages/ja.json` 翻译文件

3. 更新 `src/middleware.ts` 中的 matcher：

```typescript
matcher: ["/(en|zh|ja)/:path*", ...]
```

## 生产部署（VPS + GHCR）

当前生产部署采用 CI/CD：

- 自动发布：`push main` 后由 GitHub Actions 构建镜像并部署到 VPS
- 注意：首次上线前需在 VPS 手动执行一次 `init`（见下方命令）
- VPS 仅负责 `pull + restart`，不在服务器上执行 Next.js 构建

### 一次性初始化（VPS）

```bash
cd /opt/bunn-aws
./deploy.sh init --domain bunn.ink --image ghcr.io/<owner>/bunn-aws:latest
```

说明：
- 这一步是“首发初始化”，需要人工执行一次
- 后续日常发布由 CI 自动执行 `deploy`，不需要再手动 `init`

初始化会完成：
- UFW 放行 22/80/443（幂等）
- 启动 postgres/redis/nginx/app
- 申请并加载 Let's Encrypt 证书（`bunn.ink` + `www.bunn.ink`）

### 日常发布

```bash
./deploy.sh deploy --domain bunn.ink --image ghcr.io/<owner>/bunn-aws:sha-<commit>
```

发布流程：
- `docker compose pull app`
- `docker compose up -d app`
- 健康检查通过后写入 `.release`（记录当前镜像）

### 回滚

```bash
./deploy.sh rollback --domain bunn.ink --image ghcr.io/<owner>/bunn-aws:<old-tag>
```

### GitHub Actions 所需 Secrets

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_PORT`（可选，默认 22）

### GitHub Actions 可选变量

- `PROD_DOMAIN`（默认 `bunn.ink`）

## License

MIT
