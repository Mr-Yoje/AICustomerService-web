import { SearchOutlined } from '@ant-design/icons'
import { Empty, Input, Progress, Skeleton, Tag, Tooltip } from 'antd'
import { useState } from 'react'
import { api, unwrap } from '../api/client'
import type { CustomerDetail } from '../api/types'
import { levelColor, money } from '../lib/format'
import { useLoad } from '../lib/useLoad'

interface Props {
  selected: string | null
  onSelect: (customerId: string) => void
  detail: CustomerDetail | undefined
  loading: boolean
}

export function CustomerPanel({ selected, onSelect, detail, loading }: Props) {
  const [q, setQ] = useState('')
  const list = useLoad(() => unwrap(api.GET('/api/customers', { params: { query: { q } } })), [q])

  return (
    <div className="customer-col">
      <div className="panel">
        <div className="panel-head">
          <span className="label">客户</span>
          <span className="mono" style={{ color: 'var(--muted)', fontSize: 12 }}>
            {list.data?.length ?? 0} 位
          </span>
        </div>
        <div className="panel-body" style={{ paddingBottom: 8 }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="编号 / 职业 / 地区"
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="customer-list">
          {list.data?.map((c) => (
            <button
              key={c.customer_id}
              className={`customer-item ${selected === c.customer_id ? 'on' : ''}`}
              onClick={() => onSelect(c.customer_id)}
            >
              <span className="mono cid">{c.customer_id}</span>
              <span className="meta">
                {c.occupation} · {c.region}
              </span>
              <span className="mono owe">{c.overdue_count ? money(c.overdue_amount) : '无逾期'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head">
          <span className="label">客户档案</span>
          {detail && <span className="mono">{detail.customer_id}</span>}
        </div>
        <div className="panel-body">
          {!selected && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="从上方选择客户" />}
          {selected && loading && !detail && <Skeleton active />}
          {detail && <CustomerCard detail={detail} />}
        </div>
      </div>
    </div>
  )
}

function CustomerCard({ detail }: { detail: CustomerDetail }) {
  const p = detail.profile as Record<string, string | number | null>
  const w = detail.willingness
  return (
    <>
      <dl className="kv">
        <dt>姓名</dt>
        <dd>{p.customer_name}</dd>
        <dt>年龄职业</dt>
        <dd>
          {p.age} 岁 · {p.occupation}
        </dd>
        <dt>地区</dt>
        <dd>{p.region}</dd>
        <dt>月收入</dt>
        <dd className="mono">{money(p.monthly_income as number)}</dd>
        <dt>信用</dt>
        <dd>
          <span className="mono">{p.credit_score}</span> 分 · 等级 {p.customer_level}
        </dd>
      </dl>

      {w && (
        <div className="willingness">
          <Progress
            type="dashboard"
            size={86}
            percent={w.score}
            strokeColor={levelColor(w.level)}
            format={(v) => <span className="mono">{v}</span>}
          />
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>对话前还款意愿</div>
            <span className="stamp" style={{ color: levelColor(w.level) }}>
              意愿{w.level}
            </span>
            <div style={{ fontSize: 12, marginTop: 4, color: 'var(--muted)' }}>置信度 {w.confidence}</div>
            {w.needs_review && (
              <Tooltip title={w.review_reasons.join('；')}>
                <Tag color="orange" style={{ marginTop: 4 }}>
                  需人工复核
                </Tag>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      <div className="sub-title">逾期（按处理优先级）</div>
      {detail.overdues.items.length === 0 && <div style={{ color: 'var(--muted)' }}>无逾期记录</div>}
      <ol className="overdue-list">
        {detail.overdues.items.map((o) => (
          <li key={o.overdue_id}>
            <span className="mono">{o.overdue_id}</span>
            <span>{o.loan_type ?? '未知类型'}</span>
            <span className="mono">{o.overdue_days} 天</span>
            <span className="mono">{money(o.overdue_amount)}</span>
            {o.owner_conflict && (
              <Tooltip title="该逾期记录关联的贷款属于其他客户">
                <Tag color="orange">数据冲突</Tag>
              </Tooltip>
            )}
          </li>
        ))}
      </ol>
      {detail.overdues.items.length > 0 && <div className="hint">{detail.overdues.suggestion}</div>}
    </>
  )
}
