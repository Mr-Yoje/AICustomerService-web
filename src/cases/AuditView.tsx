import { DownloadOutlined } from '@ant-design/icons'
import { Button, Input, Select, Table, Tag, Tooltip } from 'antd'
import { useState } from 'react'
import { api, unwrap } from '../api/client'
import type { AuditRow } from '../api/types'
import { useLoad } from '../lib/useLoad'
import { time } from '../lib/format'
import { CHECKPOINTS } from './status'

const LEVEL_COLOR: Record<string, string> = { 严重: 'red', 中等: 'orange', 一般: 'gold', 轻微: 'default' }

export function AuditView() {
  const [ruleId, setRuleId] = useState<string>()
  const [checkpoint, setCheckpoint] = useState<string>()
  const [cid, setCid] = useState('')
  const [cidQuery, setCidQuery] = useState('')
  const rules = useLoad(() => unwrap(api.GET('/api/rules')), [])
  const rows = useLoad(
    () =>
      unwrap(
        api.GET('/api/audit', {
          params: { query: { rule_id: ruleId ?? '', checkpoint: checkpoint ?? '', customer_id: cidQuery, limit: 500 } },
        }),
      ),
    [ruleId, checkpoint, cidQuery],
  )
  const hits = rows.data?.filter((r) => r.rule_id).length ?? 0

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="filters">
          <Select
            allowClear
            placeholder="规则"
            style={{ width: 200 }}
            value={ruleId}
            onChange={setRuleId}
            options={rules.data?.map((r) => ({ value: r.rule_id, label: `${r.rule_id} ${r.rule_type ?? ''}` }))}
          />
          <Select
            allowClear
            placeholder="检查点"
            style={{ width: 130 }}
            value={checkpoint}
            onChange={setCheckpoint}
            options={CHECKPOINTS.map((c) => ({ value: c, label: c }))}
          />
          <Input.Search
            allowClear
            placeholder="客户编号"
            style={{ width: 160 }}
            value={cid}
            onChange={(e) => setCid(e.target.value)}
            onSearch={(v) => setCidQuery(v.trim())}
          />
          <span className="hint" style={{ margin: 0 }}>
            共 {rows.data?.length ?? 0} 条，命中规则 {hits} 条（最多显示 500 条）
          </span>
        </div>
        <Button icon={<DownloadOutlined />} href="/api/audit/export">
          导出全部 CSV
        </Button>
      </div>
      <Table<AuditRow>
        size="small"
        rowKey="log_id"
        loading={rows.loading}
        dataSource={rows.data}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        scroll={{ x: 1280 }}
        columns={[
          { title: '时间', dataIndex: 'ts', width: 140, render: time },
          { title: '检查点', dataIndex: 'checkpoint', width: 88, render: (v: string) => <Tag>{v}</Tag> },
          { title: '客户', dataIndex: 'customer_id', width: 72, render: (v: string | null) => <span className="mono">{v ?? '—'}</span> },
          { title: '场景', dataIndex: 'scene', width: 130, ellipsis: true },
          {
            title: '内容',
            dataIndex: 'content',
            ellipsis: { showTitle: false },
            render: (v: string | null) => (
              <Tooltip title={v} placement="topLeft">
                {v}
              </Tooltip>
            ),
          },
          {
            title: '命中规则',
            dataIndex: 'rule_id',
            width: 140,
            render: (v: string | null, r) =>
              v ? (
                <span>
                  <b className="mono" style={{ color: 'var(--vermilion)' }}>
                    {v}
                  </b>{' '}
                  {r.rule_type}
                </span>
              ) : (
                <span className="hint">通过</span>
              ),
          },
          { title: '级别', dataIndex: 'level', width: 64, render: (v: string | null) => v && <Tag color={LEVEL_COLOR[v]}>{v}</Tag> },
          { title: '处置', dataIndex: 'action', width: 160, ellipsis: true },
          { title: '转人工', dataIndex: 'handoff', width: 64, render: (v: number) => (v ? <Tag color="red">是</Tag> : '') },
          { title: '会话', dataIndex: 'session_id', width: 100, render: (v: string | null) => <span className="mono">{v ?? '—'}</span> },
          { title: '配置版本', dataIndex: 'config_version', width: 190, render: (v: string | null) => <span className="mono hint">{v}</span> },
        ]}
      />
    </div>
  )
}
