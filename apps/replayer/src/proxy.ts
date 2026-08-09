import { NextResponse, type NextRequest } from 'next/server'

/**
 * 给 /api/* 注入 CORS 头。
 *
 * SDK (webTape-toolbox) 运行在**业务页面的源**上, 上传到 replayer 的源, 天然跨域,
 * 浏览器会先发 OPTIONS 预检。因此 replayer 必须回 CORS 头, 否则上传被拦。
 *
 * 由 env `CORS_ALLOW_ORIGIN` 控制, 兼顾「自建(无网关)」与「网关代管」两种部署:
 *
 *   未设置:
 *     - 非生产 → 默认 '*'  (本地联调: toolbox :5173 → replayer :3100)
 *     - 生产   → 不注入任何 CORS 头 (假定由网关/反代处理, 避免与网关重复头冲突)
 *   '*'                                   → 允许所有来源 (自建服务最省事的默认)
 *   'https://a.com,https://b.com'         → 白名单: 命中请求 Origin 才反射, 否则不注入
 *
 * Next.js 16 把 middleware 约定重命名为 proxy (文件 src/proxy.ts + 导出 proxy),
 * 行为与 middleware 一致, 语义上强调它是请求边界上的网络代理层。
 */

function resolveAllowOrigin(reqOrigin: string | null): string | null {
  const cfg = process.env.CORS_ALLOW_ORIGIN?.trim()

  // 未配置: 非生产默认放开, 生产交给网关 (保持向后兼容)
  if (!cfg) {
    return process.env.NODE_ENV !== 'production' ? '*' : null
  }

  if (cfg === '*') return '*'

  // 白名单: 只反射命中的 Origin (Access-Control-Allow-Origin 只能是单值或 *)
  const whitelist = cfg
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (reqOrigin && whitelist.includes(reqOrigin)) return reqOrigin

  return null
}

function applyCorsHeaders(res: NextResponse, allowOrigin: string): NextResponse {
  res.headers.set('Access-Control-Allow-Origin', allowOrigin)
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  // 非通配时来源随请求变化, 需告知缓存按 Origin 区分
  if (allowOrigin !== '*') res.headers.append('Vary', 'Origin')
  return res
}

export function proxy(req: NextRequest) {
  const allowOrigin = resolveAllowOrigin(req.headers.get('origin'))

  // 不注入 CORS: 未配置的生产环境 (网关模式), 或白名单未命中
  if (!allowOrigin) {
    return NextResponse.next()
  }

  // 预检: 直接 204 + 头返回, 不进路由
  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 })
    applyCorsHeaders(res, allowOrigin)
    res.headers.set('Access-Control-Max-Age', '86400')
    return res
  }

  return applyCorsHeaders(NextResponse.next(), allowOrigin)
}

export const config = {
  matcher: '/api/:path*',
}
