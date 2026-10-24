import { App, Input, Modal } from 'antd'
import type { Dayjs } from 'dayjs'
import { useCallback, useReducer, useRef, useState } from 'react'
import { api, unwrap } from '../api/client'
import { streamChat } from '../api/sse'
import type { ChatRole } from '../api/types'
import { MODE_COLLECTION, MODE_HANDOFF, MODE_OPERATOR } from '../api/types'
import { ChatPanel } from '../chat/ChatPanel'
import { CustomerPanel } from '../chat/CustomerPanel'
import { chatReducer, initialChat } from '../chat/reducer'
import { TracePanel } from '../chat/TracePanel'
import { useLoad } from '../lib/useLoad'
import './chat.css'

const DEFAULT_ROLE: Record<string, ChatRole> = {
  [MODE_OPERATOR]: 'operator',
  [MODE_COLLECTION]: 'customer',
  [MODE_HANDOFF]: 'human_agent',
}

export function ChatPage() {
  const { message } = App.useApp()
  const [state, dispatch] = useReducer(chatReducer, initialChat)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [picked, setPicked] = useState<{ mode: string; role: ChatRole } | null>(null)
  const [simTime, setSimTime] = useState<Dayjs | null>(null)
  const [finishOpen, setFinishOpen] = useState(false)
  const [conclusion, setConclusion] = useState('')
  const abort = useRef<AbortController | null>(null)

  const customer = useLoad(
    () => (customerId ? unwrap(api.GET('/api/customers/{customer_id}', { params: { path: { customer_id: customerId } } })) : undefined),
    [customerId],
  )
  const session = useLoad(
    () => (state.sessionId ? unwrap(api.GET('/api/sessions/{session_id}', { params: { path: { session_id: state.sessionId } } })) : undefined),
    [state.sessionId, state.lastTurn],
  )

  const role: ChatRole = picked?.mode === state.mode ? picked.role : (DEFAULT_ROLE[state.mode] ?? 'operator')
  const setRole = (r: ChatRole) => setPicked({ mode: state.mode, role: r })

  const now = simTime ? simTime.format('YYYY-MM-DDTHH:mm:ss') : null
  const activeSession = state.mode === MODE_OPERATOR ? null : state.sessionId

  const send = useCallback(
    async (text: string, asRole: ChatRole = role) => {
      dispatch({ type: 'send', role: asRole, text })
      abort.current = new AbortController()
      try {
        await streamChat(
          { text, role: asRole, session_id: activeSession, customer_id: customerId, now },
          (msg) => dispatch({ type: 'event', msg }),
          abort.current.signal,
        )
      } catch (e) {
        dispatch({ type: 'fail', message: `连接中断：${e instanceof Error ? e.message : String(e)}，请重试` })
      }
      void customer.reload()
    },
    [role, activeSession, customerId, now, customer],
  )

  const selectCustomer = (cid: string) => {
    if (cid === customerId) return
    abort.current?.abort()
    dispatch({ type: 'reset' })
    setCustomerId(cid)
  }

  const end = async () => {
    if (!state.sessionId) return
    try {
      await unwrap(api.POST('/api/sessions/{session_id}/end', { params: { path: { session_id: state.sessionId } }, body: { reason: '运营结束', now } }))
      dispatch({ type: 'session', sessionId: state.sessionId, mode: MODE_OPERATOR })
      dispatch({ type: 'notice', text: `会话 ${state.sessionId} 已结束，后置任务（通话记录、画像更新、催收报告、待办）已提交，可在案件审计中查看。` })
      void customer.reload()
    } catch (e) {
      message.error(e instanceof Error ? e.message : String(e))
    }
  }

  const finish = async () => {
    if (!state.sessionId || !conclusion.trim()) return
    try {
      await unwrap(
        api.POST('/api/sessions/{session_id}/handoff/finish', {
          params: { path: { session_id: state.sessionId } },
          body: { conclusion: conclusion.trim(), now },
        }),
      )
      setFinishOpen(false)
      setConclusion('')
      dispatch({ type: 'session', sessionId: state.sessionId, mode: MODE_OPERATOR })
      dispatch({ type: 'notice', text: `人工处理完成，结论已回写案件，会话交还主控（运营模式）。` })
      void customer.reload()
    } catch (e) {
      message.error(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="page chat-page">
      <CustomerPanel selected={customerId} onSelect={selectCustomer} detail={customer.data} loading={customer.loading} />
      <ChatPanel
        state={state}
        customerId={customerId}
        role={role}
        onRole={setRole}
        simTime={simTime}
        onSimTime={setSimTime}
        onSend={(t) => void send(t)}
        onStart={() => customerId && void send(`对${customerId}发起催收`, 'operator')}
        onEnd={() => void end()}
        onFinishHandoff={() => setFinishOpen(true)}
        handoff={state.mode === MODE_HANDOFF ? (session.data?.handoff ?? null) : null}
      />
      <TracePanel trace={state.trace} turn={state.lastTurn} busy={state.busy} />
      <Modal
        title="完成人工处理"
        open={finishOpen}
        onOk={() => void finish()}
        okText="提交结论"
        okButtonProps={{ disabled: !conclusion.trim() }}
        onCancel={() => setFinishOpen(false)}
      >
        <p style={{ color: 'var(--muted)' }}>结论将写入案件，并触发通话记录、画像更新、报告与待办等后置任务。</p>
        <Input.TextArea
          rows={4}
          value={conclusion}
          onChange={(e) => setConclusion(e.target.value)}
          placeholder="例如：客户同意下月10号还款 3000 元，已登记承诺"
        />
      </Modal>
    </div>
  )
}
