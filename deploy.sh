#!/bin/bash

# ===========================================
# Bunn AWS VPS 一键部署脚本（Cloudflare 模式）
# 使用方法: ./deploy.sh yourdomain.com
# SSL 由 Cloudflare 提供，无需 Let's Encrypt
# ===========================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查参数
if [ -z "$1" ]; then
    log_error "请提供域名参数"
    echo "使用方法: ./deploy.sh yourdomain.com"
    exit 1
fi

DOMAIN=$1

log_info "开始部署 Bunn AWS 到 $DOMAIN（Cloudflare 模式）"

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    log_warn "建议使用 root 用户运行此脚本"
fi

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    log_info "安装 Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

# 检查 Docker Compose 是否可用
if ! docker compose version &> /dev/null; then
    log_error "Docker Compose 不可用，请检查 Docker 安装"
    exit 1
fi

log_info "Docker 版本: $(docker --version)"
log_info "Docker Compose 版本: $(docker compose version)"

# 检查 .env.production 是否存在
if [ ! -f ".env.production" ]; then
    log_error ".env.production 文件不存在"
    log_info "请先复制 .env.production.example 为 .env.production 并填入真实值"
    exit 1
fi

# 替换 Nginx 配置中的域名
log_info "配置 Nginx..."
sed "s/DOMAIN_NAME/$DOMAIN/g" nginx/conf.d/app.conf.template > nginx/conf.d/app.conf

# 启动数据库和 Redis
log_info "启动数据库服务..."
docker compose -f docker-compose.prod.yml up -d postgres redis

# 等待数据库健康
log_info "等待数据库就绪..."
sleep 10

# 构建并启动应用
log_info "构建应用镜像..."
docker compose -f docker-compose.prod.yml build app

# 启动所有服务
log_info "启动所有服务..."
docker compose -f docker-compose.prod.yml up -d

# 等待应用启动
log_info "等待应用启动..."
sleep 15

# 运行数据库迁移
log_info "运行数据库迁移..."
docker compose -f docker-compose.prod.yml exec -T app node -e "
const { execSync } = require('child_process');
try {
    execSync('npx drizzle-kit migrate', { stdio: 'inherit' });
} catch (e) {
    console.log('Migration skipped or already up to date');
}
" || log_warn "数据库迁移可能需要手动执行"

# 检查服务状态
log_info "检查服务状态..."
docker compose -f docker-compose.prod.yml ps

echo ""
log_info "=========================================="
log_info "部署完成！"
log_info "=========================================="
echo ""
echo "访问地址: https://$DOMAIN"
echo ""
echo "常用命令:"
echo "  查看日志: docker compose -f docker-compose.prod.yml logs -f"
echo "  查看应用日志: docker compose -f docker-compose.prod.yml logs -f app"
echo "  重启服务: docker compose -f docker-compose.prod.yml restart"
echo "  停止服务: docker compose -f docker-compose.prod.yml down"
echo "  更新部署: git pull && docker compose -f docker-compose.prod.yml up -d --build"
echo ""
log_warn "Cloudflare 设置提醒:"
echo "  1. 确保 DNS 记录 A @ 指向 VPS IP: 45.32.59.167"
echo "  2. 确保 Cloudflare SSL/TLS 模式设置为 'Full'"
echo "  3. 确保代理状态为橙色云朵（已开启）"
echo ""
log_warn "OAuth 回调地址提醒:"
echo "  1. GitHub: https://$DOMAIN/api/auth/callback/github"
echo "  2. Google: https://$DOMAIN/api/auth/callback/google"
