import { ArrowUpOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Alert, Button, Input, InputNumber, Select, Table } from 'antd'
import type { Setter } from './ConfigEditor'
import { type Doc, num } from './draft'
import { Field, Section } from './fields'

const WEIGHTS: [string, string][] = [
  ['repayment', '还款履约'],
  ['severity', '逾期严重度'],
  ['behavior', '近期行为'],
  ['call_result', '历史催收结果'],
  ['emotion', '情绪'],
  ['credit', '信用画像'],
]

type Strategy = { level: string; max_days?: number | null; strategy: string }

export function PolicyForm({ draft, set }: { draft: Doc; set: Setter }) {
  const scoring = (draft.scoring ?? {}) as Doc
  const weights = (scoring.weights ?? {}) as Record<string, number>
  const levels = (scoring.levels ?? {}) as Doc
  const strategies = (draft.strategies ?? []) as Strategy[]
  const sum = Math.round(WEIGHTS.reduce((s, [k]) => s + (weights[k] ?? 0), 0) * 1000) / 1000

  const setStrategies = (next: Strategy[]) => set(['strategies'], next)
  const patch = (i: number, p: Partial<Strategy>) => {
    const row = { ...strategies[i], ...p }
    if (row.max_days === null || row.max_days === undefined) delete row.max_days
    setStrategies(strategies.map((s, j) => (j === i ? row : s)))
  }

  return (
    <div className="pack-form">
      <Section title="还款意愿评分权重">
        {sum !== 1 && <Alert type="warning" showIcon style={{ marginBottom: 8 }} title={`当前权重合计 ${sum}，建议调整为 1`} />}
        <div className="weights">
          {WEIGHTS.map(([k, label]) => (
            <Field key={k} label={label}>
              <InputNumber min={0} max={1} step={0.05} value={weights[k] ?? 0} onChange={(v) => set(['scoring', 'weights', k], v ?? 0)} />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="意愿等级阈值">
        <Field label="高意愿 ≥" help="评分达到该值为「高」">
          <InputNumber min={0} max={100} value={num(levels.high)} onChange={(v) => set(['scoring', 'levels', 'high'], v)} />
        </Field>
        <Field label="中意愿 ≥" help="低于该值为「低」">
          <InputNumber min={0} max={100} value={num(levels.medium)} onChange={(v) => set(['scoring', 'levels', 'medium'], v)} />
        </Field>
      </Section>

      <Section
        title="策略表"
        extra={
          <Button size="small" icon={<PlusOutlined />} onClick={() => setStrategies([...strategies, { level: '中', strategy: '' }])}>
            添加
          </Button>
        }
      >
        <p className="hint">按顺序匹配：意愿等级相同且最长逾期天数不超过「逾期上限」的第一行生效；上限留空表示不限。</p>
        <Table<Strategy>
          size="small"
          pagination={false}
          rowKey={(_, i) => String(i)}
          dataSource={strategies}
          columns={[
            { title: '#', width: 40, render: (_, __, i) => <span className="mono hint">{i + 1}</span> },
            {
              title: '意愿等级',
              width: 110,
              render: (_, r, i) => <Select size="small" value={r.level} onChange={(v) => patch(i, { level: v })} options={['高', '中', '低'].map((l) => ({ value: l, label: l }))} style={{ width: 80 }} />,
            },
            {
              title: '逾期上限（天）',
              width: 140,
              render: (_, r, i) => <InputNumber size="small" min={0} placeholder="不限" value={r.max_days ?? null} onChange={(v) => patch(i, { max_days: v })} />,
            },
            { title: '建议策略', render: (_, r, i) => <Input size="small" value={r.strategy} onChange={(e) => patch(i, { strategy: e.target.value })} /> },
            {
              title: '',
              width: 80,
              render: (_, __, i) => (
                <span>
                  <Button
                    size="small"
                    type="text"
                    icon={<ArrowUpOutlined />}
                    disabled={i === 0}
                    onClick={() => setStrategies(strategies.map((s, j) => (j === i - 1 ? strategies[i] : j === i ? strategies[i - 1] : s)))}
                  />
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => setStrategies(strategies.filter((_, j) => j !== i))} />
                </span>
              ),
            },
          ]}
        />
      </Section>
      <p className="hint">评分细则（行为与情绪分类、信用换算、对话调整）、分期参数与处理优先级排序请在 YAML 视图中编辑。</p>
    </div>
  )
}
