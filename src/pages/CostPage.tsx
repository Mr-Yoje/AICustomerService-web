import { Button, DatePicker, Empty, Table } from 'antd'
import type { Dayjs } from 'dayjs'
import { useState } from 'react'
import { useLoad } from '../lib/useLoad'
import './cost.css'

const { RangePicker } = DatePicker

interface Usage {
  calls: number
  unmetered: number
  prompt_tokens: number
  completion_tokens: number
  cache_hit_tokens: number
  cache_miss_tokens: number
  cost_cny: number
}

interface CostSession extends Usage {
  session_id: string | null
  customer_id: string | null
  started_at: string | null
}

interface PriceCard {
  cache_hit: number
  cache_miss: number
  output: number
}

interface CostReport {
  model: string
  currency: string
  unit: string
  off_peak: PriceCard
  peak: PriceCard
  peak_note: string
  summary: Usage
  sessions: CostSession[]
}

function cny(n: number): string {
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`
}

function tokens(n: number): string {
  return n.toLocaleString('zh-CN')
}

function priceLine(card: PriceCard): string {
  return `命中 ${card.cache_hit} · 未命中 ${card.cache_miss} · 输出 ${card.output}`
}

async function loadCosts(start: string, end: string): Promise<CostReport> {
  const q = new URLSearchParams()
  if (start) q.set('start', start)
  if (end) q.set('end', end)
  const resp = await fetch(`/api/costs?${q}`)
  if (!resp.ok) throw new Error('成本数据加载失败')
  return resp.json()
}

export function CostPage() {
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null)
  const start = range ? range[0].startOf('day').format('YYYY-MM-DDTHH:mm:ss') : ''
  const end = range ? range[1].endOf('day').format('YYYY-MM-DDTHH:mm:ss') : ''
  const report = useLoad(() => loadCosts(start, end), [start, end])
  const data = report.data

  return (
    <div className="page cost-page">
      <h1 className="page-title">
        成本
        <small>{data ? `${data.model} · 每百万 token（元）` : '按会话汇总 token 与费用'}</small>
      </h1>
      <div className="filters">
        <RangePicker value={range} onChange={(v) => setRange(v && v[0] && v[1] ? [v[0], v[1]] : null)} allowClear />
        <Button size="small" onClick={() => setRange(null)}>
          全部时间
        </Button>
        {report.error && <span className="hint">{report.error}</span>}
      </div>
      {data && (
        <>
          <div className="cost-prices">
            <span>闲时 {priceLine(data.off_peak)}</span>
            <span>高峰 {priceLine(data.peak)}</span>
            <span className="hint">{data.peak_note}</span>
          </div>
          <div className="cost-summary">
            <Stat label="调用" value={tokens(data.summary.calls)} extra={data.summary.unmetered ? `未记录 ${data.summary.unmetered}` : ''} />
            <Stat label="输入命中" value={tokens(data.summary.cache_hit_tokens)} />
            <Stat label="输入未命中" value={tokens(data.summary.cache_miss_tokens)} />
            <Stat label="输出" value={tokens(data.summary.completion_tokens)} />
            <Stat label="费用" value={cny(data.summary.cost_cny)} accent />
          </div>
          <div className="panel cost-table">
            <Table
              size="small"
              rowKey={(r) => r.session_id ?? 'none'}
              dataSource={data.sessions}
              pagination={false}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="这段时间没有模型调用" /> }}
              columns={[
                { title: '会话', dataIndex: 'session_id', render: (v: string | null) => <span className="mono">{v ?? '未归属'}</span> },
                { title: '客户', dataIndex: 'customer_id', render: (v: string | null) => <span className="mono">{v ?? '—'}</span> },
                { title: '调用', dataIndex: 'calls', align: 'right' },
                { title: '输入命中', dataIndex: 'cache_hit_tokens', align: 'right', render: tokens },
                { title: '输入未命中', dataIndex: 'cache_miss_tokens', align: 'right', render: tokens },
                { title: '输出', dataIndex: 'completion_tokens', align: 'right', render: tokens },
                { title: '费用', dataIndex: 'cost_cny', align: 'right', render: (v: number) => <span className="mono">{cny(v)}</span> },
                { title: '未记录', dataIndex: 'unmetered', align: 'right', render: (v: number) => (v ? <span className="mono">{v}</span> : '—') },
              ]}
            />
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, extra, accent }: { label: string; value: string; extra?: string; accent?: boolean }) {
  return (
    <div className={`cost-stat ${accent ? 'accent' : ''}`}>
      <div className="label">{label}</div>
      <div className="mono value">{value}</div>
      {extra && <div className="hint">{extra}</div>}
    </div>
  )
}
