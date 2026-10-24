import type { ChatMessage, Speaker } from './reducer'

const ROLE: Record<string, Speaker> = {
  客户: 'customer',
  AI坐席: 'agent',
  人工坐席: 'human_agent',
  运营: 'operator',
}

/** 库里的对话记录没有处理轨迹，只还原气泡。 */
export function toChatMessages(rows: { role: string; text: string }[]): ChatMessage[] {
  return rows.map((row, i) => ({ id: i + 1, speaker: ROLE[row.role] ?? 'system', text: row.text }))
}

export function sessionStateLabel(item: { ended_at: string | null; resumable: boolean }): string {
  if (item.ended_at) return '已结束'
  return item.resumable ? '可继续' : '需重新发起'
}

export function readOnlyReason(item: { ended_at: string | null; resumable: boolean }): string {
  return item.ended_at ? '已结束，只读回看' : '需重新发起，只读回看'
}
