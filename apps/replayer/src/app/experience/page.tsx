'use client'

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
  VideoCameraOutlined,
  HistoryOutlined,
  AlertOutlined,
  SendOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import styles from './page.module.css'
import { useI18n, LanguageSwitch } from '../i18n'

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
  const { t } = useI18n()
  const cfg = {
    finished: { cls: styles.stateFinished, dot: '#52c41a', label: t('experience.stateIdle') },
    recording: { cls: styles.stateRecording, dot: '#ff4d4f', label: t('experience.stateRecording') },
    uploading: { cls: styles.stateUploading, dot: '#1890ff', label: t('experience.stateUploading') },
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
  const { t } = useI18n()
  return (
    <div className={styles.panelCard}>
      <div className={styles.panelTitle}>{t('experience.panelSdkState')}</div>
      <StateBadge state={state} />

      <Divider style={{ margin: '8px 0' }} />

      <div className={styles.panelTitle}>{t('experience.panelManualRecord')}</div>
      <Space orientation="vertical" style={{ width: '100%' }}>
        <Button
          type="primary"
          icon={<VideoCameraOutlined />}
          block
          disabled={state !== 'finished'}
          onClick={onManualStart}
        >
          {t('experience.btnStart')}
        </Button>
        <Button
          icon={<SendOutlined />}
          block
          disabled={state !== 'recording'}
          onClick={onManualStop}
        >
          {t('experience.btnStopSubmit')}
        </Button>
        <Button
          danger
          block
          disabled={state !== 'recording'}
          onClick={onDiscard}
        >
          {t('experience.btnDiscard')}
        </Button>
      </Space>

      <Divider style={{ margin: '8px 0' }} />

      <div className={styles.panelTitle}>{t('experience.panelBacktrack')}</div>
      <Tooltip title={t('experience.tooltipReportRecent')}>
        <Button
          icon={<HistoryOutlined />}
          block
          disabled={state !== 'finished'}
          onClick={onReportRecent}
        >
          {t('experience.btnReportRecent')}
        </Button>
      </Tooltip>

      {result && (
        <div className={styles.resultBox}>
          <div style={{ marginBottom: 6, fontWeight: 600, color: '#389e0d' }}>
            ✅ {t('experience.uploadSuccess')}
          </div>
          <Button
            type="link"
            size="small"
            style={{ padding: 0 }}
            onClick={() => window.open(result.url, '_blank', 'noopener')}
          >
            → {t('experience.viewReplay')}
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
  const { t } = useI18n()
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
      // 上传地址跟随当前 origin（体验页与回放服务同源），避免上传到 SDK 内置的 localhost 默认值
      // Upload URL follows the current origin (this page is same-origin with the replayer),
      // so it never falls back to the SDK's built-in localhost default.
      tape.configure({
        backgroundWindowMs: 60_000,
        errorPrompt: true,
        serverUrl: `${window.location.origin}/api/replayer`,
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
      message.warning(t('experience.msgSdkNotLoaded'))
      return
    }
    setLastResult(null)
    await tape.startRecord()
  }, [t])

  const handleStop = useCallback(async () => {
    const tape = getWebTape()
    if (!tape) return
    const r = await tape.stopRecord()
    if (r) {
      setLastResult(r)
      message.success(t('experience.msgUploadSuccess'))
    } else message.error(t('experience.msgUploadFailed'))
  }, [t])

  const handleDiscard = useCallback(() => {
    getWebTape()?.discardRecord()
    message.info(t('experience.msgDiscarded'))
  }, [t])

  const handleReportRecent = useCallback(async () => {
    const tape = getWebTape()
    if (!tape) return
    setLastResult(null)
    const r = await tape.reportRecent()
    if (r) {
      setLastResult(r)
      message.success(t('experience.msgBacktrackSuccess'))
    } else message.info(t('experience.msgNoBacktrack'))
  }, [t])

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
        <strong>{t('experience.manualDescTitle')}</strong>
        {t('experience.manualDesc')}
      </div>
      <div className={styles.demoGrid}>
        <div className={styles.formCard}>
          <Form
            layout="horizontal"
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 16 }}
          >
            <Form.Item label={t('experience.fName')}>
              <Input placeholder={t('experience.fNamePh')} />
            </Form.Item>
            <Form.Item label={t('experience.fNationality')} required>
              <Select
                placeholder={t('experience.fSelectPh')}
                options={[
                  { value: 'cn', label: t('experience.optCn') },
                  { value: 'us', label: t('experience.optUs') },
                  { value: 'sg', label: t('experience.optSg') },
                  { value: 'hk', label: t('experience.optHk') },
                ]}
              />
            </Form.Item>
            <Form.Item label={t('experience.fIdType')} required>
              <Select
                mode="multiple"
                placeholder={t('experience.fMultiPh')}
                options={[
                  { value: 'passport', label: t('experience.optPassport') },
                  { value: 'id', label: t('experience.optId') },
                  { value: 'hkid', label: t('experience.optHkid') },
                ]}
              />
            </Form.Item>
            <Form.Item label={t('experience.fAssets')}>
              <Space.Compact>
                <InputNumber
                  style={{ width: 180 }}
                  min={0}
                  step={10000}
                  placeholder="0"
                />
                <Input style={{ width: 60 }} disabled value={t('experience.unitYuan')} />
              </Space.Compact>
            </Form.Item>
            <Form.Item label={t('experience.fRisk')}>
              <Slider
                marks={{
                  0: t('experience.riskConservative'),
                  25: t('experience.riskSteady'),
                  50: t('experience.riskBalanced'),
                  75: t('experience.riskActive'),
                  100: t('experience.riskAggressive'),
                }}
                defaultValue={25}
              />
            </Form.Item>
            <Form.Item label={t('experience.fNotify')}>
              <Switch defaultChecked />
            </Form.Item>
            <Form.Item label={t('experience.fInvestPref')}>
              <Radio.Group defaultValue="stock">
                <Radio value="stock">{t('experience.optStock')}</Radio>
                <Radio value="fund">{t('experience.optFund')}</Radio>
                <Radio value="bond">{t('experience.optBond')}</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item label={t('experience.fMarket')} required>
              <Radio.Group defaultValue="us" buttonStyle="solid">
                <Radio.Button value="us">{t('experience.optUsStock')}</Radio.Button>
                <Radio.Button value="hk">{t('experience.optHkStock')}</Radio.Button>
                <Radio.Button value="a">{t('experience.optAStock')}</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item label={t('experience.fTradePerm')}>
              <Checkbox.Group
                options={[
                  t('experience.permSpot'),
                  t('experience.permMargin'),
                  t('experience.permOption'),
                  t('experience.permFuture'),
                ]}
                defaultValue={[t('experience.permSpot')]}
              />
            </Form.Item>
            <Form.Item label={t('experience.fRate')}>
              <Rate allowHalf defaultValue={3.5} />
            </Form.Item>
            <Form.Item label={t('experience.fRemark')}>
              <TextArea rows={3} placeholder={t('experience.fRemarkPh')} />
            </Form.Item>
            <Form.Item label={t('experience.fEffectiveDate')}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label={t('experience.fRemindTime')}>
              <TimePicker style={{ width: '100%' }} format="HH:mm" />
            </Form.Item>
            <Form.Item wrapperCol={{ offset: 6 }}>
              <Space>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={() => message.success(t('experience.msgFormSubmitted'))}
                >
                  {t('experience.btnSubmitAccount')}
                </Button>
                <Button>{t('experience.btnReset')}</Button>
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
        <strong>{t('experience.recentDescTitle')}</strong>
        {t('experience.recentDescPart1')}
        <strong>{t('experience.recentDescStrong')}</strong>
        {t('experience.recentDescPart2')}
      </div>
      <div className={styles.demoGrid}>
        <div className={styles.formCard}>
          <Alert
            type="info"
            showIcon
            icon={<ClockCircleOutlined />}
            title={t('experience.recentAlertTitle')}
            description={t('experience.recentAlertDesc')}
            style={{ marginBottom: 20 }}
          />
          <Form
            layout="horizontal"
            labelCol={{ span: 7 }}
            wrapperCol={{ span: 15 }}
          >
            <Form.Item label={t('experience.fAccountType')}>
              <Radio.Group defaultValue="cash" buttonStyle="solid">
                <Radio.Button value="cash">{t('experience.optCash')}</Radio.Button>
                <Radio.Button value="margin">{t('experience.optMarginAcc')}</Radio.Button>
                <Radio.Button value="ira">{t('experience.optIra')}</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item label={t('experience.fSymbol')}>
              <Space.Compact>
                <Input style={{ width: 40 }} disabled value="$" />
                <Input placeholder={t('experience.fSymbolPh')} />
              </Space.Compact>
            </Form.Item>
            <Form.Item label={t('experience.fDirection')}>
              <Radio.Group defaultValue="buy">
                <Radio value="buy">{t('experience.optBuy')}</Radio>
                <Radio value="sell">{t('experience.optSell')}</Radio>
                <Radio value="short">{t('experience.optShort')}</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item label={t('experience.fQty')}>
              <Space.Compact>
                <InputNumber
                  min={1}
                  defaultValue={100}
                  style={{ width: 150 }}
                />
                <Input style={{ width: 40 }} disabled value={t('experience.unitShare')} />
              </Space.Compact>
            </Form.Item>
            <Form.Item label={t('experience.fPrice')}>
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
            <Form.Item label={t('experience.fValidity')}>
              <Select
                defaultValue="day"
                style={{ width: 200 }}
                options={[
                  { value: 'day', label: t('experience.optDay') },
                  { value: 'gtc', label: t('experience.optGtc') },
                  { value: 'ioc', label: t('experience.optIoc') },
                ]}
              />
            </Form.Item>
            <Form.Item label={t('experience.fRemark')}>
              <TextArea rows={2} placeholder={t('experience.fRemarkPh2')} />
            </Form.Item>
            <Form.Item wrapperCol={{ offset: 7 }}>
              <Button
                type="primary"
                onClick={() => message.success(t('experience.msgOrderSent'))}
              >
                {t('experience.btnSubmitOrder')}
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
        <strong>{t('experience.sentinelDescTitle')}</strong>
        {t('experience.sentinelDescPart1')}
        <strong>{t('experience.sentinelDescStrong')}</strong>
        {t('experience.sentinelDescPart2')}
      </div>
      <div className={styles.demoGrid}>
        <div className={styles.sentinelDesc + ' ' + styles.formCard}>
          <div className={styles.panelTitle} style={{ marginBottom: 12 }}>
            <ThunderboltOutlined style={{ marginRight: 6, color: '#fa8c16' }} />
            {t('experience.triggerErrTitle')}
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
                  message.info(t('experience.msgErrSent', { code }))
                }}
              >
                {t('experience.triggerBtn', { code })}
              </Button>
            ))}
          </div>

          <Divider />

          <div className={styles.panelTitle} style={{ marginBottom: 12 }}>
            {t('experience.simulateTitle')}
          </div>
          <Form
            layout="horizontal"
            labelCol={{ span: 7 }}
            wrapperCol={{ span: 15 }}
          >
            <Form.Item label={t('experience.fWithdrawAmount')}>
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
            <Form.Item label={t('experience.fWithdrawAccount')}>
              <Select
                defaultValue="bank1"
                style={{ width: '100%' }}
                options={[
                  { value: 'bank1', label: t('experience.optBank1') },
                  { value: 'bank2', label: t('experience.optBank2') },
                ]}
              />
            </Form.Item>
            <Form.Item label={t('experience.fVerifyCode')}>
              <Space>
                <Input
                  placeholder={t('experience.fVerifyCodePh')}
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
                    message.loading(t('experience.msgSending'), 1.5)
                  }}
                >
                  {t('experience.btnSendCode')}
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
                  message.loading(t('experience.msgSubmitting'), 2)
                }}
              >
                {t('experience.btnConfirmWithdraw')}
              </Button>
            </Form.Item>
          </Form>

          <Divider />

          <Alert
            type="warning"
            showIcon
            title={t('experience.sentinelAlertTitle')}
            description={
              <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2 }}>
                <li>{t('experience.sentinelStep1')}</li>
                <li>{t('experience.sentinelStep2')}</li>
                <li>{t('experience.sentinelStep3')}</li>
                <li>{t('experience.sentinelStep4')}</li>
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
          {t('experience.tabManual')}
        </Space>
      ),
      children: ManualTab,
    },
    {
      key: 'recent',
      label: (
        <Space>
          <HistoryOutlined />
          {t('experience.tabRecent')}
        </Space>
      ),
      children: RecentTab,
    },
    {
      key: 'sentinel',
      label: (
        <Space>
          <AlertOutlined />
          {t('experience.tabSentinel')}
        </Space>
      ),
      children: SentinelTab,
    },
  ]

  return (
    <div className={styles.page}>
      {/* 顶部导航 */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>{t('experience.headerTitle')}</h1>
          <p className={styles.headerSub}>{t('experience.headerSub')}</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {sdkReady ? (
            <Tag color="green">{t('experience.sdkReady')}</Tag>
          ) : (
            <Tag color="orange">{t('experience.sdkLoading')}</Tag>
          )}
          <LanguageSwitch inline />
        </div>
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

      {/* Web Tape SDK —— 加载已发布的 npm 包 IIFE 产物（默认挂内置 FAB 供体验）
          load the published npm IIFE build (keeps the built-in FAB for the demo) */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script
        src="https://unpkg.com/@webtapejs/toolbox@0.1.3/dist/web-tape.iife.js"
        async
      />
    </div>
  )
}
