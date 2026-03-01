#!/bin/bash

# 严格模式：
# -e: 任一命令失败就退出
# -u: 使用未定义变量时报错
# -o pipefail: 管道中任一命令失败都算失败
set -euo pipefail

# 终端彩色输出（仅用于日志可读性）
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 部署依赖的核心文件
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
RELEASE_FILE=".release"
DEFAULT_APP_IMAGE="ghcr.io/baijinchen/bunn-aws:latest"

# 运行参数（由 parse_args 解析）
MODE=""
DOMAIN=""
APP_IMAGE=""
SKIP_HEALTHCHECK=false

# 统一日志函数，方便在 CI 和 SSH 会话中快速定位问题
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

usage() {
    cat <<'EOF'
Usage:
  ./deploy.sh init --domain <domain> [--image <image>]
  ./deploy.sh deploy --image <image> [--domain <domain>] [--skip-healthcheck]
  ./deploy.sh rollback --image <image> [--domain <domain>] [--skip-healthcheck]

Examples:
  ./deploy.sh init --domain bunn.ink --image ghcr.io/baijinchen/bunn-aws:latest
  ./deploy.sh deploy --image ghcr.io/baijinchen/bunn-aws:sha-abc123 --domain bunn.ink
  ./deploy.sh rollback --image ghcr.io/baijinchen/bunn-aws:latest --domain bunn.ink
EOF
}

# 解析命令行参数：
# deploy.sh <mode> [--domain ...] [--image ...]
parse_args() {
    if [ $# -lt 1 ]; then
        usage
        exit 1
    fi

    MODE="$1"
    shift

    while [ $# -gt 0 ]; do
        case "$1" in
            --domain)
                DOMAIN="${2:-}"
                shift 2
                ;;
            --image)
                APP_IMAGE="${2:-}"
                shift 2
                ;;
            --skip-healthcheck)
                SKIP_HEALTHCHECK=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                log_error "未知参数: $1"
                usage
                exit 1
                ;;
        esac
    done
}

# 基础校验：
# 1) .env.production 存在
# 2) 非 root 时给出提示（不是硬性阻断）
validate_base() {
    if [ ! -f "$ENV_FILE" ]; then
        log_error "$ENV_FILE 文件不存在"
        log_info "请先创建并填写 $ENV_FILE"
        exit 1
    fi

    if [ "$EUID" -ne 0 ]; then
        log_warn "建议使用 root 用户运行部署脚本"
    fi
}

# 确保服务器具备 Docker + docker compose
# 如果 docker 不存在，会尝试自动安装
ensure_docker() {
    if ! command -v docker &> /dev/null; then
        log_info "安装 Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
        systemctl enable docker
        systemctl start docker
    fi

    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose 不可用，请检查 Docker 安装"
        exit 1
    fi
}

