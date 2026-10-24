import { SendOutlined } from '@ant-design/icons'
import { Button, Collapse, DatePicker, Input, Segmented, Tag, Tooltip } from 'antd'
import type { Dayjs } from 'dayjs'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import Markdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import type { Artifact, ChatRole } from '../api/types'
import { HandoffPackage } from '../components/HandoffPackage'
import { MODE_COLLECTION, MODE_HANDOFF } from '../api/types'
import type { ChatMessage, ChatState, Speaker } from './reducer'
import { AgentTrace } from './TracePanel'
import { handledByOps } from '../lib/agents'
import { foldTraces, latestAgentTraceId } from './traceFold'

const SPEAKER_LABEL: Record<Speaker, string> = {
  operator: '运营',
  customer: '客户',
  agent: 'AI 坐席',
  human_agent: '人工坐席',
  assistant: '主控 Agent',
  system: '系统',
}

const ROLE_OPTIONS: { value: ChatRole; label: string }[] = [
  { value: 'operator', label: '运营' },
  { value: 'customer', label: '客户' },
  { value: 'agent', label: '坐席话术审核' },
  { value: 'human_agent', label: '人工坐席' },
]

const EXAMPLES: Record<ChatRole, (cid: string) => string[]> = {
  operator: (cid) => [`查询${cid}的欠款`, `看下${cid}的客户画像`, `现在能给${cid}打电话吗？`, `生成${cid}的催收报告`, '生成本月催收汇总报告'],
  customer: () => ['最近手头紧，能不能晚几天还？', '能不能分12期？', '我每个月最多还1500', '你们再打电话我就投诉', '给我转人工'],
  agent: () => ['您好，我是XX金融贷后专员，工号AI01，先核实一下您的身份。', '你今天不还，我们就上门找你家里人。', '我保证帮您申请全额减免。'],
  human_agent: () => ['您好，我是人工坐席，您刚才的情况我已经了解。', '我们可以为您登记下个月10号的还款计划。'],
}

const MODE_COLOR: Record<string, string> = {
  运营模式: 'default',
  催收对话模式: 'green',
  人工接管: 'red',
}

interface Props {
  state: ChatState
  customerId: string | null
  role: ChatRole
  onRole: (r: ChatRole) => void
  simTime: Dayjs | null
  onSimTime: (d: Dayjs | null) => void
  onSend: (text: string) => void
  onStart: () => void
  onEnd: () => void
  onFinishHandoff: () => void
  handoff: Artifact | null
}

