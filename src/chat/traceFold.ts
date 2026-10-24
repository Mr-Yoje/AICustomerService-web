import { MODE_COLLECTION } from '../api/types'
import type { ChatMessage } from './reducer'

/** 催收对话里，最新一条 AI 坐席回复（或正在生成的那条）是默认展开的轨迹。 */
export function latestAgentTraceId(messages: ChatMessage[], mode: string): number | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.speaker === 'agent') return m.id
    if (m.pending && mode === MODE_COLLECTION) return m.id
  }
  return null
}

/** 进行中的当前轮展开；该轮结束后收起。同一条进行中时保留手动开关。 */
export function foldTraces(
  open: ReadonlySet<number>,
  prev: { id: number | null; pending: boolean },
  latest: number | null,
  pending: boolean,
): Set<number> {
  if (latest == null) return new Set()
  if (latest !== prev.id) return pending ? new Set([latest]) : new Set()
  if (prev.pending && !pending) {
    const next = new Set(open)
    next.delete(latest)
    return next
  }
  return new Set(open)
}
