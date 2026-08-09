#!/usr/bin/env bash
set -e
set -o pipefail

echo -e "=============== Starting build process... ==============="
export NODE_OPTIONS="--max-old-space-size=4096"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
CACHE_DIR="$ROOT_DIR/.cache"

npm install
npm run build

# 创建生产依赖缓存目录
mkdir -p "$CACHE_DIR"
cp ./package.json "$CACHE_DIR"
cp ./package-lock.json "$CACHE_DIR"
npm install --prefix "$CACHE_DIR" --omit=dev --no-audit --no-fund