export function ChatPanel(props: Props) {
  const { state, customerId, role, onRole, simTime, onSimTime, onSend, onStart, onEnd, onFinishHandoff, handoff } = props
  const [text, setText] = useState('')
  const bottom = useRef<HTMLDivElement>(null)
  const latest = latestAgentTraceId(state.messages, state.mode)
  const latestPending = Boolean(state.messages.find((m) => m.id === latest)?.pending)
  const [openTraces, setOpenTraces] = useState<Set<number>>(new Set())
  const prevTrace = useRef<{ id: number | null; pending: boolean }>({ id: null, pending: false })
  if (prevTrace.current.id !== latest || prevTrace.current.pending !== latestPending) {
    const next = foldTraces(openTraces, prevTrace.current, latest, latestPending)
    prevTrace.current = { id: latest, pending: latestPending }
    setOpenTraces(next)
  }
  const inSession = state.mode === MODE_COLLECTION || state.mode === MODE_HANDOFF
  const latestReply = [...state.messages].reverse().find((m) => (m.speaker === 'assistant' || m.speaker === 'agent') && !m.pending && m.text.trim())
  const [suggested, setSuggested] = useState<string[] | null>(null)

  useEffect(() => {
    if (!latestReply) {
      setSuggested(null)
      return
    }
    let cancelled = false
    const body = { reply: latestReply.text, role, customer_id: customerId, session_id: state.sessionId }
    void fetch('/api/suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(async (resp) => {
        if (!resp.ok) throw new Error('建议生成失败')
        return resp.json() as Promise<{ items: string[] }>
      })
      .then((data) => {
        if (!cancelled && data.items?.length) setSuggested(data.items.slice(0, 3))
      })
      .catch(() => {
        if (!cancelled) setSuggested(null)
      })
    return () => {
      cancelled = true
    }
  }, [latestReply?.id, latestReply?.text, role, customerId, state.sessionId])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [state.messages])

  const send = (value = text) => {
    const v = value.trim()
    if (!v || state.busy || state.readOnly) return
    onSend(v)
    setText('')
  }

  return (
    <div className="panel chat-col">
      <div className="panel-head chat-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="label">对话</span>
          <Tag color={MODE_COLOR[state.mode]}>{state.mode}</Tag>
          {state.sessionId && <span className="mono session-id">{state.sessionId}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Tooltip title="模拟当前时间（用于验证禁止外呼时段等）；留空使用系统时间">
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="MM-DD HH:mm"
              placeholder="模拟时间"
              value={simTime}
              onChange={onSimTime}
              size="small"
              style={{ width: 150 }}
            />
          </Tooltip>
          <Button size="small" type="primary" disabled={!customerId || inSession || state.busy} onClick={onStart}>
            发起催收
          </Button>
          <Button size="small" danger disabled={state.mode !== MODE_COLLECTION || state.busy} onClick={onEnd}>
            结束催收
          </Button>
        </div>
      </div>

      {state.mode === MODE_HANDOFF && (
        <div className="handoff-banner">
          <div className="handoff-title">
            <span className="stamp" style={{ color: 'var(--vermilion)' }}>
              人工接管中
            </span>
            <span>客户已收到过渡话术，请人工坐席继续沟通；话术同样经过合规审核。</span>
            <Button size="small" type="primary" danger onClick={onFinishHandoff}>
              完成处理
            </Button>
          </div>
          {handoff && (
            <Collapse
              size="small"
              ghost
              items={[{ key: 'p', label: '查看移交包', children: <HandoffPackage content={handoff.content} /> }]}
            />
          )}
        </div>
      )}

      {state.readOnly && <div className="readonly-banner">{state.readOnlyReason}</div>}

      <div className="chat-scroll">
        {state.messages.length === 0 && (
          <div className="chat-empty">
            <div className="serif" style={{ fontSize: 20 }}>主控 Agent 待命</div>
            <p>选择客户后，以运营身份查询画像、欠款、报告或发起催收。查询、报告、合规问答和话术审核由运营子 Agent 回答；催收对话由催收子 Agent 回复。也可以切换为客户直接进线。</p>
          </div>
        )}
        {state.messages.map((m) => (
          <Bubble
            key={m.id}
            m={m}
            mode={state.mode}
            traceOpen={openTraces.has(m.id)}
            onToggleTrace={() =>
              setOpenTraces((cur) => {
                const next = new Set(cur)
                if (next.has(m.id)) next.delete(m.id)
                else next.add(m.id)
                return next
              })
            }
          />
        ))}
        <div ref={bottom} />
      </div>

      <div className="composer">
        <div className="composer-bar">
          <Segmented size="small" value={role} onChange={(v) => onRole(v as ChatRole)} options={ROLE_OPTIONS} />
          <div className="examples">
            {(suggested ?? EXAMPLES[role](customerId ?? 'C0001')).map((e) => (
              <button key={e} onClick={() => setText(e)} disabled={state.busy || state.readOnly}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="composer-input">
          <Input.TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoSize={{ minRows: 2, maxRows: 5 }}
            disabled={state.readOnly}
            placeholder={
              state.readOnly
                ? state.readOnlyReason
                : `程序会判断说话人；判断不了时按「${ROLE_OPTIONS.find((r) => r.value === role)?.label}」处理。Enter 发送，Shift+Enter 换行`
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
          />
          <Button type="primary" icon={<SendOutlined />} loading={state.busy} disabled={state.readOnly} onClick={() => send()}>
            发送
          </Button>
        </div>
      </div>
    </div>
  )
}

function Bubble({
  m,
  mode,
  traceOpen,
  onToggleTrace,
}: {
  m: ChatMessage
  mode: string
  traceOpen: boolean
  onToggleTrace: () => void
}) {
  const side = m.speaker === 'operator' || m.speaker === 'customer' || m.speaker === 'human_agent' ? 'right' : 'left'
  const blocked = m.text.startsWith('[合规拦截]')
  const showTrace = (m.speaker === 'agent' && (m.trace !== undefined || m.turn != null)) || (Boolean(m.pending) && mode === MODE_COLLECTION)
  const cls = ['bubble', `bubble-${m.speaker}`, side, blocked ? 'blocked' : '', m.error ? 'error' : ''].join(' ')
  const body = (
    <div className={cls}>
        <div className="bubble-who">
          {m.speaker === 'assistant' && handledByOps(m.trace) ? '运营子 Agent' : SPEAKER_LABEL[m.speaker]}
          {m.speaker === 'agent' && !m.turn && ' · 待审核话术'}
          {m.turn?.system_intent && <span className="intent">{m.turn.system_intent}</span>}
          {m.replaced && (
            <Tooltip title="大模型回答出现了查询结果以外的数字，已改用事实稿">
              <Tag color="orange" style={{ marginLeft: 6 }}>
                已改用事实稿
              </Tag>
            </Tooltip>
          )}
        </div>
        {m.speaker === 'assistant' || m.pending ? (
          <div className="markdown bubble-text">
            <Markdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                a: ({ href, children }) =>
                  href?.startsWith('/') ? <Link to={href}>{children}</Link> : <a href={href}>{children}</a>,
              }}
            >
              {m.text || '…'}
            </Markdown>
            {m.pending && <span className="caret" />}
          </div>
        ) : (
          <div className="bubble-text">{m.text}</div>
        )}
    </div>
  )
  return (
    <div className={`bubble-row ${side}`}>
      {showTrace ? (
        <div className="agent-stack">
          <AgentTrace trace={m.trace ?? []} turn={m.turn} open={traceOpen} busy={Boolean(m.pending)} onToggle={onToggleTrace} />
          {body}
        </div>
      ) : (
        body
      )}
    </div>
  )
}