# 统一调用 docker compose 的封装：
# - 固定使用生产 compose 文件和 env 文件
# - 注入 APP_IMAGE 供 compose 中 app 服务读取
compose_prod() {
    APP_IMAGE="${APP_IMAGE:-$DEFAULT_APP_IMAGE}" docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

# 首次初始化时可选配置 UFW 防火墙规则
# 放行 SSH(22) + HTTP(80) + HTTPS(443)
configure_firewall() {
    if ! command -v ufw &> /dev/null; then
        log_warn "未检测到 UFW，跳过系统防火墙规则配置（请确认云防火墙已放通 22/80/443）"
        return
    fi

    log_info "配置 UFW 防火墙规则（22/80/443）..."
    ufw allow 22/tcp > /dev/null
    ufw allow 80/tcp > /dev/null
    ufw allow 443/tcp > /dev/null

    UFW_STATUS_LINE=$(ufw status | sed -n '1p' || true)
    if [ "$UFW_STATUS_LINE" = "Status: active" ]; then
        log_info "UFW 已启用，22/80/443 已放行"
    else
        log_warn "UFW 当前未启用，仅写入规则（启用后生效）"
    fi
}

# 根据模板生成当前 Nginx 配置（把 DOMAIN_NAME 替换为真实域名）
switch_nginx_config() {
    local template="$1"
    sed "s/DOMAIN_NAME/$DOMAIN/g" "$template" > nginx/conf.d/app.conf
}

# 申请或更新 Let's Encrypt 证书
# 成功后切换为 HTTPS 配置并 reload nginx
request_certificate() {
    local letsencrypt_email
    local www_domain

    # 从 .env.production 读取证书通知邮箱；没配置则兜底 admin@domain
    letsencrypt_email=$(grep '^LETSENCRYPT_EMAIL=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' || true)
    if [ -z "$letsencrypt_email" ]; then
        letsencrypt_email="admin@$DOMAIN"
        log_warn "未在 $ENV_FILE 中设置 LETSENCRYPT_EMAIL，临时使用: $letsencrypt_email"
    fi

    www_domain="www.$DOMAIN"

    log_info "申请/更新 Let's Encrypt 证书..."
    # 采用 webroot 方式签发证书（与 nginx/certbot 卷共享目录）
    if compose_prod run --rm --entrypoint certbot certbot certonly \
        --webroot -w /var/www/certbot \
        --email "$letsencrypt_email" \
        --agree-tos --no-eff-email --non-interactive --keep-until-expiring \
        --cert-name "$DOMAIN" --expand \
        -d "$DOMAIN" -d "$www_domain"; then
        log_info "证书申请成功，切换到 HTTPS 配置..."
        # 证书成功后，写入正式 HTTPS 配置并热重载 nginx
        switch_nginx_config "nginx/conf.d/app.conf.template"
        compose_prod exec -T nginx nginx -s reload
        compose_prod up -d certbot
        return 0
    fi

    log_warn "证书申请失败，当前保持 HTTP 配置运行"
    return 1
}

# 写入发布记录，便于后续排查当前线上镜像和发布时间
write_release_info() {
    cat > "$RELEASE_FILE" <<EOF
image=$APP_IMAGE
mode=$MODE
deployed_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF
}

# 发布后健康检查：
# - 有域名时检查 https://domain
# - 无域名时检查本机 http://127.0.0.1
run_healthcheck() {
    if [ "$SKIP_HEALTHCHECK" = "true" ]; then
        log_warn "已跳过健康检查（--skip-healthcheck）"
        return
    fi

    local target_url
    target_url="http://127.0.0.1"
    if [ -n "$DOMAIN" ]; then
        target_url="https://$DOMAIN"
    fi

    log_info "执行健康检查: $target_url"
    # curl -f: HTTP 4xx/5xx 视为失败
    if curl -fsS -o /dev/null --max-time 15 "$target_url"; then
        log_info "健康检查通过"
    else
        log_error "健康检查失败: $target_url"
        exit 1
    fi
}

# init 模式：一台新 VPS 的首次部署
# 主要做：防火墙 -> 启服务 -> 申请证书 -> 健康检查
run_init() {
    if [ -z "$DOMAIN" ]; then
        log_error "init 模式必须传入 --domain"
        exit 1
    fi

    APP_IMAGE="${APP_IMAGE:-$DEFAULT_APP_IMAGE}"

    log_info "执行初始化部署（domain=$DOMAIN, image=$APP_IMAGE）"
    configure_firewall
    ensure_docker

    log_info "使用 HTTP 引导配置启动服务..."
    # 首次先用 HTTP 引导配置，证书成功后再切换 HTTPS
    switch_nginx_config "nginx/conf.d/app.bootstrap.conf.template"
    compose_prod up -d postgres redis app nginx
    sleep 8

    # 证书失败不阻塞首发，先保证站点可用
    request_certificate || true
    run_healthcheck
    write_release_info
    compose_prod ps

    log_info "初始化完成。后续发布请使用 deploy 模式。"
}

# deploy/rollback 共享逻辑：
# 本质上都是“部署指定镜像 tag”
run_deploy_like() {
    if [ -z "$APP_IMAGE" ]; then
        log_error "deploy/rollback 模式必须传入 --image"
        exit 1
    fi

    ensure_docker
    log_info "开始发布镜像: $APP_IMAGE"

    # 只拉 app 镜像，不动数据库和缓存容器
    compose_prod pull app
    compose_prod up -d app
    compose_prod ps

    run_healthcheck
    write_release_info

    log_info "发布完成: $APP_IMAGE"
}

# 主入口：按模式分发到 init / deploy / rollback
main() {
    parse_args "$@"
    validate_base

    case "$MODE" in
        init)
            run_init
            ;;
        deploy|rollback)
            run_deploy_like
            ;;
        *)
            log_error "未知模式: $MODE"
            usage
            exit 1
            ;;
    esac
}

main "$@"
