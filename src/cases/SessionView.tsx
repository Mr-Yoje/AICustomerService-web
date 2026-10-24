import { App, Button, Input, Modal, Popconfirm, Table, Tag, Tooltip } from 'antd'
import { useState } from 'react'
import { api, unwrap } from '../api/client'
import type { MemoryItem, PostTask, SessionDetail } from '../api/types'
import { useLoad } from '../lib/useLoad'
import { STATUS_COLOR, short, time } from '../lib/format'

const TASK_LABEL: Record<string, string> = {
  write_behavior: '写入催收行为',
  write_call_record: '写入通话记录',
  write_emotion: '写入情绪记录',
  generate_report: '生成催收报告',
  refresh_profile: '更新客户画像',
  create_todos: '生成待办',
}

const ROLE_SIDE: Record<string, 'left' | 'right'> = { 客户: 'right' }

export function SessionView({ sessionId }: { sessionId: string }) {
  const { message } = App.useApp()
  const s = useLoad(
    () => unwrap(api.GET('/api/sessions/{session_id}', { params: { path: { session_id: sessionId } } })),
    [sessionId],
  )
  if (s.error) return <div className="hint">{s.error}</div>
  if (!s.data) return <div className="hint">加载中…</div>
  const d = s.data

  const retry = async (name?: string) => {
    try {
      await unwrap(api.POST('/api/sessions/{session_id}/postcall/retry', { params: { path: { session_id: sessionId } }, body: { name } }))
      message.success(name ? `已重试：${TASK_LABEL[name] ?? name}` : '已重试全部失败任务')
      void s.reload()
    } catch (e) {
      message.error(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="session-view">
      <dl className="kv session-meta">
        <dt>会话</dt>
        <dd className="mono">{d.session.session_id}</dd>
        <dt>渠道</dt>
        <dd>{d.session.channel ?? '—'}</dd>
        <dt>起止</dt>
        <dd>
          {time(d.session.started_at)} → {time(d.session.ended_at)}
        </dd>
        <dt>结束原因</dt>
        <dd>{d.session.end_reason ?? '进行中'}</dd>
        <dt>配置版本</dt>
        <dd className="mono">{d.session.config_version ?? '—'}</dd>
      </dl>

      <div className="sub-title">对话记录</div>
      <Transcript messages={d.messages} />

      <div className="sub-title">
        后置任务
        {d.postcall.some((t) => t.status === '失败') && (
          <Button size="small" style={{ marginLeft: 8 }} onClick={() => void retry()}>
            重试全部失败
          </Button>
        )}
      </div>
      <PostcallTable tasks={d.postcall} onRetry={(n) => void retry(n)} />

      <div className="sub-title">会话记忆</div>
      <MemoryTable sessionId={sessionId} memory={d.memory} onChanged={() => void s.reload()} />
    </div>
  )
}

function Transcript({ messages }: { messages: SessionDetail['messages'] }) {
  if (!messages.length) return <div className="hint">暂无对话</div>
  return (
    <div className="transcript">
      {messages.map((m) => {
        const intent = (m.meta as { intent?: string }).intent
        return (
          <div key={m.turn} className={`t-row ${ROLE_SIDE[m.role] ?? 'left'}`}>
            <div className="t-who">
              <span className="mono">#{m.turn}</span> {m.role}
              {intent && <Tag style={{ marginLeft: 6 }}>{intent}</Tag>}
            </div>
            <div className="t-text">{m.text}</div>
          </div>
        )
      })}
    </div>
  )
}

function PostcallTable({ tasks, onRetry }: { tasks: PostTask[]; onRetry: (name: string) => void }) {
  return (
    <Table<PostTask>
      size="small"
      rowKey="name"
      pagination={false}
      dataSource={tasks}
      locale={{ emptyText: '会话尚未结束，暂无后置任务' }}
      columns={[
        { title: '阶段', dataIndex: 'stage', width: 56 },
        { title: '任务', dataIndex: 'name', render: (n: string) => TASK_LABEL[n] ?? n },
        { title: '状态', dataIndex: 'status', width: 72, render: (v: string) => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
        { title: '次数', dataIndex: 'attempts', width: 56 },
        {
          title: '',
          width: 120,
          render: (_, t) =>
            t.status === '失败' ? (
              <span>
                <Tooltip title={t.error}>
                  <span className="hint" style={{ marginRight: 6 }}>
                    {short(t.error ?? '', 10)}
                  </span>
                </Tooltip>
                <Button size="small" type="link" onClick={() => onRetry(t.name)}>
                  重试
                </Button>
              </span>
            ) : null,
        },
      ]}
    />
  )
}

function display(v: unknown): string {
  return typeof v === 'string' ? v : JSON.stringify(v)
}

function MemoryTable({ sessionId, memory, onChanged }: { sessionId: string; memory: Record<string, MemoryItem>; onChanged: () => void }) {
  const { message } = App.useApp()
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const rows = Object.entries(memory).map(([key, m]) => ({ key, ...m }))
  const path = (key: string) => ({ path: { scope: 'session', owner_id: sessionId, key } })

  const save = async () => {
    if (!editing) return
    let value: unknown = draft
    try {
      value = JSON.parse(draft)
    } catch {
      /* 非 JSON 时按字符串保存 */
    }
    try {
      await unwrap(api.PUT('/api/memory/{scope}/{owner_id}/{key}', { params: path(editing), body: { value, operator: '运营' } }))
      message.success(`已纠正记忆：${editing}`)
      setEditing(null)
      onChanged()
    } catch (e) {
      message.error(e instanceof Error ? e.message : String(e))
    }
  }

  const clear = async (key: string) => {
    try {
      await unwrap(api.DELETE('/api/memory/{scope}/{owner_id}/{key}', { params: path(key) }))
      message.success(`已清除记忆：${key}`)
      onChanged()
    } catch (e) {
      message.error(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <>
      <Table
        size="small"
        rowKey="key"
        pagination={false}
        dataSource={rows}
        locale={{ emptyText: '暂无会话记忆' }}
        columns={[
          { title: '键', dataIndex: 'key', width: 120, render: (k: string) => <span className="mono">{k}</span> },
          {
            title: '值',
            dataIndex: 'value',
            render: (v: unknown) => (
              <Tooltip title={<pre className="pkg-val">{JSON.stringify(v, null, 2)}</pre>}>
                <span>{short(v, 60)}</span>
              </Tooltip>
            ),
          },
          { title: '来源', dataIndex: 'source', width: 96 },
          { title: '更新', dataIndex: 'updated_at', width: 140, render: time },
          {
            title: '',
            width: 104,
            render: (_, r) => (
              <span>
                <Button
                  size="small"
                  type="link"
                  onClick={() => {
                    setEditing(r.key)
                    setDraft(typeof r.value === 'string' ? r.value : JSON.stringify(r.value, null, 2))
                  }}
                >
                  纠正
                </Button>
                <Popconfirm title={`清除记忆「${r.key}」？`} onConfirm={() => void clear(r.key)}>
                  <Button size="small" type="link" danger>
                    清除
                  </Button>
                </Popconfirm>
              </span>
            ),
          },
        ]}
      />
      <Modal title={`纠正记忆：${editing ?? ''}`} open={editing !== null} onOk={() => void save()} okText="保存" onCancel={() => setEditing(null)}>
        <p className="hint">支持 JSON（数组、对象、数字、布尔）；无法解析时按文本保存。纠正操作会写入审计日志。</p>
        <Input.TextArea className="mono" rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} />
        {editing && memory[editing] && <p className="hint">原值：{display(memory[editing].value)}</p>}
      </Modal>
    </>
  )
}
