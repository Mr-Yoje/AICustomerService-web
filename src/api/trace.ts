let active = ''

export function newTraceId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5))
  return `TR-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

export function rememberTrace(traceId: string): void {
  active = traceId
}

export function currentTraceId(): string {
  return active
}
