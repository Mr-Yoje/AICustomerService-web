import { Alert, App, Button, Input, Modal, Segmented, Table, Tag } from 'antd'
import { useState, type ReactNode } from 'react'
import { ApiError, api, unwrap } from '../api/client'
import type { ConfigDoc, ConfigVersion } from '../api/types'
import { time } from '../lib/format'
import { useLoad } from '../lib/useLoad'
import { type Doc, fromYaml, setIn, toYaml } from './draft'

export type Setter = (path: (string | number)[], value: unknown) => void

type View = 'form' | 'yaml' | 'versions'

interface Props {
  kind: string
  configKey: string
  title: ReactNode
  hint?: string
  form?: (draft: Doc, set: Setter) => ReactNode
  onSaved?: (doc: ConfigDoc) => void
}

export function ConfigEditor(props: Props) {
  const { kind, configKey } = props
  const [view, setView] = useState<View>(props.form ? 'form' : 'yaml')
  const doc = useLoad(() => unwrap(api.GET('/api/config/{kind}/{key}', { params: { path: { kind, key: configKey } } })), [kind, configKey])
  if (doc.error) return <Alert type="error" showIcon title={doc.error} />
  if (!doc.data) return <div className="panel panel-body hint">加载中…</div>
  return (
    <Editor
      key={`${kind}/${configKey}/${doc.data.version}`}
      {...props}
      base={doc.data}
      view={view}
      setView={setView}
      onReload={() => void doc.reload()}
    />
  )
}

interface EditorProps extends Props {
  base: ConfigDoc
  view: View
  setView: (v: View) => void
  onReload: () => void
}

function Editor({ kind, configKey, title, hint, form, onSaved, base, view, setView, onReload }: EditorProps) {
  const { message } = App.useApp()
  const [draft, setDraft] = useState<Doc>(base.content)
  const [text, setText] = useState(() => toYaml(base.content))
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [peek, setPeek] = useState<ConfigVersion | null>(null)
  const versions = useLoad(
    () => (view === 'versions' ? unwrap(api.GET('/api/config/{kind}/{key}/versions', { params: { path: { kind, key: configKey } } })) : undefined),
    [view, kind, configKey],
  )

  const set: Setter = (path, value) => setDraft((d) => setIn(d, path, value))

  /** 当前编辑内容：YAML 视图以文本为准，其余以表单草稿为准。 */
  const current = (): Doc | null => {
    if (view !== 'yaml') return draft
    const r = fromYaml(text)
    if (!r.ok) {
      setErrors([`YAML 解析失败：${r.error}`])
      return null
    }
    return r.value
  }

  const switchView = (v: View) => {
    if (view === 'yaml' && v !== 'yaml') {
      const doc = current()
      if (!doc) return
      setDraft(doc)
    }
    if (v === 'yaml') setText(toYaml(draft))
    setErrors([])
    setView(v)
  }

  const dirty = view === 'yaml' ? text !== toYaml(base.content) : JSON.stringify(draft) !== JSON.stringify(base.content)

  const discard = () => {
    setDraft(base.content)
    setText(toYaml(base.content))
    setErrors([])
  }

  const save = async () => {
    const content = current()
    if (!content) return
    setSaving(true)
    try {
      const doc = await unwrap(api.PUT('/api/config/{kind}/{key}', { params: { path: { kind, key: configKey } }, body: { content } }))
      message.success(`已保存，新版本 ${doc.version}`)
      onSaved?.(doc)
      onReload()
    } catch (e) {
      setErrors(e instanceof ApiError && e.errors.length ? e.errors : [e instanceof Error ? e.message : String(e)])
    } finally {
      setSaving(false)
    }
  }

  const restore = (v: ConfigVersion) => {
    setDraft(v.content)
    setText(toYaml(v.content))
    setView(form ? 'form' : 'yaml')
    setPeek(null)
    message.info(`已载入版本 ${v.version}，保存后作为新版本生效`)
  }

  return (
    <div className="panel config-editor">
      <div className="panel-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="label">{title}</span>
          <Tag className="mono">{base.version}</Tag>
          {dirty && <Tag color="orange">未保存</Tag>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Segmented
            size="small"
            value={view}
            onChange={(v) => switchView(v as View)}
            options={[...(form ? [{ value: 'form', label: '表单' }] : []), { value: 'yaml', label: 'YAML' }, { value: 'versions', label: '版本历史' }]}
          />
          <Button size="small" disabled={!dirty} onClick={discard}>
            放弃修改
          </Button>
          <Button size="small" type="primary" loading={saving} disabled={!dirty || view === 'versions'} onClick={() => void save()}>
            保存
          </Button>
        </div>
      </div>
      <div className="panel-body">
        {hint && (
          <p className="hint" style={{ marginTop: 0 }}>
            {hint}
          </p>
        )}
        {errors.length > 0 && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            title={`保存未生效：${errors.length} 处错误`}
            description={
              <ul className="error-list">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            }
          />
        )}
        {view === 'form' && form?.(draft, set)}
        {view === 'yaml' && (
          <Input.TextArea className="yaml-editor" value={text} onChange={(e) => setText(e.target.value)} autoSize={{ minRows: 18, maxRows: 40 }} spellCheck={false} />
        )}
        {view === 'versions' && (
          <Table<ConfigVersion>
            size="small"
            rowKey={(v) => `${v.version}-${v.created_at}`}
            loading={versions.loading}
            dataSource={versions.data}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            columns={[
              {
                title: '版本',
                dataIndex: 'version',
                render: (v: string) => (
                  <span className="mono">
                    {v} {v === base.version && <Tag color="green">当前</Tag>}
                  </span>
                ),
              },
              { title: '保存时间', dataIndex: 'created_at', render: time },
              {
                title: '',
                width: 160,
                render: (_, v) => (
                  <span>
                    <Button size="small" type="link" onClick={() => setPeek(v)}>
                      查看
                    </Button>
                    {v.version !== base.version && (
                      <Button size="small" type="link" onClick={() => restore(v)}>
                        载入编辑
                      </Button>
                    )}
                  </span>
                ),
              },
            ]}
          />
        )}
      </div>
      <Modal title={`版本 ${peek?.version ?? ''}`} open={!!peek} onCancel={() => setPeek(null)} footer={null} width={720}>
        <pre className="pkg-val yaml-view">{peek && toYaml(peek.content)}</pre>
      </Modal>
    </div>
  )
}
