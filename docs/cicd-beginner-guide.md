# CI/CD 小白指南（0 基础版）

这份文档专门给“第一次接触运维/部署”的同学看。  
你只需要先理解一句话：

> 代码推到 `main` 分支后，GitHub 会自动打包成 Docker 镜像，上传到镜像仓库，再远程让 VPS 拉新镜像并重启应用。

---

## 一、现在的部署只靠 3 个文件

- `.github/workflows/deploy-prod.yml`：自动化流程总指挥（在 GitHub 上执行）
- `docker-compose.prod.yml`：服务器上“要启动哪些容器、怎么连起来”的清单
- `deploy.sh`：服务器上的部署执行器（按命令做初始化/发布/回滚）

可以把它理解成：

- `deploy-prod.yml` = 项目经理（安排步骤）
- `docker-compose.prod.yml` = 施工图纸（容器拓扑）
- `deploy.sh` = 施工队（真正干活）

---

## 二、按时间线看部署流程（先 init，再 deploy）

### 阶段 A：首发初始化（只做一次，手动）

这是“第一次上线前”的准备步骤，目标是把基础服务和证书初始化好。

1. SSH 登录 VPS，进入部署目录（通常是 `/opt/bunn-aws`）
2. 准备好 `.env.production`
3. 手动执行：
   - `./deploy.sh init --domain <your-domain> --image ghcr.io/<owner>/<repo>:latest`
4. `init` 会做这些事：
   - 启动 `postgres`、`redis`、`app`、`nginx`
   - 首次申请 HTTPS 证书（Let's Encrypt）
   - 尝试数据库迁移与健康检查

> 说明：`init` 是一次性开荒动作。只要环境不重建，后续不需要重复执行。

### 阶段 B：日常自动发布（持续，CI 自动）

当你 `git push origin main` 时，会自动触发以下流程：

1. GitHub Actions 被触发（读取 `deploy-prod.yml`）
2. CI 计算镜像 tag（比如 `sha-xxxx`）
3. CI 用 `Dockerfile` 构建镜像，并推送到 GHCR
4. CI 通过 SSH 连接 VPS
5. CI 把 `deploy.sh`、`docker-compose.prod.yml` 和 nginx 配置文件传到 VPS
6. CI 在 VPS 执行：
   - `./deploy.sh deploy --domain xxx --image ghcr.io/...:sha-xxxx`
7. `deploy.sh` 在 VPS 上执行：
   - `docker compose pull app`（拉新镜像）
   - `docker compose up -d app`（重建 app 容器）
   - 可选数据库迁移、健康检查
   - 写 `.release` 记录这次上线信息

---

## 三、三个文件各自负责什么

## 1) `.github/workflows/deploy-prod.yml`

这是“远程自动发布脚本”，运行在 GitHub 提供的机器上，不在你的 VPS 上运行。

它主要做 5 件事：

- 拉代码
- 构建并推送镜像到 GHCR
- 配置 SSH 私钥
- 把部署文件拷到 VPS
- SSH 执行 `deploy.sh deploy`

你平时主要关心：

- `secrets` 是否正确（`VPS_HOST`、`VPS_USER`、`VPS_SSH_KEY`）
- 发布失败卡在“构建镜像”还是“SSH 部署”

## 2) `docker-compose.prod.yml`

这是“生产容器编排清单”，告诉 Docker：

- 启动哪些服务：`postgres`、`redis`、`app`、`nginx`、`certbot`
- 各服务怎么连：都在同一个 `bunn-network`
- 持久化数据放哪：`postgres_data`、`redis_data`、`letsencrypt`
- 哪些端口对外开放：只有 nginx 开 `80/443`

核心思想：

- `app` 不直接暴露端口给公网
- 公网流量先到 `nginx`，再反向代理到 `app`

## 3) `deploy.sh`

这是 VPS 上的“运维入口命令”，支持三种模式：

- `init`：第一次部署（初始化证书、启动基础服务）
- `deploy`：日常发版（拉新镜像重启 app）
- `rollback`：回滚（本质也是部署某个旧镜像 tag）

常用命令：

```bash
# 一次性初始化（首次）
./deploy.sh init --domain bunn.ink --image ghcr.io/<owner>/bunn-aws:latest

# 日常发布（CI 会自动做）
./deploy.sh deploy --domain bunn.ink --image ghcr.io/<owner>/bunn-aws:sha-<commit>

# 回滚到历史镜像
./deploy.sh rollback --domain bunn.ink --image ghcr.io/<owner>/bunn-aws:<old-tag>
```

### 首次必须手动执行（请直接复制）

```bash
# 1) SSH 登录你的 VPS
ssh root@<your-vps-ip>

# 2) 进入部署目录（与 CI 保持一致）
cd /opt/bunn-aws

# 3) 确保 .env.production 已准备好（至少包含 POSTGRES_PASSWORD 等必填项）
ls -la .env.production

# 4) 首次初始化（只执行一次）
./deploy.sh init --domain <your-domain> --image ghcr.io/<owner>/<repo>:latest
```

执行完成后，后续就只需要正常 `push main`，CI 会自动执行 `deploy`。

---

## 四、你必须准备好的环境变量和密钥

GitHub Secrets（仓库设置里）：

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_PORT`（可选，不填默认 22）

GitHub Variables（可选）：

- `PROD_DOMAIN`（默认 `bunn.ink`）

VPS 本地文件：

- `/opt/bunn-aws/.env.production`

---

## 五、最常见故障怎么判断

## 1) 卡在 SSH / SCP

通常是：

- `VPS_SSH_KEY` 内容错误
- `VPS_USER` 不对
- 云防火墙没放行 22（或自定义端口）

## 2) 容器启动失败

通常是：

- `.env.production` 缺变量（如 `POSTGRES_PASSWORD`）
- 镜像 tag 不存在或拉取失败

排查命令（在 VPS）：

```bash
cd /opt/bunn-aws
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f app
```

## 3) 域名访问失败 / HTTPS 不通

通常是：

- DNS 未正确解析到 VPS
- 80/443 没放行
- 证书申请失败（可先看 HTTP 是否通，再看 certbot）

---

## 六、最小心智模型（记住这 3 句就够了）

1. CI 只负责“打包镜像 + 远程触发部署”
2. VPS 只负责“拉镜像 + 启服务”
3. 线上行为以 `deploy.sh` 为准，它是唯一执行入口

