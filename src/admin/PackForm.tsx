import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Checkbox, Input, InputNumber, Select, Switch } from 'antd'
import type { Setter } from './ConfigEditor'
import { type Doc, list, num, str } from './draft'
import { Field, Section } from './fields'

const POST_TASKS: [string, string][] = [
  ['write_call_record', '写入通话记录'],
  ['write_behavior', '写入催收行为'],
  ['write_emotion', '写入情绪记录'],
  ['refresh_profile', '更新客户画像'],
  ['generate_report', '生成催收报告'],
  ['create_todos', '生成待办'],
]

const LOAN_TYPES = ['消费贷', '现金贷', '装修贷', '教育贷', '信用卡分期', '车贷']
const FAILURE = [
  { value: 'degrade', label: '降级继续' },
  { value: 'block', label: '阻断发起' },
]

export interface PackFormOptions {
  rules: { value: string; label: string }[]
  tools: string[]
  emotions: string[]
}

type PreTool = { tool: string; on_failure: string }

export function PackForm({ draft, set, opts }: { draft: Doc; set: Setter; opts: PackFormOptions }) {
  const match = (draft.match ?? {}) as Doc
  const pre = (draft.pre_tools ?? []) as PreTool[]
  const handoff = (draft.handoff ?? {}) as Doc
  const emotion = (handoff.emotion ?? {}) as Doc
  const speech = (draft.speech ?? {}) as Doc
  const posts = list(draft.post_tasks)

  return (
    <div className="pack-form">
      <Section title="基本信息">
        <Field label="名称">
          <Input value={str(draft.name)} onChange={(e) => set(['name'], e.target.value)} />
        </Field>
        <Field label="编号" help="编号创建后不可修改，如需新业务请复制新建">
          <Input value={str(draft.pack_id)} disabled className="mono" />
        </Field>
        <Field label="适用贷款类型" help="客户最高优先级逾期的贷款类型命中时使用本业务包">
          <Select
            mode="tags"
            value={list(match.loan_types)}
            onChange={(v) => set(['match', 'loan_types'], v)}
            options={LOAN_TYPES.map((t) => ({ value: t, label: t }))}
          />
        </Field>
        <Field label="默认业务包" help="没有业务包匹配贷款类型时使用；只能有一个默认包">
          <Switch checked={match.default === true} onChange={(v) => set(['match', 'default'], v)} />
        </Field>
      </Section>

      <Section
        title="前置工具"
        extra={
          <Button size="small" icon={<PlusOutlined />} onClick={() => set(['pre_tools'], [...pre, { tool: opts.tools[0] ?? '', on_failure: 'degrade' }])}>
            添加
          </Button>
        }
      >
        <p className="hint">发起催收前按顺序调用；失败策略为「阻断发起」时工具失败即不外呼。</p>
        {pre.map((t, i) => (
          <div key={i} className="inline-row">
            <span className="mono hint">{i + 1}</span>
            <Select style={{ width: 260 }} value={t.tool} onChange={(v) => set(['pre_tools', i, 'tool'], v)} options={opts.tools.map((n) => ({ value: n, label: n }))} />
            <Select style={{ width: 130 }} value={t.on_failure} onChange={(v) => set(['pre_tools', i, 'on_failure'], v)} options={FAILURE} />
            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => set(['pre_tools'], pre.filter((_, j) => j !== i))} />
          </div>
        ))}
      </Section>

      <Section title="外呼门禁">
        <Field label="门禁规则" help="发起催收前由运营操作检查点校验，命中即阻断">
          <Select mode="multiple" value={list(draft.gates)} onChange={(v) => set(['gates'], v)} options={opts.rules} />
        </Field>
      </Section>

      <Section title="转人工条件">
        <Field label="明确拒绝次数" help="会话内客户明确拒绝达到该次数时转人工">
          <InputNumber min={1} value={num(handoff.max_refusals)} onChange={(v) => set(['handoff', 'max_refusals'], v)} />
        </Field>
        <Field label="情绪类型">
          <Select mode="multiple" value={list(emotion.types)} onChange={(v) => set(['handoff', 'emotion', 'types'], v)} options={opts.emotions.map((e) => ({ value: e, label: e }))} />
        </Field>
        <Field label="情绪强度阈值" help="上述情绪强度达到阈值时转人工">
          <InputNumber min={0} max={1} step={0.05} value={num(emotion.min_intensity)} onChange={(v) => set(['handoff', 'emotion', 'min_intensity'], v)} />
        </Field>
        <Field label="连续低置信轮数" help="意图识别置信度连续偏低达到该轮数时转人工">
          <InputNumber min={1} value={num(handoff.low_confidence_turns)} onChange={(v) => set(['handoff', 'low_confidence_turns'], v)} />
        </Field>
      </Section>

      <Section title="话术约束">
        <Field label="坐席工号">
          <Input value={str(speech.agent_id)} onChange={(e) => set(['speech', 'agent_id'], e.target.value)} style={{ width: 160 }} />
        </Field>
        <Field label="转接等待秒数">
          <InputNumber min={0} value={num(speech.wait_seconds)} onChange={(v) => set(['speech', 'wait_seconds'], v)} />
        </Field>
        <Field label="身份表明">
          <Input value={str(speech.identity)} onChange={(e) => set(['speech', 'identity'], e.target.value)} />
        </Field>
        <Field label="核身话术">
          <Input value={str(speech.verify)} onChange={(e) => set(['speech', 'verify'], e.target.value)} />
        </Field>
        <Field label="来意说明">
          <Input value={str(speech.purpose)} onChange={(e) => set(['speech', 'purpose'], e.target.value)} />
        </Field>
        <Field label="语气要求">
          <Input value={str(speech.tone)} onChange={(e) => set(['speech', 'tone'], e.target.value)} />
        </Field>
        <Field label="禁用词">
          <Select mode="tags" value={list(speech.forbidden_words)} onChange={(v) => set(['speech', 'forbidden_words'], v)} />
        </Field>
        <Field label="改写兜底话术" help="合规改写多次仍不通过时使用">
          <Input.TextArea autoSize={{ minRows: 2 }} value={str(speech.rewrite_fallback)} onChange={(e) => set(['speech', 'rewrite_fallback'], e.target.value)} />
        </Field>
        <p className="hint">对话阶段、意图动作、各场景话术模板与业务专属规则请在 YAML 视图中编辑。</p>
      </Section>

      <Section title="后置任务">
        <Checkbox.Group
          value={posts}
          onChange={(v) => set(['post_tasks'], POST_TASKS.map(([k]) => k).filter((k) => (v as string[]).includes(k)))}
          options={POST_TASKS.map(([value, label]) => ({ value, label }))}
        />
      </Section>
    </div>
  )
}
