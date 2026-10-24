import { Collapse, Table, Tag } from 'antd'
import type { RegistryGroup, RuleRow, TemplateRow } from '../api/types'
import { ownerLabel } from '../lib/agents'

const LEVEL_COLOR: Record<string, string> = { 严重: 'red', 中等: 'orange', 轻微: 'gold' }

export function RulesView({ rules }: { rules: RuleRow[] | undefined }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="label">合规规则库</span>
        <span className="hint" style={{ margin: 0 }}>
          原始导入数据，只读；各检查点启用哪些规则在「合规检查点」中配置
        </span>
      </div>
      <Table<RuleRow>
        size="small"
        rowKey="rule_id"
        pagination={false}
        loading={!rules}
        dataSource={rules}
        columns={[
          { title: '编号', dataIndex: 'rule_id', width: 80, render: (v: string) => <b className="mono">{v}</b> },
          { title: '类型', dataIndex: 'rule_type', width: 100 },
          { title: '规则内容', dataIndex: 'rule_content' },
          { title: '级别', dataIndex: 'violation_level', width: 70, render: (v: string) => <Tag color={LEVEL_COLOR[v]}>{v}</Tag> },
          { title: '处置', dataIndex: 'action', width: 200 },
          {
            title: '启用检查点',
            dataIndex: 'checkpoints',
            width: 180,
            render: (v: string[]) => (v.length ? v.map((c) => <Tag key={c}>{c}</Tag>) : <span className="hint">未启用</span>),
          },
        ]}
      />
    </div>
  )
}

function pct(v: number | null) {
  return v === null ? '—' : `${(v * 100).toFixed(2)}%`
}

export function TemplatesView({ templates }: { templates: TemplateRow[] | undefined }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="label">分期模板</span>
        <span className="hint" style={{ margin: 0 }}>
          原始导入数据，只读；适用条件已解析为结构化字段，业务包通过模板编号选用
        </span>
      </div>
      <Table<TemplateRow>
        size="small"
        rowKey="template_id"
        pagination={false}
        loading={!templates}
        dataSource={templates}
        columns={[
          { title: '编号', dataIndex: 'template_id', width: 80, render: (v: string) => <b className="mono">{v}</b> },
          { title: '类型', dataIndex: 'template_type', width: 110 },
          { title: '最长期数', dataIndex: 'max_periods', width: 90 },
          { title: '年化利率', dataIndex: 'rate', width: 90, render: pct },
          { title: '手续费率', dataIndex: 'fee', width: 90, render: pct },
          { title: '适用条件', dataIndex: 'condition' },
          {
            title: '解析结果',
            dataIndex: 'cond',
            render: (c: Record<string, unknown>) => (
              <span className="mono hint">
                {Object.entries(c)
                  .filter(([k, v]) => k !== 'text' && v !== null && v !== false)
                  .map(([k, v]) => `${k}=${String(v)}`)
                  .join('  ') || '无限制'}
              </span>
            ),
          },
        ]}
      />
    </div>
  )
}

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
