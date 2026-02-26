#!/bin/bash

# ===========================================
# 远程部署脚本 - 从本地一键部署到 VPS（Cloudflare 模式）
# 使用方法: ./deploy-remote.sh user@vps-ip yourdomain.com
# 示例: ./deploy-remote.sh root@45.32.59.167 bunn.ink
# ===========================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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
if [ -z "$1" ] || [ -z "$2" ]; then
    log_error "缺少参数"
    echo ""
    echo "使用方法: ./deploy-remote.sh user@vps-ip yourdomain.com"
    echo "示例: ./deploy-remote.sh root@45.32.59.167 bunn.ink"
    exit 1
fi

VPS_HOST=$1
DOMAIN=$2
REMOTE_DIR="/opt/bunn-aws"

log_info "=========================================="
log_info "远程部署到 $VPS_HOST"
log_info "域名: $DOMAIN"
log_info "=========================================="

# 检查本地 .env.production 是否存在
if [ ! -f ".env.production" ]; then
    log_error ".env.production 文件不存在"
    log_info "请先复制 .env.production.example 为 .env.production 并填入真实值"
    exit 1
fi

# 检查 SSH 连接
log_info "测试 SSH 连接..."
if ! ssh -o ConnectTimeout=10 "$VPS_HOST" "echo 'SSH 连接成功'" 2>/dev/null; then
    log_error "无法连接到 $VPS_HOST"
    echo "请确认："
    echo "  1. VPS IP 地址正确"
    echo "  2. SSH 密钥已配置 (ssh-copy-id $VPS_HOST)"
    echo "  3. VPS 防火墙允许 SSH 连接"
    exit 1
fi

# 在 VPS 上安装 Git 和 Docker（如果需要）
log_info "检查 VPS 环境..."
ssh "$VPS_HOST" << 'ENDSSH'
set -e

# 安装 Git
if ! command -v git &> /dev/null; then
    echo "安装 Git..."
    apt-get update && apt-get install -y git
fi

# 安装 Docker
if ! command -v docker &> /dev/null; then
    echo "安装 Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

echo "环境检查完成"
ENDSSH

# 检查远程目录是否存在，不存在则克隆
log_info "检查远程项目目录..."
REPO_EXISTS=$(ssh "$VPS_HOST" "[ -d $REMOTE_DIR/.git ] && echo 'yes' || echo 'no'")

if [ "$REPO_EXISTS" = "no" ]; then
    log_info "首次部署，请输入 Git 仓库地址:"
    read -r GIT_REPO
    
    if [ -z "$GIT_REPO" ]; then
        log_error "Git 仓库地址不能为空"
        exit 1
    fi
    
    log_info "克隆仓库到 VPS..."
    ssh "$VPS_HOST" "git clone $GIT_REPO $REMOTE_DIR"
else
    log_info "更新代码..."
    ssh "$VPS_HOST" "cd $REMOTE_DIR && git pull"
fi

# 传输 .env.production
log_info "传输环境变量文件..."
scp .env.production "$VPS_HOST:$REMOTE_DIR/.env.production"

# 执行远程部署脚本
log_info "执行远程部署..."
ssh "$VPS_HOST" "cd $REMOTE_DIR && chmod +x deploy.sh && ./deploy.sh $DOMAIN"

echo ""
log_info "=========================================="
log_info "部署完成！"
log_info "=========================================="
echo ""
echo "访问地址: https://$DOMAIN"
echo ""
echo "后续更新只需运行:"
echo "  ./deploy-remote.sh $VPS_HOST $DOMAIN"
echo ""
echo "SSH 登录 VPS 查看日志:"
echo "  ssh $VPS_HOST"
echo "  cd $REMOTE_DIR"
echo "  docker compose -f docker-compose.prod.yml logs -f"
