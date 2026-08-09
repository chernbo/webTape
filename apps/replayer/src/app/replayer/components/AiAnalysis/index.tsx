'use client'

import { useState } from 'react'
import { Button, Drawer, Progress } from 'antd'
import { RobotOutlined } from '@ant-design/icons'
import styles from './index.module.css'
import ReactMarkdown from 'react-markdown'

interface AiAnalysisProps {
  events: any[]
  rrwebPlayerInstance: any
}

// 单次请求的字符上限
const CHUNK_CHAR_LIMIT = 4000

// 从 events 提取结构化数据
function extractData(events: any[]) {
  const networkList = events
    .filter((e) => e?.data?.tag === 'network')
    .map((e) => {
      const p = e.data.payload
      return `[${p.method}] ${p.url} → ${p.status} (${(p.endTime ?? 0) - (p.startTime ?? 0)}ms)`
    })

  const consoleList = events
    .filter((e) => e?.data?.plugin === 'rrweb/console@1')
    .map((e) => {
      const p = e.data.payload
      return `[${p.level}] ${JSON.stringify(p.payload).slice(0, 200)}`
    })

  const domSnapshots = events.filter((e) => e?.type === 3).length

  // 提取用户交互：点击、输入
  const interactionList = events
    .filter((e) => e?.type === 3 && [3, 5].includes(e?.data?.source))
    .map((e) => {
      const d = e.data
      if (d.source === 3) return `[click]`
      if (d.source === 5)
        return `[input] → "${String(d.text ?? '').slice(0, 50)}"`
      return null
    })
    .filter(Boolean) as string[]

  return { networkList, consoleList, domSnapshots, interactionList }
}

// 将数组按字符总量切片，每片不超过 CHUNK_CHAR_LIMIT
function chunkBySize(lines: string[], limit: number): string[][] {
  const chunks: string[][] = []
  let current: string[] = []
  let size = 0

  for (const line of lines) {
    if (size + line.length > limit && current.length > 0) {
      chunks.push(current)
      current = []
      size = 0
    }
    current.push(line)
    size += line.length
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}

// 调用 Workflow API —— 走服务端代理 /api/ai/analyze
// API Key 只在服务端 (见 api/ai/analyze/route.ts), 不暴露到浏览器 bundle.
async function callWorkflow(payload: Record<string, string>): Promise<string> {
  const resp = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: payload }),
  })
  const data = await resp.json().catch(() => null)
  if (!resp.ok || !data?.ok) {
    throw new Error(data?.error || `AI 分析请求失败: ${resp.status}`)
  }
  return (data.result as string) ?? '（无返回内容）'
}

export default function AiAnalysis({
  events,
  rrwebPlayerInstance,
}: AiAnalysisProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressTip, setProgressTip] = useState('')
  const [result, setResult] = useState('')

  const runAnalysis = async () => {
    setLoading(true)
    setProgress(0)
    setResult('')

    try {
      const { networkList, consoleList, domSnapshots, interactionList } =
        extractData(events)
      const domInfo = `DOM 增量快照数: ${domSnapshots}，点击 ${interactionList.filter((s) => s.startsWith('[click]')).length} 次，输入 ${interactionList.filter((s) => s.startsWith('[input]')).length} 次`

      const networkChunks = chunkBySize(networkList, CHUNK_CHAR_LIMIT)
      const consoleChunks = chunkBySize(consoleList, CHUNK_CHAR_LIMIT)
      const totalChunks = networkChunks.length + consoleChunks.length
      let done = 0
      const partialResults: string[] = []

      // 逐片分析网络请求
      for (let i = 0; i < networkChunks.length; i++) {
        setProgressTip(`分析网络请求 ${i + 1}/${networkChunks.length}...`)
        const res = await callWorkflow({
          network_requests_info: networkChunks[i].join('\n'),
          console_logs_info: '（本片仅分析网络请求）',
          dom_nodes_info: domInfo,
        })
        partialResults.push(`【网络请求片段 ${i + 1}】\n${res}`)
        done++
        setProgress(Math.round((done / (totalChunks + 1)) * 100))
      }

      // 逐片分析控制台日志
      for (let i = 0; i < consoleChunks.length; i++) {
        setProgressTip(`分析控制台日志 ${i + 1}/${consoleChunks.length}...`)
        const res = await callWorkflow({
          network_requests_info: '（本片仅分析控制台日志）',
          console_logs_info: consoleChunks[i].join('\n'),
          dom_nodes_info: domInfo,
        })
        partialResults.push(`【控制台日志片段 ${i + 1}】\n${res}`)
        done++
        setProgress(Math.round((done / (totalChunks + 1)) * 100))
      }

      // 最终汇总
      setProgressTip('汇总分析结果...')
      const summary = await callWorkflow({
        network_requests_info: '（以下是各片段的分析结果，请综合总结）',
        console_logs_info: partialResults
          .join('\n\n---\n\n')
          .slice(0, CHUNK_CHAR_LIMIT * 2),
        dom_nodes_info: `${domInfo}，请给出最终总结和改进建议`,
      })

      setProgress(100)
      setResult(summary)
    } catch (e) {
      setResult(
        `请求失败：${e instanceof Error ? e.message : '请检查网络或 API Key 配置'}`,
      )
    } finally {
      setLoading(false)
      setProgressTip('')
    }
  }

  const handleAnalyze = () => {
    setOpen(true)
    // 有缓存结果就直接展示，不重跑
    if (!loading && !result) runAnalysis()
  }

  const handleReAnalyze = () => {
    if (!loading) runAnalysis()
  }

  return (
    <>
      <Button
        type="primary"
        icon={<RobotOutlined />}
        onClick={handleAnalyze}
        className={styles.btn}
      >
        AI 分析
      </Button>

      <Drawer
        title="AI 录制分析"
        open={open}
        mask={false}
        onClose={() => setOpen(false)}
        extra={
          <Button size="small" onClick={handleReAnalyze} disabled={loading}>
            重新分析
          </Button>
        }
      >
        {loading ? (
          <div className={styles.loading}>
            <Progress percent={progress} status="active" />
            <p className={styles.progressTip}>{progressTip}</p>
          </div>
        ) : (
          <div className={styles.result}>
            {result ? (
              <ReactMarkdown>{result}</ReactMarkdown>
            ) : (
              <span className={styles.placeholder}>点击「重新分析」开始</span>
            )}
          </div>
        )}
      </Drawer>
    </>
  )
}
