import { describe, expect, it } from 'vitest'
import { fromYaml, getIn, setIn, toYaml } from './draft'

describe('yaml', () => {
  it('round-trips nested config with chinese keys', () => {
    const doc = { name: '车贷催收', match: { loan_types: ['车贷'], default: false }, stages: [{ id: '核身', next: null }] }
    const back = fromYaml(toYaml(doc))
    expect(back).toEqual({ ok: true, value: doc })
  })

  it('rejects invalid or non-object yaml', () => {
    expect(fromYaml('a: [1, 2').ok).toBe(false)
    expect(fromYaml('- 1\n- 2')).toEqual({ ok: false, error: 'YAML 顶层必须是键值对象' })
  })
})

describe('setIn', () => {
  it('updates nested paths without mutating the source', () => {
    const doc = { handoff: { emotion: { min_intensity: 0.9 } }, pre_tools: [{ tool: 'a', on_failure: 'block' }] }
    const next = setIn(setIn(doc, ['handoff', 'emotion', 'min_intensity'], 0.8), ['pre_tools', 0, 'on_failure'], 'degrade')
    expect(getIn(next, ['handoff', 'emotion', 'min_intensity'])).toBe(0.8)
    expect(getIn(next, ['pre_tools', 0, 'on_failure'])).toBe('degrade')
    expect(doc.handoff.emotion.min_intensity).toBe(0.9)
    expect(Array.isArray(next.pre_tools)).toBe(true)
  })

  it('creates missing levels', () => {
    expect(setIn({}, ['speech', 'agent_id'], 'AI09')).toEqual({ speech: { agent_id: 'AI09' } })
  })
})
