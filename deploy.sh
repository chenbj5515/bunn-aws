#!/bin/bash

# ===========================================
# Bunn AWS VPS 一键部署脚本（Let's Encrypt HTTPS）
# 使用方法: ./deploy.sh yourdomain.com
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

log_info "开始部署 Bunn AWS 到 $DOMAIN（Let's Encrypt 模式）"

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

# 读取 Let's Encrypt 邮箱（优先 .env.production）
LETSENCRYPT_EMAIL=$(grep '^LETSENCRYPT_EMAIL=' .env.production | cut -d'=' -f2- | tr -d '"' || true)
if [ -z "$LETSENCRYPT_EMAIL" ]; then
    LETSENCRYPT_EMAIL="admin@$DOMAIN"
    log_warn "未在 .env.production 中设置 LETSENCRYPT_EMAIL，临时使用: $LETSENCRYPT_EMAIL"
fi

# 先生成 HTTP 引导配置（用于签发证书）
log_info "配置 Nginx..."
sed "s/DOMAIN_NAME/$DOMAIN/g" nginx/conf.d/app.bootstrap.conf.template > nginx/conf.d/app.conf

# 启动数据库和 Redis
log_info "启动数据库服务..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d postgres redis

# 等待数据库健康
log_info "等待数据库就绪..."
sleep 10

# 构建并启动应用
log_info "构建应用镜像..."
docker compose -f docker-compose.prod.yml --env-file .env.production build app

# 启动所有服务
log_info "启动所有服务..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# 等待应用启动
log_info "等待应用启动..."
sleep 15

# 签发/续签证书
SSL_ENABLED=false
log_info "申请/更新 Let's Encrypt 证书..."
if docker compose -f docker-compose.prod.yml --env-file .env.production run --rm certbot certonly \
    --webroot -w /var/www/certbot \
    --email "$LETSENCRYPT_EMAIL" \
    --agree-tos --no-eff-email --non-interactive --keep-until-expiring \
    -d "$DOMAIN"; then
    SSL_ENABLED=true
    log_info "证书申请成功，切换到 HTTPS 配置..."
    sed "s/DOMAIN_NAME/$DOMAIN/g" nginx/conf.d/app.conf.template > nginx/conf.d/app.conf
    docker compose -f docker-compose.prod.yml --env-file .env.production exec -T nginx nginx -s reload
    # 启动续签服务
    docker compose -f docker-compose.prod.yml --env-file .env.production up -d certbot
else
    log_warn "证书申请失败，当前保持 HTTP 配置运行。"
fi

# 运行数据库迁移
log_info "运行数据库迁移..."
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T app node -e "
const { execSync } = require('child_process');
try {
    execSync('npx drizzle-kit migrate', { stdio: 'inherit' });
} catch (e) {
    console.log('Migration skipped or already up to date');
}
" || log_warn "数据库迁移可能需要手动执行"

# 检查服务状态
log_info "检查服务状态..."
docker compose -f docker-compose.prod.yml --env-file .env.production ps

echo ""
log_info "=========================================="
log_info "部署完成！"
log_info "=========================================="
echo ""
if [ "$SSL_ENABLED" = "true" ]; then
    echo "访问地址: https://$DOMAIN"
else
    echo "访问地址: http://$DOMAIN"
    echo "（证书申请失败，请检查 80 端口、防火墙、DNS 后重试）"
fi
echo ""
echo "常用命令:"
echo "  查看日志: docker compose -f docker-compose.prod.yml logs -f"
echo "  查看应用日志: docker compose -f docker-compose.prod.yml logs -f app"
echo "  重启服务: docker compose -f docker-compose.prod.yml restart"
echo "  停止服务: docker compose -f docker-compose.prod.yml down"
echo "  更新部署: git pull && docker compose -f docker-compose.prod.yml up -d --build"
echo ""
log_warn "HTTPS 部署提醒:"
echo "  1. 确保 DNS 记录 A @ 指向 VPS IP: 45.32.59.167"
echo "  2. 确保 80/443 端口在云防火墙与系统防火墙放通"
echo "  3. 建议在 .env.production 中设置 LETSENCRYPT_EMAIL"
echo ""
log_warn "OAuth 回调地址提醒:"
echo "  1. GitHub: https://$DOMAIN/api/auth/callback/github"
echo "  2. Google: https://$DOMAIN/api/auth/callback/google"
