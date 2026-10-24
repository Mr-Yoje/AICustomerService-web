import { describe, expect, it } from 'vitest'
import { handledByOps, ownerLabel } from './agents'

describe('ownerLabel', () => {
  it('三组注册表分别对应主控、运营子 Agent 和催收子 Agent', () => {
    expect(ownerLabel('main')).toBe('主控 Agent')
    expect(ownerLabel('ops')).toBe('运营子 Agent')
    expect(ownerLabel('collection')).toBe('催收子 Agent')
    expect(ownerLabel('collection:consumer_finance')).toBe('催收子 Agent · consumer_finance')
  })
})

describe('handledByOps', () => {
  it('工具调用归属为 ops，或轨迹是运营子 Agent 的检查点', () => {
    expect(handledByOps([{ name: 'get_overdues', detail: { owner: 'ops' } }])).toBe(true)
    expect(handledByOps([{ name: '检查点二：运营操作', detail: {} }])).toBe(true)
    expect(handledByOps([{ name: '检查点一：坐席话术审核' }])).toBe(true)
    expect(handledByOps([{ name: '结束催收', detail: { owner: 'main' } }])).toBe(false)
    expect(handledByOps(undefined)).toBe(false)
  })
})
