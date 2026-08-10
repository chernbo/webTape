#!/usr/bin/env bash
# ------------------------------------------------------------------
# WebTape Replayer 一键自建脚本
#
# 用法 (零配置, 自动生成随机密码):
#   curl -fsSL https://raw.githubusercontent.com/chernbo/webTape/main/deploy/install.sh | bash
# 或下载后本地跑:
#   bash install.sh
#
# 可用环境变量 (都可选):
#   WEBTAPE_DIR       安装目录, 默认 ./webtape
#   WEBTAPE_PORT      对外端口, 默认 3100
#   REPLAYER_IMAGE    镜像, 默认 ghcr.io/chernbo/webtape-replayer:latest
#   WEBTAPE_NO_START  设为 1 时只生成 .env + compose, 不启动容器 (便于先检查)
#
# 前置要求:
#   - 已安装 Docker + Docker Compose v2
#   - 镜像 REPLAYER_IMAGE 可被拉取 (公开镜像; 私有则需先 docker login)
# ------------------------------------------------------------------
set -euo pipefail

WEBTAPE_DIR="${WEBTAPE_DIR:-webtape}"
WEBTAPE_PORT="${WEBTAPE_PORT:-3100}"
REPLAYER_IMAGE="${REPLAYER_IMAGE:-ghcr.io/chernbo/webtape-replayer:latest}"

log()  { printf '\033[36m[webtape]\033[0m %s\n' "$*"; }
die()  { printf '\033[31m[webtape] 错误:\033[0m %s\n' "$*" >&2; exit 1; }

# ── 1. 环境检查 ────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || die "未检测到 docker, 请先安装 Docker: https://docs.docker.com/get-docker/"
docker compose version >/dev/null 2>&1 || die "未检测到 Docker Compose v2 (docker compose)。请升级 Docker。"

# ── 2. 准备安装目录 ─────────────────────────────────────────
mkdir -p "$WEBTAPE_DIR"
cd "$WEBTAPE_DIR"
log "安装目录: $(pwd)"

# ── 3. 生成 .env (随机密码, 已存在则不覆盖) ──────────────────
gen_secret() {
  # 优先 openssl, 退回 /dev/urandom
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "${1:-16}"
  else
    LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c "$(( ${1:-16} * 2 ))"
  fi
}

if [ -f .env ]; then
  log ".env 已存在, 复用 (不覆盖现有密码)"
else
  MYSQL_ROOT_PASSWORD="$(gen_secret 16)"
  MYSQL_PASSWORD="$(gen_secret 12)"
  cat > .env <<EOF
# 由 install.sh 自动生成 —— 密码随机, 请妥善保管
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
MYSQL_DATABASE=fed_bugtape
MYSQL_USER=webtape
MYSQL_PASSWORD=${MYSQL_PASSWORD}

# 回放链接对外地址 (给他人访问时改成你的公网域名)
REPLAYER_PUBLIC_URL=http://localhost:${WEBTAPE_PORT}

# CORS: 自建无网关, 默认放开让业务页面能跨域上传。
# 生产建议改成业务域名白名单, 如 https://a.example.com,https://b.example.com
CORS_ALLOW_ORIGIN=*

# 镜像与端口
REPLAYER_IMAGE=${REPLAYER_IMAGE}
WEBTAPE_PORT=${WEBTAPE_PORT}
EOF
  chmod 600 .env
  log "已生成 .env (随机密码, 权限 600)"
fi

# ── 4. 生成 docker-compose.yml ─────────────────────────────
cat > docker-compose.yml <<'YAML'
services:
  mysql:
    image: mysql:8.4
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    volumes:
      - mysql-data:/var/lib/mysql
    healthcheck:
      test:
        [
          'CMD-SHELL',
          'mysqladmin ping -h 127.0.0.1 -u${MYSQL_USER} -p${MYSQL_PASSWORD} --silent',
        ]
      interval: 5s
      timeout: 5s
      retries: 20
      start_period: 20s

  replayer:
    image: ${REPLAYER_IMAGE:-ghcr.io/chernbo/webtape-replayer:latest}
    # 镜像仅发布 amd64；显式指定平台，让 Apple Silicon 等 arm64 主机也能拉取(经 Rosetta/QEMU 运行)
    # Image is published for amd64 only; pin the platform so arm64 hosts (e.g. Apple Silicon) can pull & run it via emulation.
    platform: linux/amd64
    restart: unless-stopped
    depends_on:
      mysql:
        condition: service_healthy
    environment:
      DATABASE_URL: mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@mysql:3306/${MYSQL_DATABASE}
      REPLAYER_PUBLIC_URL: ${REPLAYER_PUBLIC_URL}
      CORS_ALLOW_ORIGIN: ${CORS_ALLOW_ORIGIN:-*}
      NODE_ENV: production
    ports:
      - '${WEBTAPE_PORT:-3100}:3000'
    # 启动时按 schema 建表, 再起 Next.js
    command: >
      sh -c "pnpm prisma db push && pnpm exec next start --hostname 0.0.0.0 --port 3000"

volumes:
  mysql-data:
YAML
log "已生成 docker-compose.yml"

# ── 5. 启动 ────────────────────────────────────────────────
if [ "${WEBTAPE_NO_START:-0}" = "1" ]; then
  log "WEBTAPE_NO_START=1, 已跳过启动。可手动执行: cd $WEBTAPE_DIR && docker compose up -d"
  exit 0
fi

log "拉取镜像并启动服务 (首次可能较慢)..."
docker compose pull
docker compose up -d

log "服务已启动 ✅"
log "访问: http://localhost:${WEBTAPE_PORT}"
log "查看日志: (cd $WEBTAPE_DIR && docker compose logs -f replayer)"
log "停止服务: (cd $WEBTAPE_DIR && docker compose down)"
