import { Input, InputNumber, Switch, Table, Tag } from 'antd'
import type { Setter } from './ConfigEditor'
import type { Doc } from './draft'
import { Section } from './fields'
import { ownerLabel } from '../lib/agents'

type Item = {
  name: string
  owner: string
  kind: string
  description: string
  timeout_s: number
  retries: number
  enabled: boolean
}

export function RegistryForm({ draft, set }: { draft: Doc; set: Setter }) {
  const items = (draft.items ?? []) as Item[]
  const owners = [...new Set(items.map((i) => i.owner))]
  const patch = (name: string, part: Partial<Item>) => set(['items'], items.map((i) => (i.name === name ? { ...i, ...part } : i)))

  return (
    <div className="pack-form">
      <p className="hint">名称、类别和输入输出契约由代码注册，这里不能增删。停用后新的调用不再执行；已经打开的催收会话仍用打开时的配置。</p>
      {owners.map((owner) => (
        <Section key={owner} title={ownerLabel(owner)}>
          <Table<Item>
            size="small"
            pagination={false}
            rowKey="name"
            dataSource={items.filter((i) => i.owner === owner)}
            columns={[
              { title: '名称', dataIndex: 'name', width: 200, render: (v: string) => <span className="mono">{v}</span> },
              {
                title: '类别',
                dataIndex: 'kind',
                width: 80,
                render: (v: string) => <Tag color={v === 'skill' ? 'purple' : 'blue'}>{v === 'skill' ? 'Skill' : '工具'}</Tag>,
              },
              {
                title: '启用',
                dataIndex: 'enabled',
                width: 70,
                render: (v: boolean, r) => <Switch size="small" checked={v} onChange={(checked) => patch(r.name, { enabled: checked })} />,
              },
              {
                title: '说明',
                dataIndex: 'description',
                render: (v: string, r) => <Input size="small" value={v} onChange={(e) => patch(r.name, { description: e.target.value })} />,
              },
              {
                title: '超时（秒）',
                dataIndex: 'timeout_s',
                width: 110,
                render: (v: number, r) => <InputNumber size="small" min={0.1} step={1} value={v} onChange={(n) => patch(r.name, { timeout_s: Number(n) })} />,
              },
              {
                title: '重试',
                dataIndex: 'retries',
                width: 90,
                render: (v: number, r) => <InputNumber size="small" min={0} precision={0} value={v} onChange={(n) => patch(r.name, { retries: Number(n) })} />,
              },
            ]}
          />
        </Section>
      ))}
    </div>
  )
}
