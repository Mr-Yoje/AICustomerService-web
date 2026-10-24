import type { ChatRole, MainTurn, TraceEvent } from '../api/types'
import { MODE_COLLECTION, MODE_HANDOFF, MODE_OPERATOR } from '../api/types'
import type { SSEMessage } from '../api/sse'

/** assistant 为对运营的回答（查询与合规由运营子 Agent 生成，路由与结束催收由主控生成）；agent 为 AI 坐席对客户的回复 */
export type Speaker = 'operator' | 'customer' | 'agent' | 'human_agent' | 'assistant' | 'system'

/** 本轮大模型调用合计。没有调用时不挂到消息上。 */
export interface ReplyUsage {
  prompt_tokens: number
  completion_tokens: number
  cache_hit_tokens: number
}

export function replyUsage(turn: { usage?: ReplyUsage | null }): ReplyUsage | undefined {
  const usage = turn.usage
  if (!usage) return undefined
  return {
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    cache_hit_tokens: usage.cache_hit_tokens,
  }
}

export interface ChatMessage {
  id: number
  speaker: Speaker
  text: string
  pending?: boolean
  replaced?: boolean
  error?: boolean
  /** 与 turn 同属这一轮；只有 AI 坐席回复在界面上展开 */
  trace?: TraceEvent[]
  turn?: MainTurn
  usage?: ReplyUsage
}

export interface ChatState {
  sessionId: string | null
  mode: string
  messages: ChatMessage[]
  trace: TraceEvent[]
  lastTurn: MainTurn | null
  busy: boolean
  nextId: number
  readOnly: boolean
  readOnlyReason: string
}

export const initialChat: ChatState = {
  sessionId: null,
  mode: MODE_OPERATOR,
  messages: [],
  trace: [],
  lastTurn: null,
  busy: false,
  nextId: 1,
  readOnly: false,
  readOnlyReason: '',
}

export type ChatAction =
  | { type: 'send'; role: ChatRole; text: string }
  | { type: 'event'; msg: SSEMessage }
  | { type: 'fail'; message: string }
  | { type: 'session'; sessionId: string | null; mode: string; readOnly?: boolean; readOnlyReason?: string }
  | { type: 'notice'; text: string }
  | { type: 'load'; sessionId: string; mode: string; readOnly: boolean; readOnlyReason: string; messages: ChatMessage[] }
  | { type: 'reset' }

function updateReply(state: ChatState, patch: (m: ChatMessage) => ChatMessage): ChatState {
  const messages = [...state.messages]
  const idx = messages.length - 1
  if (idx < 0 || !messages[idx].pending) return state
  messages[idx] = patch(messages[idx])
  return { ...state, messages }
}

export const HUMAN_SENT = '合规通过，已发送给客户'

/** 人工坐席合规话术的回复就是原话，界面改为一条确认提示，避免重复显示 */
function humanSent(turn: MainTurn): boolean {
  return turn.speaker === 'agent' && turn.mode === MODE_HANDOFF && turn.hit_rules.length === 0
}

/** 发给客户的 AI 坐席回复，含发起催收后的开场白（主控以运营身份发起，模式已切入催收对话）。 */
export function isSeatReply(turn: MainTurn): boolean {
  if (turn.mode === MODE_COLLECTION && turn.speaker === 'operator') return true
  if (turn.speaker === 'customer') return !(turn.mode === MODE_HANDOFF && !turn.handoff)
  return false
}

function replySpeaker(turn: MainTurn): Speaker {
  if (isSeatReply(turn)) return 'agent'
  return humanSent(turn) ? 'system' : 'assistant'
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'send': {
      const id = state.nextId
      return {
        ...state,
        busy: true,
        trace: [],
        nextId: id + 2,
        messages: [
          ...state.messages,
          { id, speaker: action.role, text: action.text },
          { id: id + 1, speaker: 'system', text: '', pending: true, trace: [] },
        ],
      }
    }
    case 'event': {
      const { event, data } = action.msg
      if (event === 'trace') {
        const ev = data as TraceEvent
        return updateReply({ ...state, trace: [...state.trace, ev] }, (m) => ({ ...m, trace: [...(m.trace ?? []), ev] }))
      }
      if (event === 'delta') return updateReply(state, (m) => ({ ...m, text: m.text + (data as { text: string }).text }))
      if (event === 'replace')
        return updateReply(state, (m) => ({ ...m, text: (data as { text: string }).text, replaced: true }))
      if (event === 'error') return chatReducer(state, { type: 'fail', message: (data as { message: string }).message })
      if (event === 'done') {
        const turn = data as MainTurn
        const next = updateReply(state, (m) => ({
          ...m,
          text: humanSent(turn) ? HUMAN_SENT : turn.reply,
          pending: false,
          speaker: replySpeaker(turn),
          turn,
          usage: replyUsage(turn),
        }))
        return {
          ...next,
          busy: false,
          lastTurn: turn,
          sessionId: turn.session_id ?? state.sessionId,
          mode: turn.mode ?? state.mode,
        }
      }
      return state
    }
    case 'fail': {
      const next = updateReply(state, (m) => ({ ...m, text: action.message, pending: false, error: true }))
      return { ...next, busy: false }
    }
    case 'session':
      return {
        ...state,
        sessionId: action.sessionId,
        mode: action.mode,
        readOnly: action.readOnly ?? false,
        readOnlyReason: action.readOnlyReason ?? '',
      }
    case 'notice': {
      const id = state.nextId
      return { ...state, nextId: id + 1, messages: [...state.messages, { id, speaker: 'system', text: action.text }] }
    }
    case 'load':
      return {
        ...initialChat,
        sessionId: action.sessionId,
        mode: action.mode,
        readOnly: action.readOnly,
        readOnlyReason: action.readOnlyReason,
        messages: action.messages,
        nextId: action.messages.length + 1,
      }
    case 'reset':
      return initialChat
  }
}
