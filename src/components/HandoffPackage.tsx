type Line = { 角色?: string; 内容?: string }

function isTranscript(v: unknown): v is Line[] {
  return Array.isArray(v) && v.length > 0 && v.every((x) => x && typeof x === 'object' && '内容' in x)
}

function Value({ v }: { v: unknown }) {
  if (v === null || v === undefined || (Array.isArray(v) && v.length === 0)) return <span style={{ color: 'var(--muted)' }}>无</span>
  if (typeof v === 'string' || typeof v === 'number') return <span>{v}</span>
  if (isTranscript(v))
    return (
      <div>
        {v.map((l, i) => (
          <div key={i} className="pkg-line">
            <b>{l.角色}</b>
            {l.内容}
          </div>
        ))}
      </div>
    )
  return <pre className="pkg-val">{JSON.stringify(v, null, 2)}</pre>
}

/** 移交包按字段逐行展示；对话全文按「角色 内容」排版，其余结构化字段展示为 JSON。 */
export function HandoffPackage({ content }: { content: unknown }) {
  const c = (content ?? {}) as Record<string, unknown>
  return (
    <div className="handoff-pkg">
      {Object.entries(c).map(([k, v]) => (
        <div key={k} className="pkg-row">
          <div className="pkg-key">{k}</div>
          <Value v={v} />
        </div>
      ))}
    </div>
  )
}
