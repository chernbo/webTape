'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import {
  Tabs,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Slider,
  Radio,
  Checkbox,
  Rate,
  Button,
  DatePicker,
  TimePicker,
  Divider,
  Tag,
  Alert,
  Space,
  message,
  Tooltip,
} from 'antd'
import {
  ArrowLeftOutlined,
  VideoCameraOutlined,
  HistoryOutlined,
  AlertOutlined,
  SendOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import styles from './page.module.css'

const { TextArea } = Input

// ─── 类型 ──────────────────────────────────────────
type RecordingState = 'finished' | 'recording' | 'uploading'

interface RecordingResult {
  sourceId: string
  url: string
}

// ─── 工具 ──────────────────────────────────────────
function getWebTape() {
  if (typeof window === 'undefined') return undefined
  return (
    window as unknown as {
      _webTape?: {
        startRecord: () => Promise<void>
        stopRecord: () => Promise<RecordingResult | false>
        discardRecord: () => void
        reportRecent: () => Promise<RecordingResult | false>
        getState: () => RecordingState
        onStateChange: (cb: (s: RecordingState) => void) => () => void
        configure: (opts: object) => void
      }
    }
  )._webTape
}

// ─── 状态徽章 ──────────────────────────────────────
function StateBadge({ state }: { state: RecordingState }) {
  const cfg = {
    finished: { cls: styles.stateFinished, dot: '#52c41a', label: '待机中' },
    recording: { cls: styles.stateRecording, dot: '#ff4d4f', label: '录制中' },
    uploading: { cls: styles.stateUploading, dot: '#1890ff', label: '上传中' },
  }[state]
  return (
    <span className={`${styles.stateTag} ${cfg.cls}`}>
      <span className={styles.dot} style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

// ─── 控制面板 (三个 Tab 共用) ────────────────────────
function RecordPanel({
  state,
  result,
  onManualStart,
  onManualStop,
  onDiscard,
  onReportRecent,
}: {
  state: RecordingState
  result: RecordingResult | null
  onManualStart: () => void
  onManualStop: () => void
  onDiscard: () => void
  onReportRecent: () => void
}) {
  return (
    <div className={styles.panelCard}>
      <div className={styles.panelTitle}>SDK 状态</div>
      <StateBadge state={state} />

      <Divider style={{ margin: '8px 0' }} />

      <div className={styles.panelTitle}>手动录制</div>
      <Space orientation="vertical" style={{ width: '100%' }}>
        <Button
          type="primary"
          icon={<VideoCameraOutlined />}
          block
          disabled={state !== 'finished'}
          onClick={onManualStart}
        >
          开始录制
        </Button>
        <Button
          icon={<SendOutlined />}
          block
          disabled={state !== 'recording'}
          onClick={onManualStop}
        >
          停止并提交
        </Button>
        <Button
          danger
          block
          disabled={state !== 'recording'}
          onClick={onDiscard}
        >
          丢弃录制
        </Button>
      </Space>

      <Divider style={{ margin: '8px 0' }} />

      <div className={styles.panelTitle}>回溯录制</div>
      <Tooltip title="一键上传最近 60s 的后台录制快照">
        <Button
          icon={<HistoryOutlined />}
          block
          disabled={state !== 'finished'}
          onClick={onReportRecent}
        >
          上报最近 60s
        </Button>
      </Tooltip>

      {result && (
        <div className={styles.resultBox}>
          <div style={{ marginBottom: 6, fontWeight: 600, color: '#389e0d' }}>
            ✅ 上传成功
          </div>
          <Button
            type="link"
            size="small"
            style={{ padding: 0 }}
            onClick={() => window.open(result.url, '_blank', 'noopener')}
          >
            → 查看回放
          </Button>
          <div
            style={{ color: '#8c8c8c', marginTop: 4, wordBreak: 'break-all' }}
          >
            {result.url}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 主组件 ────────────────────────────────────────
export default function ExperiencePage() {
  const [sdkState, setSdkState] = useState<RecordingState>('finished')
  const [sdkReady, setSdkReady] = useState(false)
  const [lastResult, setLastResult] = useState<RecordingResult | null>(null)

  // SDK 轮询初始化
  useEffect(() => {
    let cancelled = false
    let unsub: (() => void) | undefined

    const tryInit = () => {
      const tape = getWebTape()
      if (!tape) return false
      // 上传地址跟随当前 origin, 避免生产环境上传到 localhost
      tape.configure({
        backgroundWindowMs: 60_000,
        errorPrompt: true,
        _apiBase: `${window.location.origin}/api/replayer`,
      })
      unsub = tape.onStateChange((s) => {
        if (!cancelled) setSdkState(s)
      })
      if (!cancelled) setSdkReady(true)
      return true
    }

    if (tryInit())
      return () => {
        cancelled = true
        unsub?.()
      }
    const id = setInterval(() => {
      if (tryInit()) clearInterval(id)
    }, 200)
    return () => {
      cancelled = true
      clearInterval(id)
      unsub?.()
    }
  }, [])

  const handleStart = useCallback(async () => {
    const tape = getWebTape()
    if (!tape) {
      message.warning('SDK 未加载')
      return
    }
    setLastResult(null)
    await tape.startRecord()
  }, [])

  const handleStop = useCallback(async () => {
    const tape = getWebTape()
    if (!tape) return
    const r = await tape.stopRecord()
    if (r) {
      setLastResult(r)
      message.success('上传成功')
    } else message.error('上传失败')
  }, [])

  const handleDiscard = useCallback(() => {
    getWebTape()?.discardRecord()
    message.info('已丢弃')
  }, [])

  const handleReportRecent = useCallback(async () => {
    const tape = getWebTape()
    if (!tape) return
    setLastResult(null)
    const r = await tape.reportRecent()
    if (r) {
      setLastResult(r)
      message.success('回溯上传成功')
    } else message.info('暂无可回溯录制内容')
  }, [])

  const commonPanel = (
    <RecordPanel
      state={sdkState}
      result={lastResult}
      onManualStart={handleStart}
      onManualStop={handleStop}
      onDiscard={handleDiscard}
      onReportRecent={handleReportRecent}
    />
  )

  // ─── Tab 1: 手动录制 ─ 丰富表单 ────────────────────
  const ManualTab = (
    <div className={styles.tabContent}>
      <div className={styles.demoDesc}>
        <strong>手动录制</strong>
        ：点击右侧「开始录制」，在下方表单中进行各种操作，
        完成后「停止并提交」，获得可分享的回放链接。rrweb 会完整录制所有 DOM
        变更、输入事件和网络请求。
      </div>
      <div className={styles.demoGrid}>
        <div className={styles.formCard}>
          <Form
            layout="horizontal"
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 16 }}
          >
            <Form.Item label="姓名">
              <Input placeholder="请输入姓名" />
            </Form.Item>
            <Form.Item label="国籍" required>
              <Select
                placeholder="请选择"
                options={[
                  { value: 'cn', label: '中国' },
                  { value: 'us', label: '美国' },
                  { value: 'sg', label: '新加坡' },
                  { value: 'hk', label: '香港' },
                ]}
              />
            </Form.Item>
            <Form.Item label="证件类型" required>
              <Select
                mode="multiple"
                placeholder="可多选"
                options={[
                  { value: 'passport', label: '护照' },
                  { value: 'id', label: '身份证' },
                  { value: 'hkid', label: '港澳通行证' },
                ]}
              />
            </Form.Item>
            <Form.Item label="资产规模">
              <Space.Compact>
                <InputNumber
                  style={{ width: 180 }}
                  min={0}
                  step={10000}
                  placeholder="0"
                />
                <Input style={{ width: 60 }} disabled value="元" />
              </Space.Compact>
            </Form.Item>
            <Form.Item label="风险测评">
              <Slider
                marks={{
                  0: '保守',
                  25: '稳健',
                  50: '平衡',
                  75: '积极',
                  100: '进取',
                }}
                defaultValue={25}
              />
            </Form.Item>
            <Form.Item label="开启通知">
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item label="投资偏好">
              <Radio.Group defaultValue="stock">
                <Radio value="stock">股票</Radio>
                <Radio value="fund">基金</Radio>
                <Radio value="bond">债券</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item label="市场" required>
              <Radio.Group defaultValue="us" buttonStyle="solid">
                <Radio.Button value="us">美股</Radio.Button>
                <Radio.Button value="hk">港股</Radio.Button>
                <Radio.Button value="a">A股</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item label="交易权限">
              <Checkbox.Group
                options={['现货', '融资', '期权', '期货']}
                defaultValue={['现货']}
              />
            </Form.Item>
            <Form.Item label="服务评分">
              <Rate allowHalf defaultValue={3.5} />
            </Form.Item>
            <Form.Item label="备注">
              <TextArea rows={3} placeholder="其他说明..." />
            </Form.Item>
            <Form.Item label="生效日期">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="提醒时间">
              <TimePicker style={{ width: '100%' }} format="HH:mm" />
            </Form.Item>
            <Form.Item wrapperCol={{ offset: 6 }}>
              <Space>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={() => message.success('表单提交成功（演示）')}
                >
                  提交开户
                </Button>
                <Button>重置</Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
        {commonPanel}
      </div>
    </div>
  )

  // ─── Tab 2: 回溯录制 ─ 说明无需手动开录 ───────────
  const RecentTab = (
    <div className={styles.tabContent}>
      <div className={styles.demoDesc}>
        <strong>回溯录制（最近 60 秒）</strong>：SDK 在后台
        <strong>持续录制</strong>最近 60 秒的滑动窗口。
        无需手动开录，直接在下方进行操作，然后点「上报最近
        60s」即可获得回放链接， 适合"发现问题再上报"的场景。
      </div>
      <div className={styles.demoGrid}>
        <div className={styles.formCard}>
          <Alert
            type="info"
            showIcon
            icon={<ClockCircleOutlined />}
            title="后台正在持续录制中"
            description="SDK 会自动维护最近 60 秒的录制缓冲，当前页面打开后即已开始。操作下方表单后直接上报即可。"
            style={{ marginBottom: 20 }}
          />
          <Form
            layout="horizontal"
            labelCol={{ span: 7 }}
            wrapperCol={{ span: 15 }}
          >
            <Form.Item label="账号类型">
              <Radio.Group defaultValue="cash" buttonStyle="solid">
                <Radio.Button value="cash">现金账户</Radio.Button>
                <Radio.Button value="margin">融资账户</Radio.Button>
                <Radio.Button value="ira">IRA</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item label="标的代码">
              <Space.Compact>
                <Input style={{ width: 40 }} disabled value="$" />
                <Input placeholder="如 AAPL" />
              </Space.Compact>
            </Form.Item>
            <Form.Item label="方向">
              <Radio.Group defaultValue="buy">
                <Radio value="buy">买入</Radio>
                <Radio value="sell">卖出</Radio>
                <Radio value="short">做空</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item label="委托数量">
              <Space.Compact>
                <InputNumber
                  min={1}
                  defaultValue={100}
                  style={{ width: 150 }}
                />
                <Input style={{ width: 40 }} disabled value="股" />
              </Space.Compact>
            </Form.Item>
            <Form.Item label="委托价格">
              <Space.Compact>
                <Input style={{ width: 40 }} disabled value="$" />
                <InputNumber
                  min={0}
                  step={0.01}
                  defaultValue={150.0}
                  style={{ width: 150 }}
                />
              </Space.Compact>
            </Form.Item>
            <Form.Item label="有效期">
              <Select
                defaultValue="day"
                style={{ width: 200 }}
                options={[
                  { value: 'day', label: '当日有效' },
                  { value: 'gtc', label: '撤销前有效 (GTC)' },
                  { value: 'ioc', label: '立即成交否则取消 (IOC)' },
                ]}
              />
            </Form.Item>
            <Form.Item label="备注">
              <TextArea rows={2} placeholder="备注信息..." />
            </Form.Item>
            <Form.Item wrapperCol={{ offset: 7 }}>
              <Button
                type="primary"
                onClick={() => message.success('委托已发出（演示）')}
              >
                提交委托
              </Button>
            </Form.Item>
          </Form>
        </div>
        {commonPanel}
      </div>
    </div>
  )

  // ─── Tab 3: 哨兵模式 ─────────────────────────────
  const SentinelTab = (
    <div className={styles.tabContent}>
      <div className={styles.demoDesc}>
        <strong>哨兵模式（errorPrompt）</strong>：检测到 HTTP
        错误（4xx/5xx）时， SDK 自动弹出提示引导用户<strong>一键上报</strong>
        最近 60 秒的录制现场，
        无需用户提前开录。点击下方按钮触发不同错误，观察右下角 FAB 附近的 toast
        弹出。
      </div>
      <div className={styles.demoGrid}>
        <div className={styles.sentinelDesc + ' ' + styles.formCard}>
          <div className={styles.panelTitle} style={{ marginBottom: 12 }}>
            <ThunderboltOutlined style={{ marginRight: 6, color: '#fa8c16' }} />
            触发错误请求（演示用）
          </div>
          <div className={styles.errBtnGroup} style={{ marginBottom: 20 }}>
            {([500, 503, 502, 408, 404] as number[]).map((code) => (
              <Button
                key={code}
                danger={code >= 500}
                icon={<AlertOutlined />}
                onClick={() => {
                  const xhr = new XMLHttpRequest()
                  xhr.open('GET', `/api/test-error?status=${code}`)
                  xhr.send()
                  message.info(`已发送 ${code} 请求，观察右下角 FAB 区域`)
                }}
              >
                触发 {code}
              </Button>
            ))}
          </div>

          <Divider />

          <div className={styles.panelTitle} style={{ marginBottom: 12 }}>
            模拟真实业务场景（下方操作会产生正常/异常请求）
          </div>
          <Form
            layout="horizontal"
            labelCol={{ span: 7 }}
            wrapperCol={{ span: 15 }}
          >
            <Form.Item label="提款金额">
              <Space.Compact>
                <Input style={{ width: 40 }} disabled value="$" />
                <InputNumber
                  min={0}
                  max={99999}
                  defaultValue={10000}
                  style={{ width: 160 }}
                />
              </Space.Compact>
            </Form.Item>
            <Form.Item label="提款账户">
              <Select
                defaultValue="bank1"
                style={{ width: '100%' }}
                options={[
                  { value: 'bank1', label: '工商银行 尾号 1234' },
                  { value: 'bank2', label: '招商银行 尾号 5678' },
                ]}
              />
            </Form.Item>
            <Form.Item label="验证码">
              <Space>
                <Input
                  placeholder="请输入 6 位验证码"
                  style={{ width: 160 }}
                  maxLength={6}
                />
                <Button
                  onClick={() => {
                    // 模拟发送验证码 → 触发 5xx
                    const xhr = new XMLHttpRequest()
                    xhr.open('POST', `/api/test-error?status=500`)
                    xhr.setRequestHeader('Content-Type', 'application/json')
                    xhr.send(JSON.stringify({ action: 'sendVerifyCode' }))
                    message.loading('发送中...', 1.5)
                  }}
                >
                  发送验证码
                </Button>
              </Space>
            </Form.Item>
            <Form.Item wrapperCol={{ offset: 7 }}>
              <Button
                type="primary"
                danger
                onClick={() => {
                  const xhr = new XMLHttpRequest()
                  xhr.open('POST', `/api/test-error?status=503`)
                  xhr.setRequestHeader('Content-Type', 'application/json')
                  xhr.send(JSON.stringify({ amount: 10000 }))
                  message.loading('提交中...', 2)
                }}
              >
                确认提款
              </Button>
            </Form.Item>
          </Form>

          <Divider />

          <Alert
            type="warning"
            showIcon
            title="触发错误后会发生什么？"
            description={
              <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2 }}>
                <li>SDK 拦截到 HTTP 错误响应（状态码 ≥ 400）</li>
                <li>右下角 FAB 旁弹出 toast：「检测到接口异常，一键上报」</li>
                <li>点击 toast 中的「一键上报」，自动上传最近 60s 录制现场</li>
                <li>获得可分享的回放链接</li>
              </ol>
            }
          />
        </div>
        {commonPanel}
      </div>
    </div>
  )

  const tabItems = [
    {
      key: 'manual',
      label: (
        <Space>
          <VideoCameraOutlined />
          手动录制
        </Space>
      ),
      children: ManualTab,
    },
    {
      key: 'recent',
      label: (
        <Space>
          <HistoryOutlined />
          最近回溯
        </Space>
      ),
      children: RecentTab,
    },
    {
      key: 'sentinel',
      label: (
        <Space>
          <AlertOutlined />
          哨兵模式
        </Space>
      ),
      children: SentinelTab,
    },
  ]

  return (
    <div className={styles.page}>
      {/* 顶部导航 */}
      <div className={styles.header}>
        <Link href="/" className={styles.headerBack}>
          <ArrowLeftOutlined />
          返回首页
        </Link>
        <div style={{ width: 1, height: 20, background: '#f0f0f0' }} />
        <div>
          <h1 className={styles.headerTitle}>Web Tape 体验中心</h1>
          <p className={styles.headerSub}>
            端到端演示录制 · 回溯 · 哨兵三大能力
          </p>
        </div>
        {sdkReady ? (
          <Tag color="green" style={{ marginLeft: 'auto' }}>
            SDK 已就绪
          </Tag>
        ) : (
          <Tag color="orange" style={{ marginLeft: 'auto' }}>
            SDK 加载中...
          </Tag>
        )}
      </div>

      {/* 主体 */}
      <div className={styles.body}>
        <Tabs
          defaultActiveKey="manual"
          className={styles.tabs}
          items={tabItems}
          size="large"
          tabBarStyle={{ padding: '0 16px', margin: 0 }}
        />
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>Web Tape</div>
        <div className={styles.footerStack}>
          <span>rrweb 2.0</span>
          <span>Next.js 16</span>
          <span>TypeScript</span>
          <span>Ant Design 6</span>
          <span>AI Workflow</span>
          <span>MIT</span>
        </div>
        <div className={styles.footerSign}>
          Built by <strong>Chern</strong> · 2026
        </div>
      </footer>

      {/* Web Tape SDK */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      {/* 使用者请替换成自己部署的 web-tape.iife.js CDN 地址 */}
      <script
        src="https://cdn.jsdelivr.net/gh/chernbo/webTape_SDK@master/dist/web-tape.iife.js"
        async
      />
    </div>
  )
}
