import { CopyOutlined } from '@ant-design/icons'
import { App, Button, Form, Input, Modal, Tag } from 'antd'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { api, unwrap } from '../api/client'
import { ConfigEditor } from '../admin/ConfigEditor'
import { PackForm, type PackFormOptions } from '../admin/PackForm'
import { PolicyForm } from '../admin/PolicyForm'
import { RegistryView, RulesView, TemplatesView } from '../admin/ReadOnly'
import { useLoad } from '../lib/useLoad'
import './admin.css'

const SECTIONS = [
  { key: 'packs', label: '业务包', group: '可配置' },
  { key: 'policy', label: '评分与策略', group: '可配置' },
  { key: 'checkpoints', label: '合规检查点', group: '可配置' },
  { key: 'intents', label: '意图映射', group: '可配置' },
  { key: 'rules', label: '合规规则库', group: '只读' },
  { key: 'templates', label: '分期模板', group: '只读' },
  { key: 'registry', label: '工具注册表', group: '只读' },
] as const

type SectionKey = (typeof SECTIONS)[number]['key']

export function AdminPage() {
  const [params, setParams] = useSearchParams()
  const section = (SECTIONS.find((s) => s.key === params.get('s'))?.key ?? 'packs') as SectionKey
  const rules = useLoad(() => unwrap(api.GET('/api/rules')), [])
  const templates = useLoad(() => (section === 'templates' ? unwrap(api.GET('/api/templates')) : undefined), [section])
  const registry = useLoad(() => unwrap(api.GET('/api/registry')), [])

  return (
    <div className="page admin-page">
      <h1 className="page-title">
        运营管理台
        <small>业务包、评分策略与检查点保存即生效，每次保存生成新版本，新会话使用新版本</small>
      </h1>
      <div className="admin-grid">
        <nav className="panel admin-nav">
          {(['可配置', '只读'] as const).map((g) => (
            <div key={g}>
              <div className="admin-nav-group">{g}</div>
              {SECTIONS.filter((s) => s.group === g).map((s) => (
                <button key={s.key} className={`case-item ${s.key === section ? 'on' : ''}`} onClick={() => setParams({ s: s.key })}>
                  {s.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="admin-main">
          {section === 'packs' && <Packs rules={rules.data} registry={registry.data} />}
          {section === 'policy' && (
            <ConfigEditor
              kind="policy"
              configKey="default"
              title="评分与策略"
              hint="还款意愿评分权重、等级阈值与策略表；所有业务包共用。"
              form={(d, set) => <PolicyForm draft={d} set={set} />}
            />
          )}
          {section === 'checkpoints' && (
            <ConfigEditor
              kind="checkpoints"
              configKey="default"
              title="合规检查点"
              hint="三个检查点（坐席话术、运营操作、客户输入）启用的规则、处置覆盖与各规则的检测参数（关键词、正则、时段、频次）。"
            />
          )}
          {section === 'intents' && (
            <ConfigEditor
              kind="intents"
              configKey="default"
              title="意图映射"
              hint="说话人识别标记、客户与运营意图关键词、意图到系统意图的映射、兜底情绪。"
            />
          )}
          {section === 'rules' && <RulesView rules={rules.data} />}
          {section === 'templates' && <TemplatesView templates={templates.data} />}
          {section === 'registry' && <RegistryView groups={registry.data} />}
        </div>
      </div>
    </div>
  )
}

function Packs({ rules, registry }: { rules: { rule_id: string; rule_type: string | null }[] | undefined; registry: { owner: string; items: { name?: unknown; kind?: unknown }[] }[] | undefined }) {
  const { message } = App.useApp()
  const list = useLoad(() => unwrap(api.GET('/api/config')), [])
  const emotions = useLoad(() => unwrap(api.GET('/api/config/{kind}/{key}', { params: { path: { kind: 'intents', key: 'default' } } })), [])
  const packs = (list.data ?? []).filter((c) => c.kind === 'business_pack')
  const [picked, setPicked] = useState<string | null>(null)
  const selected = packs.some((p) => p.key === picked) ? picked : (packs[0]?.key ?? null)
  const [copyOpen, setCopyOpen] = useState(false)
  const [form] = Form.useForm<{ new_key: string; name: string }>()

  const opts: PackFormOptions = useMemo(
    () => ({
      rules: (rules ?? []).map((r) => ({ value: r.rule_id, label: `${r.rule_id} ${r.rule_type ?? ''}` })),
      tools: (registry?.find((g) => g.owner === 'ops')?.items ?? []).filter((i) => i.kind === 'tool').map((i) => String(i.name)),
      emotions: ((emotions.data?.content as { emotions?: string[] } | undefined)?.emotions ?? []) as string[],
    }),
    [rules, registry, emotions.data],
  )

  const copy = async () => {
    if (!selected) return
    const v = await form.validateFields()
    try {
      const doc = await unwrap(api.POST('/api/config/business_pack/{key}/copy', { params: { path: { key: selected } }, body: v }))
      message.success(`已复制为新业务包 ${doc.key}`)
      setCopyOpen(false)
      form.resetFields()
      await list.reload()
      setPicked(doc.key)
    } catch (e) {
      message.error(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="packs">
      <div className="pack-cards">
        {packs.map((p) => (
          <button key={p.key} className={`pack-card ${p.key === selected ? 'on' : ''}`} onClick={() => setPicked(p.key)}>
            <div className="pack-card-name">{p.name}</div>
            <div className="mono hint">
              {p.key} · {p.version}
            </div>
          </button>
        ))}
        <Button icon={<CopyOutlined />} disabled={!selected} onClick={() => setCopyOpen(true)}>
          复制新建
        </Button>
      </div>
      {selected && (
        <ConfigEditor
          key={selected}
          kind="business_pack"
          configKey={selected}
          title={
            <span>
              业务包 <Tag className="mono">{selected}</Tag>
            </span>
          }
          hint="保存前会校验：引用的工具、Skill、规则、分期模板必须存在，话术模板占位符合法，只能有一个默认业务包等；不通过时不生效。"
          form={(d, set) => <PackForm draft={d} set={set} opts={opts} />}
          onSaved={() => void list.reload()}
        />
      )}
      <Modal title={`复制业务包 ${selected ?? ''}`} open={copyOpen} onOk={() => void copy()} okText="复制" onCancel={() => setCopyOpen(false)}>
        <p className="hint">复制全部配置为新业务包；新包默认不作为默认业务包，可再调整适用贷款类型与话术。</p>
        <Form form={form} layout="vertical">
          <Form.Item name="new_key" label="新业务包编号" rules={[{ required: true }, { pattern: /^[a-z][a-z0-9_]*$/, message: '小写字母开头，仅含小写字母、数字、下划线' }]}>
            <Input className="mono" placeholder="例如 mortgage" />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="例如 房贷催收" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
