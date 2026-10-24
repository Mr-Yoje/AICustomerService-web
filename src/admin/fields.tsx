import type { ReactNode } from 'react'

export function Section({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="form-section">
      <div className="form-section-title">
        <span>{title}</span>
        {extra}
      </div>
      {children}
    </section>
  )
}

export function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <span className="field-control">
        {children}
        {help && <span className="field-help">{help}</span>}
      </span>
    </div>
  )
}