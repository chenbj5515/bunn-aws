#!/bin/bash

# ===========================================
# 本地环境变量同步脚本
# 用途：快速将本地 .env.production 同步到 VPS
# 配置：从 .env.production 中读取 VPS_HOST/VPS_PORT/VPS_USER/VPS_REMOTE_DIR
# ===========================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

ENV_FILE=".env.production"

# 从 .env.production 读取配置
load_env_config() {
    if [ ! -f "$ENV_FILE" ]; then
        log_error "$ENV_FILE 不存在"
        exit 1
    fi
    
    VPS_HOST=$(grep '^VPS_HOST=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' || true)
    VPS_PORT=$(grep '^VPS_PORT=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' || echo "22")
    VPS_USER=$(grep '^VPS_USER=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' || echo "root")
    REMOTE_DIR=$(grep '^VPS_REMOTE_DIR=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' || echo "/opt/bunn-aws")
}

load_env_config

if [ -z "$VPS_HOST" ]; then
    log_error "请在 .env.production 中设置 VPS_HOST"
    exit 1
fi

log_info "=========================================="
log_info "同步 .env.production → $VPS_USER@$VPS_HOST:$VPS_PORT"
log_info "远程路径: $REMOTE_DIR/.env.production"
log_info "=========================================="

scp -P "$VPS_PORT" "$ENV_FILE" "$VPS_USER@$VPS_HOST:$REMOTE_DIR/.env.production"
log_info "文件同步完成!"

log_info "正在重建 app 容器以加载新配置..."
ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "cd $REMOTE_DIR && APP_IMAGE=\$(docker inspect bunn-app --format='{{.Config.Image}}') docker compose -f docker-compose.prod.yml --env-file .env.production up -d app"

log_info "完成! 新配置已生效"
