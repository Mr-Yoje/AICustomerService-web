import { PlusOutlined } from '@ant-design/icons'
import { Alert, App, Button, Input, InputNumber, Select, Table, Tag } from 'antd'
import { useState } from 'react'
import { ApiError, api, unwrap } from '../api/client'
import type { RuleRow, TemplateRow } from '../api/types'

const LEVELS = ['轻微', '中等', '严重'] as const

type RuleDraft = { rule_type: string; rule_content: string; violation_level: string; action: string }
type TemplateDraft = { template_type: string; max_periods: number; rate: number; fee: number; condition: string }

function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function toPercent(v: number) {
  return Math.round(v * 10000) / 100
}

function fromPercent(v: number) {
  return Math.round(v * 100) / 10000
}

export function RulesEditor({ rules, onSaved }: { rules: RuleRow[]; onSaved: () => void }) {
  const { message } = App.useApp()
  const [drafts, setDrafts] = useState<Record<string, RuleDraft>>(() => Object.fromEntries(rules.map((r) => [r.rule_id, ruleDraft(r)])))
  const [adding, setAdding] = useState<RuleDraft & { rule_id: string }>({ rule_id: '', rule_type: '', rule_content: '', violation_level: '轻微', action: '' })
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState<string | null>(null)

  const patch = (id: string, part: Partial<RuleDraft>) => setDrafts((d) => ({ ...d, [id]: { ...d[id], ...part } }))

  const save = async (id: string) => {
    setSaving(id)
    setErrors([])
    try {
      await unwrap(api.PUT('/api/rules/{rule_id}', { params: { path: { rule_id: id } }, body: drafts[id] }))
      message.success(`已保存 ${id}`)
      onSaved()
    } catch (e) {
      setErrors(e instanceof ApiError && e.errors.length ? e.errors : [e instanceof Error ? e.message : String(e)])
    } finally {
      setSaving(null)
    }
  }

  const create = async () => {
    setSaving('new')
    setErrors([])
    try {
      await unwrap(api.POST('/api/rules', { body: adding }))
      message.success(`已新增 ${adding.rule_id}`)
      onSaved()
    } catch (e) {
      setErrors(e instanceof ApiError && e.errors.length ? e.errors : [e instanceof Error ? e.message : String(e)])
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="label">合规规则库</span>
        <span className="hint" style={{ margin: 0 }}>
          保存后立即用于合规检查。原始导入行保留，修改另存为覆盖记录。启用哪些检查点仍在「合规检查点」里配置。
        </span>
      </div>
      <div className="panel-body">
        {errors.length > 0 && <Alert type="error" showIcon style={{ marginBottom: 12 }} title={errors.join('；')} />}
        <Table<RuleRow>
          size="small"
          rowKey="rule_id"
          pagination={false}
          dataSource={rules}
          columns={[
            { title: '编号', dataIndex: 'rule_id', width: 80, render: (v: string) => <b className="mono">{v}</b> },
            {
              title: '类型',
              width: 120,
              render: (_, r) => <Input size="small" value={drafts[r.rule_id]?.rule_type} onChange={(e) => patch(r.rule_id, { rule_type: e.target.value })} />,
            },
            {
              title: '规则内容',
              render: (_, r) => <Input size="small" value={drafts[r.rule_id]?.rule_content} onChange={(e) => patch(r.rule_id, { rule_content: e.target.value })} />,
            },
            {
              title: '级别',
              width: 100,
              render: (_, r) => (
                <Select
                  size="small"
                  value={drafts[r.rule_id]?.violation_level}
                  onChange={(v) => patch(r.rule_id, { violation_level: v })}
                  options={LEVELS.map((v) => ({ value: v, label: v }))}
                  style={{ width: 88 }}
                />
              ),
            },
            {
              title: '处置',
              width: 200,
              render: (_, r) => <Input size="small" value={drafts[r.rule_id]?.action} onChange={(e) => patch(r.rule_id, { action: e.target.value })} />,
            },
            {
              title: '启用检查点',
              dataIndex: 'checkpoints',
              width: 160,
              render: (v: string[]) => (v.length ? v.map((c) => <Tag key={c}>{c}</Tag>) : <span className="hint">未启用</span>),
            },
            {
              title: '',
              width: 72,
              render: (_, r) => (
                <Button size="small" type="primary" disabled={same(drafts[r.rule_id], ruleDraft(r))} loading={saving === r.rule_id} onClick={() => void save(r.rule_id)}>
                  保存
                </Button>
              ),
            },
          ]}
        />
        <div className="inline-row" style={{ marginTop: 12 }}>
          <Input size="small" className="mono" placeholder="编号，如 R011" value={adding.rule_id} onChange={(e) => setAdding({ ...adding, rule_id: e.target.value.trim() })} style={{ width: 120 }} />
          <Input size="small" placeholder="类型" value={adding.rule_type} onChange={(e) => setAdding({ ...adding, rule_type: e.target.value })} style={{ width: 120 }} />
          <Input size="small" placeholder="规则内容" value={adding.rule_content} onChange={(e) => setAdding({ ...adding, rule_content: e.target.value })} />
          <Select size="small" value={adding.violation_level} onChange={(v) => setAdding({ ...adding, violation_level: v })} options={LEVELS.map((v) => ({ value: v, label: v }))} style={{ width: 88 }} />
          <Input size="small" placeholder="处置" value={adding.action} onChange={(e) => setAdding({ ...adding, action: e.target.value })} style={{ width: 160 }} />
          <Button size="small" icon={<PlusOutlined />} loading={saving === 'new'} onClick={() => void create()}>
            新增
          </Button>
        </div>
      </div>
    </div>
  )
}

function ruleDraft(r: RuleRow): RuleDraft {
  return { rule_type: r.rule_type ?? '', rule_content: r.rule_content ?? '', violation_level: r.violation_level ?? '轻微', action: r.action ?? '' }
}

export function TemplatesEditor({ templates, onSaved }: { templates: TemplateRow[]; onSaved: () => void }) {
  const { message } = App.useApp()
  const [drafts, setDrafts] = useState<Record<string, TemplateDraft>>(() => Object.fromEntries(templates.map((t) => [t.template_id, templateDraft(t)])))
  const [adding, setAdding] = useState<TemplateDraft & { template_id: string }>({ template_id: '', template_type: '', max_periods: 12, rate: 0, fee: 0, condition: '' })
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState<string | null>(null)

  const patch = (id: string, part: Partial<TemplateDraft>) => setDrafts((d) => ({ ...d, [id]: { ...d[id], ...part } }))

  const save = async (id: string) => {
    setSaving(id)
    setErrors([])
    try {
      await unwrap(api.PUT('/api/templates/{template_id}', { params: { path: { template_id: id } }, body: drafts[id] }))
      message.success(`已保存 ${id}`)
      onSaved()
    } catch (e) {
      setErrors(e instanceof ApiError && e.errors.length ? e.errors : [e instanceof Error ? e.message : String(e)])
    } finally {
      setSaving(null)
    }
  }

  const create = async () => {
    setSaving('new')
    setErrors([])
    try {
      await unwrap(api.POST('/api/templates', { body: adding }))
      message.success(`已新增 ${adding.template_id}`)
      onSaved()
    } catch (e) {
      setErrors(e instanceof ApiError && e.errors.length ? e.errors : [e instanceof Error ? e.message : String(e)])
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="label">分期模板</span>
        <span className="hint" style={{ margin: 0 }}>
          年化利率和手续费率按百分比填写。适用条件保留原文，逾期天数和信用评分从原文解析。原始导入行保留。
        </span>
      </div>
      <div className="panel-body">
        {errors.length > 0 && <Alert type="error" showIcon style={{ marginBottom: 12 }} title={errors.join('；')} />}
        <Table<TemplateRow>
          size="small"
          rowKey="template_id"
          pagination={false}
          dataSource={templates}
          columns={[
            { title: '编号', dataIndex: 'template_id', width: 80, render: (v: string) => <b className="mono">{v}</b> },
            {
              title: '类型',
              width: 130,
              render: (_, t) => <Input size="small" value={drafts[t.template_id]?.template_type} onChange={(e) => patch(t.template_id, { template_type: e.target.value })} />,
            },
            {
              title: '最长期数',
              width: 100,
              render: (_, t) => (
                <InputNumber size="small" min={1} precision={0} value={drafts[t.template_id]?.max_periods} onChange={(n) => patch(t.template_id, { max_periods: Number(n) })} style={{ width: 80 }} />
              ),
            },
            {
              title: '年化利率',
              width: 120,
              render: (_, t) => (
                <InputNumber
                  size="small"
                  min={0}
                  step={0.01}
                  addonAfter="%"
                  value={toPercent(drafts[t.template_id]?.rate ?? 0)}
                  onChange={(n) => patch(t.template_id, { rate: fromPercent(Number(n)) })}
                  style={{ width: 110 }}
                />
              ),
            },
            {
              title: '手续费率',
              width: 120,
              render: (_, t) => (
                <InputNumber
                  size="small"
                  min={0}
                  step={0.01}
                  addonAfter="%"
                  value={toPercent(drafts[t.template_id]?.fee ?? 0)}
                  onChange={(n) => patch(t.template_id, { fee: fromPercent(Number(n)) })}
                  style={{ width: 110 }}
                />
              ),
            },
            {
              title: '适用条件',
              render: (_, t) => <Input size="small" value={drafts[t.template_id]?.condition} onChange={(e) => patch(t.template_id, { condition: e.target.value })} />,
            },
            {
              title: '',
              width: 72,
              render: (_, t) => (
                <Button size="small" type="primary" disabled={same(drafts[t.template_id], templateDraft(t))} loading={saving === t.template_id} onClick={() => void save(t.template_id)}>
                  保存
                </Button>
              ),
            },
          ]}
        />
        <div className="inline-row" style={{ marginTop: 12 }}>
          <Input size="small" className="mono" placeholder="编号，如 T011" value={adding.template_id} onChange={(e) => setAdding({ ...adding, template_id: e.target.value.trim() })} style={{ width: 120 }} />
          <Input size="small" placeholder="类型" value={adding.template_type} onChange={(e) => setAdding({ ...adding, template_type: e.target.value })} style={{ width: 120 }} />
          <InputNumber size="small" min={1} precision={0} value={adding.max_periods} onChange={(n) => setAdding({ ...adding, max_periods: Number(n) })} style={{ width: 80 }} />
          <InputNumber size="small" min={0} step={0.01} addonAfter="%" value={toPercent(adding.rate)} onChange={(n) => setAdding({ ...adding, rate: fromPercent(Number(n)) })} style={{ width: 110 }} />
          <InputNumber size="small" min={0} step={0.01} addonAfter="%" value={toPercent(adding.fee)} onChange={(n) => setAdding({ ...adding, fee: fromPercent(Number(n)) })} style={{ width: 110 }} />
          <Input size="small" placeholder="适用条件，如 逾期≤30天" value={adding.condition} onChange={(e) => setAdding({ ...adding, condition: e.target.value })} />
          <Button size="small" icon={<PlusOutlined />} loading={saving === 'new'} onClick={() => void create()}>
            新增
          </Button>
        </div>
      </div>
    </div>
  )
}

function templateDraft(t: TemplateRow): TemplateDraft {
  return {
    template_type: t.template_type ?? '',
    max_periods: t.max_periods ?? 1,
    rate: t.rate ?? 0,
    fee: t.fee ?? 0,
    condition: t.condition ?? '',
  }
}
