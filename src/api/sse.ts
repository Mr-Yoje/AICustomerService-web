import type { ChatIn } from './types'

export interface SSEMessage {
  event: string
  data: unknown
}

/** 把新到的文本拼到缓冲区后切出完整事件，未完成的部分作为 rest 留给下一次。 */
export function parseSSE(buffer: string, chunk: string): { events: SSEMessage[]; rest: string } {
  const text = (buffer + chunk).replace(/\r\n/g, '\n')
  const blocks = text.split('\n\n')
  const rest = blocks.pop() ?? ''
  const events: SSEMessage[] = []
  for (const block of blocks) {
    let event = 'message'
    const data: string[] = []
    for (const line of block.split('\n')) {
      if (line.startsWith(':')) continue
      const idx = line.indexOf(':')
      const field = idx === -1 ? line : line.slice(0, idx)
      const value = idx === -1 ? '' : line.slice(idx + 1).replace(/^ /, '')
      if (field === 'event') event = value
      else if (field === 'data') data.push(value)
    }
    if (data.length === 0) continue
    const raw = data.join('\n')
    let parsed: unknown = raw
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = raw
    }
    events.push({ event, data: parsed })
  }
  return { events, rest }
}

export async function streamChat(
  body: ChatIn,
  onEvent: (msg: SSEMessage) => void,
  signal?: AbortSignal,
): Promise<void> {
  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal,
  })
  if (!resp.ok || !resp.body) throw new Error(`对话请求失败（HTTP ${resp.status}）`)
  const reader = resp.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    const { events, rest } = parseSSE(buffer, value)
    buffer = rest
    events.forEach(onEvent)
  }
  const { events } = parseSSE(buffer, '\n\n')
  events.forEach(onEvent)
}
