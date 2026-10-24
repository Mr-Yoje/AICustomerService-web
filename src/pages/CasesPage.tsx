import { Empty, Input, Segmented, Select, Tag } from 'antd'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { api, unwrap } from '../api/client'
import { AuditView } from '../cases/AuditView'
import { CaseView } from '../cases/CaseView'
import { CASE_STATUSES, CASE_STATUS_COLOR } from '../cases/status'
import { useLoad } from '../lib/useLoad'
import { time } from '../lib/format'
import './cases.css'

export function CasesPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'audit' ? 'audit' : 'cases'
  return (
    <div className="page cases-page">
      <h1 className="page-title">
        案件与审计
        <Segmented
          size="small"
          value={tab}
          onChange={(v) => setParams(v === 'audit' ? { tab: 'audit' } : {})}
          options={[
            { value: 'cases', label: '案件' },
            { value: 'audit', label: '审计日志' },
          ]}
        />
        <small>{tab === 'audit' ? '三个检查点与运营操作的全部审计记录' : '每次催收会话的对话、报告、移交包与后置任务'}</small>
      </h1>
      {tab === 'audit' ? <AuditView /> : <Cases />}
    </div>
  )
}

function Cases() {
  const { caseId } = useParams()
  const navigate = useNavigate()
  const [cid, setCid] = useState('')
  const [cidQuery, setCidQuery] = useState('')
  const [status, setStatus] = useState<string>()
  const list = useLoad(
    () => unwrap(api.GET('/api/cases', { params: { query: { customer_id: cidQuery, status: status ?? '' } } })),
    [cidQuery, status],
  )

  return (
    <div className="cases-grid">
      <div className="panel case-list-panel">
        <div className="panel-head">
          <span className="label">案件</span>
          <span className="mono hint" style={{ margin: 0 }}>
            {list.data?.length ?? 0} 件
          </span>
        </div>
        <div className="filters" style={{ padding: '10px 12px 4px' }}>
          <Input.Search
            allowClear
            size="small"
            placeholder="客户编号"
            value={cid}
            onChange={(e) => setCid(e.target.value)}
            onSearch={(v) => setCidQuery(v.trim())}
            style={{ width: 130 }}
          />
          <Select
            allowClear
            size="small"
            placeholder="状态"
            value={status}
            onChange={setStatus}
            style={{ width: 110 }}
            options={CASE_STATUSES.map((s) => ({ value: s, label: s }))}
          />
        </div>
        <div className="case-list">
          {list.data?.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无案件，可在对话台发起催收" />}
          {list.data?.map((c) => (
            <button key={c.case_id} className={`case-item ${c.case_id === caseId ? 'on' : ''}`} onClick={() => navigate(`/cases/${c.case_id}`)}>
              <div className="case-item-top">
                <span className="mono">{c.case_id}</span>
                <Tag color={CASE_STATUS_COLOR[c.status]}>{c.status}</Tag>
              </div>
              <div className="case-item-sub">
                <b className="mono">{c.customer_id}</b> · {c.pack_id} · {time(c.updated_at)}
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="case-detail-col">
        {caseId ? (
          <CaseView key={caseId} caseId={caseId} onChanged={() => void list.reload()} />
        ) : (
          <div className="panel">
            <Empty style={{ padding: 60 }} description="从左侧选择一个案件查看详情" />
          </div>
        )}
      </div>
    </div>
  )
}
