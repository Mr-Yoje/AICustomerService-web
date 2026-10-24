import { Collapse, Table, Tag } from 'antd'
import type { RegistryGroup } from '../api/types'
import { ownerLabel } from '../lib/agents'

type Item = { name: string; kind: string; description?: string; timeout_s?: number; retries?: number; input?: unknown; output?: unknown }

export function RegistryView({ groups }: { groups: RegistryGroup[] | undefined }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="label">工具注册表</span>
        <span className="hint" style={{ margin: 0 }}>
          主控、运营子 Agent 与各业务包催收子 Agent 的工具（tool）和 Skill 契约，分开注册；展开行查看输入输出结构
        </span>
      </div>
      <div className="panel-body">
        <Collapse
          defaultActiveKey={['ops']}
          items={(groups ?? []).map((g) => ({
            key: g.owner,
            label: (
              <span>
                <b>{ownerLabel(g.owner)}</b>
                <span className="hint" style={{ marginLeft: 8 }}>
                  {g.items.filter((i) => i.kind === 'tool').length} 个工具 · {g.items.filter((i) => i.kind === 'skill').length} 个 Skill
                </span>
              </span>
            ),
            children: (
              <Table<Item>
                size="small"
                rowKey="name"
                pagination={false}
                dataSource={g.items as Item[]}
                expandable={{
                  expandedRowRender: (r) => (
                    <div className="schema-pair">
                      <div>
                        <div className="sub-title">输入</div>
                        <pre className="pkg-val">{JSON.stringify(r.input, null, 2)}</pre>
                      </div>
                      <div>
                        <div className="sub-title">输出</div>
                        <pre className="pkg-val">{JSON.stringify(r.output, null, 2)}</pre>
                      </div>
                    </div>
                  ),
                }}
                columns={[
                  { title: '名称', dataIndex: 'name', width: 220, render: (v: string) => <span className="mono">{v}</span> },
                  { title: '类别', dataIndex: 'kind', width: 70, render: (v: string) => <Tag color={v === 'skill' ? 'purple' : 'blue'}>{v === 'skill' ? 'Skill' : '工具'}</Tag> },
                  { title: '说明', dataIndex: 'description' },
                  { title: '超时', dataIndex: 'timeout_s', width: 70, render: (v?: number) => (v ? `${v}s` : '—') },
                  { title: '重试', dataIndex: 'retries', width: 60 },
                ]}
              />
            ),
          }))}
        />
      </div>
    </div>
  )
}
