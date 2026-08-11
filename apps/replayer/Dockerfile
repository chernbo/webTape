## ------------------------------------------------------------------
## webTape-replayer Dockerfile
##
## 版本锁定原则:
##   - node: 22-alpine  (Node 22 LTS)
##   - pnpm: 通过 package.json 的 packageManager 字段固定
##   - COREPACK_NPM_REGISTRY: 让 corepack 拉 pnpm binary 也走 npmmirror
##   - --frozen-lockfile: 严格按照 pnpm-lock.yaml 装, 版本不匹配直接失败
## ------------------------------------------------------------------

FROM node:22-alpine AS base
WORKDIR /app

# corepack + npm 镜像统一走 npmmirror, 避开 npm 官方源不稳
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    COREPACK_NPM_REGISTRY="https://registry.npmmirror.com" \
    NPM_CONFIG_REGISTRY="https://registry.npmmirror.com"

RUN apk add --no-cache libc6-compat openssl \
    && corepack enable

## ---------- deps ----------
FROM base AS deps

# 只拷依赖清单, 保证 node_modules 层可缓存
# 注册表已由上方 env (NPM_CONFIG_REGISTRY / COREPACK_NPM_REGISTRY) 指定, 无需 .npmrc
# Registry is set via env above, so no .npmrc is needed here.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# packageManager 字段驱动 corepack 装出 lockfile 匹配的 pnpm 版本
RUN corepack prepare --activate \
    && pnpm install --frozen-lockfile --prefer-offline

## ---------- builder ----------
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack prepare --activate \
    && pnpm prisma generate \
    && pnpm build

## ---------- runner ----------
FROM base AS runner
ENV NODE_ENV="production"

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/prisma ./prisma

RUN corepack prepare --activate

EXPOSE 3000

# host/port 已写进 package.json 的 start 脚本；避免 `pnpm start -- ...` 把 `--` 透传给 next
# host/port live in the package.json "start" script, avoiding pnpm forwarding `--` to next
CMD ["pnpm", "start"]
