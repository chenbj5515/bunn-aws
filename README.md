# Bunn AWS - Full Stack Next.js Application

一个使用最新技术栈构建的全栈应用模板。

## 技术栈

- **Next.js 16** - React 框架，使用 App Router 和 Turbopack
- **TailwindCSS 4** - CSS-first 配置，5x 更快的构建速度
- **next-intl 4** - 国际化支持（中文/英文）
- **Drizzle ORM** - 类型安全的 TypeScript ORM
- **Better Auth** - 现代化的身份认证解决方案
- **Neon PostgreSQL** - Serverless PostgreSQL 数据库

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env.local` 并填写必要的配置：

```bash
cp .env.example .env.local
```

必需的环境变量：

```env
# 数据库连接 (推荐使用 Neon: https://neon.tech)
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Better Auth 密钥 (使用 openssl rand -base64 32 生成)
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"

# 公共 URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. 初始化数据库

```bash
# 推送 schema 到数据库
pnpm db:push

# 或者生成并运行迁移
pnpm db:generate
pnpm db:migrate
```

### 4. 启动开发服务器

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
- PostgreSQL 支持（推荐 Neon）
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

## 部署

推荐部署到 Vercel：

1. 将代码推送到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量
4. 部署！

## License

MIT
