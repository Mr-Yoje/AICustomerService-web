import type { ChatRole, MainTurn, TraceEvent } from '../api/types'
import { MODE_HANDOFF, MODE_OPERATOR } from '../api/types'
import type { SSEMessage } from '../api/sse'

/** assistant 为主控对运营的回答；agent 为 AI 坐席对客户的回复 */
export type Speaker = 'operator' | 'customer' | 'agent' | 'human_agent' | 'assistant' | 'system'

export interface ChatMessage {
  id: number
  speaker: Speaker
  text: string
  pending?: boolean
  replaced?: boolean
  error?: boolean
  turn?: MainTurn
}

export interface ChatState {
  sessionId: string | null
  mode: string
  messages: ChatMessage[]
  trace: TraceEvent[]
  lastTurn: MainTurn | null
  busy: boolean
  nextId: number
}

export const initialChat: ChatState = {
  sessionId: null,
  mode: MODE_OPERATOR,
  messages: [],
  trace: [],
  lastTurn: null,
  busy: false,
  nextId: 1,
}

export type ChatAction =
  | { type: 'send'; role: ChatRole; text: string }
  | { type: 'event'; msg: SSEMessage }
  | { type: 'fail'; message: string }
  | { type: 'session'; sessionId: string | null; mode: string }
  | { type: 'notice'; text: string }
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

function replySpeaker(turn: MainTurn): Speaker {
  if (turn.speaker === 'customer') return turn.mode === MODE_HANDOFF && !turn.handoff ? 'system' : 'agent'
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
          { id: id + 1, speaker: 'system', text: '', pending: true },
        ],
      }
    }
    case 'event': {
      const { event, data } = action.msg
      if (event === 'trace') return { ...state, trace: [...state.trace, data as TraceEvent] }
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
      return { ...state, sessionId: action.sessionId, mode: action.mode }
    case 'notice': {
      const id = state.nextId
      return { ...state, nextId: id + 1, messages: [...state.messages, { id, speaker: 'system', text: action.text }] }
    }
    case 'reset':
      return initialChat
  }
}
