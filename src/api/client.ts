import createClient from 'openapi-fetch'
import type { paths } from './schema'
import { newTraceId } from './trace'

export const api = createClient<paths>({ baseUrl: '' })

api.use({
  onRequest({ request }) {
    if (!request.headers.has('X-Trace-Id')) request.headers.set('X-Trace-Id', newTraceId())
    return request
  },
})

export class ApiError extends Error {
  readonly status: number
  readonly errors: string[]

  constructor(status: number, message: string, errors: string[] = []) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

function describe(error: unknown, status: number): ApiError {
  const detail = (error as { detail?: unknown } | undefined)?.detail
  if (detail && typeof detail === 'object' && 'errors' in detail) {
    const errors = (detail as { errors: string[] }).errors
    return new ApiError(status, errors.join('；'), errors)
  }
  if (typeof detail === 'string') return new ApiError(status, detail)
  return new ApiError(status, `请求失败（HTTP ${status}）`)
}

export async function unwrap<T>(p: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  const { data, error, response } = await p
  if (error !== undefined || !response.ok) throw describe(error, response.status)
  return data as T
}
