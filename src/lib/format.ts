export function money(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return `${v.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 元`
}

export function time(v: string | null | undefined): string {
  if (!v) return '—'
  return v.replace('T', ' ').slice(0, 16)
}

export function levelColor(level: string | null | undefined): string {
  if (level === '高') return 'var(--teal)'
  if (level === '中') return 'var(--amber)'
  if (level === '低') return 'var(--vermilion)'
  return 'var(--muted)'
}

export function short(value: unknown, max = 80): string {
  const s = typeof value === 'string' ? value : JSON.stringify(value)
  if (s === undefined) return ''
  return s.length > max ? `${s.slice(0, max)}…` : s
}

export const STATUS_COLOR: Record<string, string> = {
  ok: 'green',
  warn: 'orange',
  error: 'red',
  retry: 'gold',
  完成: 'green',
  失败: 'red',
  执行中: 'blue',
  等待: 'default',
}
