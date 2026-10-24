import { dump, load } from 'js-yaml'

export type Doc = Record<string, unknown>

export function toYaml(doc: unknown): string {
  return dump(doc, { lineWidth: -1, noRefs: true })
}

export function fromYaml(text: string): { ok: true; value: Doc } | { ok: false; error: string } {
  try {
    const value = load(text)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: 'YAML 顶层必须是键值对象' }
    return { ok: true, value: value as Doc }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** 按路径不可变地写入值；中间缺失的层级补为空对象。 */
export function setIn<T>(doc: T, path: (string | number)[], value: unknown): T {
  if (!path.length) return value as T
  const [head, ...rest] = path
  const base = (doc ?? (typeof head === 'number' ? [] : {})) as Record<string | number, unknown>
  const copy = (Array.isArray(base) ? [...base] : { ...base }) as Record<string | number, unknown>
  copy[head] = setIn(base[head], rest, value)
  return copy as T
}

export const str = (v: unknown) => (typeof v === 'string' ? v : '')
export const num = (v: unknown) => (typeof v === 'number' ? v : null)
export const list = (v: unknown) => (Array.isArray(v) ? (v as string[]) : [])

export function getIn(doc: unknown, path: (string | number)[]): unknown {
  return path.reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string | number, unknown>)[k] : undefined), doc)
}
