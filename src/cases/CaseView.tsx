import { App, Button, Empty, Popconfirm, Segmented, Table, Tabs, Tag } from 'antd'
import { useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api, unwrap } from '../api/client'
import type { Artifact, Todo } from '../api/types'
import { HandoffPackage } from '../components/HandoffPackage'
import { useLoad } from '../lib/useLoad'
import { time } from '../lib/format'
import { CASE_STATUS_COLOR } from './status'
import { SessionView } from './SessionView'

export function CaseView({ caseId, onChanged }: { caseId: string; onChanged: () => void }) {
  const { message } = App.useApp()
  const c = useLoad(() => unwrap(api.GET('/api/cases/{case_id}', { params: { path: { case_id: caseId } } })), [caseId])
  const [picked, setSid] = useState<string | null>(null)

  const sessions = c.data?.sessions ?? []
  const sid = sessions.some((s) => s.session_id === picked) ? picked : (sessions.at(-1)?.session_id ?? null)

  if (c.error) return <Empty description={c.error} />
  if (!c.data) return <div className="hint">加载中…</div>
  const { case: kase, artifacts, todos } = c.data
  const reports = artifacts.filter((a) => a.kind === '催收报告')
  const handoffs = artifacts.filter((a) => a.kind === '移交包')

  const archive = async () => {
    try {
      await unwrap(api.POST('/api/cases/{case_id}/archive', { params: { path: { case_id: caseId } } }))
      message.success('案件已归档')
      void c.reload()
      onChanged()
    } catch (e) {
      message.error(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="panel case-view">
      <div className="panel-head">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="label mono">{kase.case_id}</span>
          <Tag color={CASE_STATUS_COLOR[kase.status]}>{kase.status}</Tag>
          <span className="hint" style={{ margin: 0 }}>
            客户 <b className="mono">{kase.customer_id}</b> · 业务包 {kase.pack_id} · 创建 {time(kase.created_at)} · 更新 {time(kase.updated_at)}
          </span>
        </div>
        <Popconfirm title="归档后案件不再出现在待办流程中，确认归档？" onConfirm={() => void archive()} disabled={kase.status === '已归档'}>
          <Button size="small" disabled={kase.status === '已归档'}>
            {kase.status === '已归档' ? '已归档' : '归档'}
          </Button>
        </Popconfirm>
      </div>
      <Tabs
        className="case-tabs"
        items={[
          {
            key: 'sessions',
            label: `会话 ${sessions.length}`,
            children: sessions.length ? (
              <>
                {sessions.length > 1 && (
                  <Segmented
                    size="small"
                    value={sid ?? undefined}
                    onChange={(v) => setSid(String(v))}
                    options={sessions.map((s) => ({ value: s.session_id, label: `${s.session_id} · ${time(s.started_at)}` }))}
                    style={{ marginBottom: 10 }}
                  />
                )}
                {sid && <SessionView key={sid} sessionId={sid} />}
              </>
            ) : (
              <Empty description="尚无会话" />
            ),
          },
          { key: 'report', label: `催收报告 ${reports.length}`, children: <Reports items={reports} /> },
          {
            key: 'handoff',
            label: `移交包 ${handoffs.length}`,
            children: handoffs.length ? (
              handoffs.map((h) => (
                <div key={h.artifact_id} style={{ marginBottom: 12 }}>
                  <div className="hint mono">
                    {h.artifact_id} · {time(h.created_at)}
                  </div>
                  <HandoffPackage content={h.content} />
                </div>
              ))
            ) : (
              <Empty description="本案件未转人工" />
            ),
          },
          { key: 'todos', label: `待办 ${todos.length}`, children: <Todos items={todos} /> },
        ]}
      />
    </div>
  )
}

function Reports({ items }: { items: Artifact[] }) {
  if (!items.length) return <Empty description="会话结束后自动生成催收报告" />
  return (
    <>
      {items.map((r) => {
        const md = (r.content as { markdown?: string } | null)?.markdown
        return (
          <div key={r.artifact_id} className="report">
            <div className="hint mono">
              {r.artifact_id} · {time(r.created_at)}
            </div>
            {md ? (
              <div className="markdown">
                <Markdown remarkPlugins={[remarkGfm]}>{md}</Markdown>
              </div>
            ) : (
              <pre className="pkg-val">{JSON.stringify(r.content, null, 2)}</pre>
            )}
          </div>
        )
      })}
    </>
  )
}

function Todos({ items }: { items: Todo[] }) {
  return (
    <Table<Todo>
      size="small"
      rowKey="todo_id"
      pagination={false}
      dataSource={items}
      locale={{ emptyText: '暂无待办' }}
      columns={[
        { title: '类型', dataIndex: 'kind', width: 96, render: (v: string) => <Tag>{v}</Tag> },
        { title: '内容', dataIndex: 'content' },
        { title: '截止', dataIndex: 'due', width: 140, render: time },
        { title: '状态', dataIndex: 'status', width: 80 },
        { title: '会话', dataIndex: 'session_id', width: 110, render: (v: string | null) => <span className="mono">{v ?? '—'}</span> },
      ]}
    />
  )
}
