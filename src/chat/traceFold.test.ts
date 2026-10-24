import { describe, expect, it } from 'vitest'
import { foldTraces, latestAgentTraceId } from './traceFold'
import type { ChatMessage } from './reducer'

const msg = (id: number, speaker: ChatMessage['speaker'], pending = false): ChatMessage => ({
  id,
  speaker,
  text: '',
  pending,
  trace: [],
})

describe('latestAgentTraceId', () => {
  it('取最新一条 AI 坐席回复', () => {
    const id = latestAgentTraceId([msg(1, 'customer'), msg(2, 'agent'), msg(3, 'customer'), msg(4, 'agent')], '催收对话模式')
    expect(id).toBe(4)
  })

  it('催收对话进行中，展开当前这条待完成回复', () => {
    expect(latestAgentTraceId([msg(1, 'agent'), msg(2, 'customer'), msg(3, 'system', true)], '催收对话模式')).toBe(3)
  })

  it('运营模式的待完成回复不占轨迹位', () => {
    expect(latestAgentTraceId([msg(1, 'assistant'), msg(2, 'system', true)], '运营模式')).toBeNull()
  })
})

describe('foldTraces', () => {
  it('出现新的进行中回复时只展开它', () => {
    expect([...foldTraces(new Set([1, 2]), { id: 2, pending: false }, 5, true)]).toEqual([5])
  })

  it('同一条进行中保留手动展开和收起', () => {
    expect([...foldTraces(new Set([1]), { id: 5, pending: true }, 5, true)].sort()).toEqual([1])
  })

  it('这一轮结束后收起它，已手动打开的更早轨迹保留', () => {
    expect([...foldTraces(new Set([5, 1]), { id: 5, pending: true }, 5, false)].sort()).toEqual([1])
  })

  it('结束后再手动打开，不会被重复收起', () => {
    expect([...foldTraces(new Set([5]), { id: 5, pending: false }, 5, false)]).toEqual([5])
  })
})
