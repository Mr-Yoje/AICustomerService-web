import { describe, expect, it } from 'vitest'
import { chatReducer, initialChat } from './reducer'
import { readOnlyReason, sessionStateLabel, toChatMessages } from './session'

describe('toChatMessages', () => {
  it('按角色还原气泡，不带轨迹', () => {
    const messages = toChatMessages([
      { role: '客户', text: '能不能分12期' },
      { role: 'AI坐席', text: '可以办理分期', meta: { usage: { prompt_tokens: 120, completion_tokens: 30, cache_hit_tokens: 80 } } },
      { role: '人工坐席', text: '我来继续' },
    ])
    expect(messages.map((m) => m.speaker)).toEqual(['customer', 'agent', 'human_agent'])
    expect(messages.every((m) => m.trace === undefined && m.turn === undefined)).toBe(true)
    expect(messages[1].usage).toEqual({ prompt_tokens: 120, completion_tokens: 30, cache_hit_tokens: 80 })
    expect(messages[0].usage).toBeUndefined()
  })
})

describe('sessionStateLabel', () => {
  it('区分可继续、已结束和需重新发起', () => {
    expect(sessionStateLabel({ ended_at: null, resumable: true })).toBe('可继续')
    expect(sessionStateLabel({ ended_at: '2026-10-24T10:00:00', resumable: false })).toBe('已结束')
    expect(sessionStateLabel({ ended_at: null, resumable: false })).toBe('需重新发起')
    expect(readOnlyReason({ ended_at: null, resumable: false })).toBe('需重新发起，只读回看')
  })
})

describe('chatReducer load', () => {
  it('打开历史会话时替换对话并按只读标记锁定', () => {
    const loaded = chatReducer(initialChat, {
      type: 'load',
      sessionId: 'S-1',
      mode: '运营模式',
      readOnly: true,
      readOnlyReason: '已结束，只读回看',
      messages: toChatMessages([{ role: 'AI坐席', text: '您好' }]),
    })
    expect(loaded.sessionId).toBe('S-1')
    expect(loaded.readOnly).toBe(true)
    expect(loaded.messages).toHaveLength(1)
    expect(loaded.trace).toEqual([])
    expect(loaded.nextId).toBe(2)
  })
})
