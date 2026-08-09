import { message } from 'antd'
import useSWR from 'swr'
import { unpack } from '@rrweb/packer'
import type { eventWithTime } from 'rrweb'

/**
 * 拉取录屏事件
 *
 * 走自建后端 /api/recordings/:id (远程 MySQL fed_bugtape)
 * 后端响应 { ok, meta, events }, 前端只用 events.
 *
 * 录制端 (webTape-toolbox uploadEvents) 用了 @rrweb/packer 的 pack 把每个 event 压成
 * 字符串后再上传. DB 存的就是 string[]. 这里拿到原始数据后逐个 unpack 还原成
 * eventWithTime, 后续组件 (rrweb-player / RRwebTimeLine / AnnotationLayer) 都拿
 * 解包后的标准对象, 不用关心压缩格式.
 *
 * 对老数据 (未 pack 的 object[]) 兼容: 仅在首元素是字符串时才走 unpack 路径.
 */
const useEvents = (sourceId: string) => {
  const url = sourceId
    ? `/api/recordings/${encodeURIComponent(sourceId)}`
    : null

  const fetcher = async (u: string) => {
    const res = await fetch(u)
    if (!res.ok) {
      const errBody = await res.json().catch(() => null)
      throw new Error(errBody?.error || `Request failed: ${res.status}`)
    }
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      throw new Error('InvalidContentType')
    }
    const body = await res.json()
    const raw = body?.events ?? body
    // packed 数据: events 是 string[], 每个元素是 pack(eventWithTime) 的输出
    if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'string') {
      return (raw as string[]).map((s) => unpack(s)) as eventWithTime[]
    }
    return raw as eventWithTime[]
  }

  return useSWR(url, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    onError: (err) => message.error(err.message),
  })
}

export default useEvents
