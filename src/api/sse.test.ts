import { describe, expect, it } from 'vitest'
import { parseSSE } from './sse'

describe('parseSSE', () => {
  it('解析多个完整事件', () => {
    const { events, rest } = parseSSE('', 'event: trace\ndata: {"name":"a"}\n\nevent: delta\ndata: {"text":"你好"}\n\n')
    expect(events).toEqual([
      { event: 'trace', data: { name: 'a' } },
      { event: 'delta', data: { text: '你好' } },
    ])
    expect(rest).toBe('')
  })

  it('跨片段的事件留到下一次拼接', () => {
    const first = parseSSE('', 'event: delta\ndata: {"te')
    expect(first.events).toEqual([])
    const second = parseSSE(first.rest, 'xt":"好"}\n\n')
    expect(second.events).toEqual([{ event: 'delta', data: { text: '好' } }])
  })

  it('兼容 CRLF、注释行与非 JSON 数据', () => {
    const { events } = parseSSE('', ': ping\r\n\r\nevent: done\r\ndata: plain\r\n\r\n')
    expect(events).toEqual([{ event: 'done', data: 'plain' }])
  })
})
