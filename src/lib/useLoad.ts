import { useCallback, useEffect, useRef, useState } from 'react'

export interface Loaded<T> {
  data: T | undefined
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

/** 依赖变化时重新加载；fn 返回 undefined 表示暂不加载（如未选中对象）。 */
export function useLoad<T>(fn: () => Promise<T> | undefined, deps: unknown[]): Loaded<T> {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)

  const reload = useCallback(async () => {
    const p = run()
    if (!p) {
      setData(undefined)
      return
    }
    const id = ++seq.current
    setLoading(true)
    setError(null)
    try {
      const value = await p
      if (id === seq.current) setData(value)
    } catch (e) {
      if (id === seq.current) setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (id === seq.current) setLoading(false)
    }
  }, [run])

  useEffect(() => {
    void reload()
  }, [reload])

  return { data, loading, error, reload }
}
