import { describe, expect, it } from 'vitest'
import type { MainTurn } from '../api/types'
import { chatReducer, HUMAN_SENT, initialChat, type ChatState } from './reducer'

const turn = (patch: Partial<MainTurn>): MainTurn => ({
  session_id: null,
  mode: '运营模式',
  speaker: 'operator',
  speaker_method: '显式角色',
  system_intent: '多贷款管理',
  reply: '',
  customer_id: 'C0001',
  hit_rules: [],
  compliance: [],
  willingness_score: null,
  willingness_level: null,
  strategy: null,
  handoff: false,
  handoff_package_id: null,
  needs_review: false,
  review_reasons: [],
  key_points: [],
  trace_id: 'TR-1',
  trace: [],
  ...patch,
})

function run(state: ChatState, ...events: [string, unknown][]): ChatState {
  return events.reduce((s, [event, data]) => chatReducer(s, { type: 'event', msg: { event, data } }), state)
}

describe('chatReducer', () => {
  it('trace、delta、done 依次更新回答与结论', () => {
    let s = chatReducer(initialChat, { type: 'send', role: 'operator', text: '查询C0001的欠款' })
    expect(s.busy).toBe(true)
    s = run(s, ['trace', { step: 'route', name: '说话人判定', status: 'ok', detail: {}, ms: 0 }], ['delta', { text: '名下' }])
    expect(s.trace).toHaveLength(1)
    expect(s.messages.at(-1)?.text).toBe('名下')
    s = run(s, ['done', turn({ reply: '名下1笔逾期' })])
    const last = s.messages.at(-1)!
    expect(last).toMatchObject({ text: '名下1笔逾期', pending: false, speaker: 'assistant' })
    expect(s.busy).toBe(false)
    expect(s.lastTurn?.system_intent).toBe('多贷款管理')
  })

  it('replace 整段替换并标记', () => {
    let s = chatReducer(initialChat, { type: 'send', role: 'operator', text: 'x' })
    s = run(s, ['delta', { text: '名下3笔' }], ['replace', { text: '名下1笔' }])
    expect(s.messages.at(-1)).toMatchObject({ text: '名下1笔', replaced: true })
  })

  it('error 结束本轮并标红', () => {
    let s = chatReducer(initialChat, { type: 'send', role: 'operator', text: 'x' })
    s = run(s, ['error', { message: '模拟故障' }])
    expect(s.messages.at(-1)).toMatchObject({ text: '模拟故障', error: true, pending: false })
    expect(s.busy).toBe(false)
  })

  it('客户发言进入催收模式，AI 坐席回复，并记录会话', () => {
    let s = chatReducer(initialChat, { type: 'send', role: 'customer', text: '能分12期吗' })
    s = run(s, ['done', turn({ speaker: 'customer', mode: '催收对话模式', session_id: 'S-1', reply: '可以办理分期' })])
    expect(s.sessionId).toBe('S-1')
    expect(s.mode).toBe('催收对话模式')
    expect(s.messages.at(-1)?.speaker).toBe('agent')
  })

  it('人工坐席合规话术显示为发送确认', () => {
    let s = chatReducer(initialChat, { type: 'send', role: 'human_agent', text: '您好' })
    s = run(s, ['done', turn({ speaker: 'agent', mode: '人工接管', reply: '您好' })])
    expect(s.messages.at(-1)).toMatchObject({ text: HUMAN_SENT, speaker: 'system' })
  })
})
