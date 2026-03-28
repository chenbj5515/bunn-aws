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
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
RELEASE_FILE="${RELEASE_FILE:-.release}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-drizzle}"
MIGRATION_JOURNAL="${MIGRATION_JOURNAL:-$MIGRATIONS_DIR/meta/_journal.json}"
MIGRATION_TABLE="${MIGRATION_TABLE:-schema_migrations}"
DEFAULT_APP_IMAGE="${DEFAULT_APP_IMAGE:-ghcr.io/baijinchen/bunn-aws:latest}"

# 运行参数（由 parse_args 解析）
MODE=""
DOMAIN=""
APP_IMAGE=""

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
  ./deploy.sh deploy --image <image> [--domain <domain>]
  ./deploy.sh migrate
  ./deploy.sh rollback --image <image> [--domain <domain>]

Examples:
  ./deploy.sh init --domain bunn.ink --image ghcr.io/baijinchen/bunn-aws:latest
  ./deploy.sh deploy --image ghcr.io/baijinchen/bunn-aws:sha-abc123 --domain bunn.ink
  ./deploy.sh migrate
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

wait_for_postgres() {
    local max_attempts=30
    local attempt=1

    log_info "等待 PostgreSQL 就绪..."
    compose_prod up -d postgres > /dev/null

    until compose_prod exec -T postgres sh -lc 'pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-bunn_db}"' > /dev/null 2>&1; do
        if [ "$attempt" -ge "$max_attempts" ]; then
            log_error "PostgreSQL 在预期时间内未就绪"
            exit 1
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
}

psql_exec() {
    local sql="$1"
    compose_prod exec -T postgres sh -lc \
        "psql -v ON_ERROR_STOP=1 -U \"\${POSTGRES_USER:-postgres}\" -d \"\${POSTGRES_DB:-bunn_db}\" -c \"$sql\""
}

escape_sql_literal() {
    printf "%s" "$1" | sed "s/'/''/g"
}

ensure_migration_table() {
    psql_exec "CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (tag text PRIMARY KEY, filename text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now());"
}

get_migration_tags() {
    if [ ! -f "$MIGRATION_JOURNAL" ]; then
        log_warn "未找到迁移索引文件: $MIGRATION_JOURNAL，跳过迁移"
        return 0
    fi

    awk -F'"' '/"tag":/ {print $4}' "$MIGRATION_JOURNAL"
}

run_single_migration() {
    local tag="$1"
    local migration_file="$MIGRATIONS_DIR/${tag}.sql"
    local escaped_tag
    local escaped_filename
    local already_applied

    if [ ! -f "$migration_file" ]; then
        log_error "迁移文件不存在: $migration_file"
        exit 1
    fi

    escaped_tag=$(escape_sql_literal "$tag")
    escaped_filename=$(escape_sql_literal "$(basename "$migration_file")")

    already_applied=$(
        compose_prod exec -T postgres sh -lc \
            "psql -At -U \"\${POSTGRES_USER:-postgres}\" -d \"\${POSTGRES_DB:-bunn_db}\" -c \"SELECT 1 FROM ${MIGRATION_TABLE} WHERE tag = '${escaped_tag}' LIMIT 1;\"" \
            2> /dev/null || true
    )

    if [ "$already_applied" = "1" ]; then
        log_info "跳过已执行迁移: $tag"
        return 0
    fi

    log_info "执行迁移: $tag"
    compose_prod exec -T postgres sh -lc \
        'psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-bunn_db}"' \
        < "$migration_file"

    psql_exec "INSERT INTO ${MIGRATION_TABLE} (tag, filename) VALUES ('${escaped_tag}', '${escaped_filename}') ON CONFLICT (tag) DO NOTHING;"
}

run_migrations() {
    local tags

    if [ ! -d "$MIGRATIONS_DIR" ]; then
        log_warn "未找到迁移目录: $MIGRATIONS_DIR，跳过迁移"
        return 0
    fi

    wait_for_postgres
    ensure_migration_table

    tags=$(get_migration_tags)
    if [ -z "$tags" ]; then
        log_info "未发现需要管理的迁移"
        return 0
    fi

    while IFS= read -r tag; do
        if [ -z "$tag" ]; then
            continue
        fi
        run_single_migration "$tag"
    done <<< "$tags"
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

# init 模式：一台新 VPS 的首次部署
# 主要做：防火墙 -> 启服务 -> 申请证书
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
    compose_prod up -d postgres redis
    run_migrations
    compose_prod up -d app nginx
    sleep 8

    # 证书失败不阻塞首发，先保证站点可用
    request_certificate || true
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

    # 先让数据库完成迁移，再启动新版本 app，避免代码先于表结构发布
    run_migrations

    # 只拉 app 镜像，不动数据库和缓存容器
    compose_prod pull app
    compose_prod up -d app
    compose_prod ps

    write_release_info

    log_info "发布完成: $APP_IMAGE"
}

run_migrate_only() {
    ensure_docker
    log_info "开始执行数据库迁移"
    run_migrations
    log_info "数据库迁移完成"
}

# 主入口：按模式分发到 init / deploy / rollback
main() {
    parse_args "$@"
    validate_base

    case "$MODE" in
        init)
            run_init
            ;;
        migrate)
            run_migrate_only
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
