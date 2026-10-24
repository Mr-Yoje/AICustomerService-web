import { Collapse, Empty, Tag, Timeline, Tooltip } from 'antd'
import type { MainTurn, TraceEvent } from '../api/types'
import { ownerLabel } from '../lib/agents'
import { levelColor, short, STATUS_COLOR } from '../lib/format'

const STEP_LABEL: Record<string, string> = {
  route: '路由',
  understand: '理解',
  decide: '决策',
  call: '调用',
  guard: '合规',
  reply: '话术',
  memory: '记忆',
}

function DetailLine({ detail }: { detail: Record<string, unknown> }) {
  const entries = Object.entries(detail).filter(([k, v]) => k !== 'owner' && v !== null && v !== undefined && v !== '')
  if (entries.length === 0) return null
  return (
    <div className="trace-detail">
      {entries.slice(0, 6).map(([k, v]) => (
        <Tooltip key={k} title={<pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(v, null, 2)}</pre>}>
          <span>
            <b>{k}</b> {short(v, 48)}
          </span>
        </Tooltip>
      ))}
    </div>
  )
}

export function AgentTrace({
  trace,
  turn,
  open,
  busy,
  onToggle,
}: {
  trace: TraceEvent[]
  turn?: MainTurn
  open: boolean
  busy: boolean
  onToggle: () => void
}) {
  const label = `处理轨迹 · ${trace.length} 步${busy && !turn ? ' · 处理中' : ''}`
  return (
    <Collapse
      className="agent-trace"
      size="small"
      activeKey={open ? ['trace'] : []}
      onChange={onToggle}
      items={[
        {
          key: 'trace',
          label: (
            <span>
              {label}
              {turn?.trace_id && <span className="mono trace-id">{turn.trace_id}</span>}
            </span>
          ),
          children: (
            <div className="agent-trace-body">
              {turn && <TurnSummary turn={turn} />}
              {trace.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无轨迹" />}
              <Timeline
                items={trace.map((e, i) => ({
                  key: i,
                  color: STATUS_COLOR[e.status] ?? 'gray',
                  content: (
                    <div className="trace-item">
                      <div>
                        <Tag bordered={false} className="step-tag">
                          {STEP_LABEL[e.step] ?? e.step}
                        </Tag>
                        <span className="trace-name">{e.name}</span>
                        {typeof e.detail?.owner === 'string' && (
                          <Tag bordered={false}>{ownerLabel(e.detail.owner)}</Tag>
                        )}
                        {e.status !== 'ok' && <Tag color={STATUS_COLOR[e.status]}>{e.status}</Tag>}
                        {e.ms > 0 && <span className="mono trace-ms">{e.ms}ms</span>}
                      </div>
                      <DetailLine detail={e.detail} />
                    </div>
                  ),
                }))}
              />
            </div>
          ),
        },
      ]}
    />
  )
}

export function TurnSummary({ turn }: { turn: MainTurn }) {
  return (
    <div className="turn-summary">
      <dl className="kv">
        <dt>系统意图</dt>
        <dd>
          <Tag color="cyan">{turn.system_intent}</Tag>
        </dd>
        <dt>说话人</dt>
        <dd>
          {{ operator: '运营', customer: '客户', agent: '坐席', unknown: '未判定' }[turn.speaker] ?? turn.speaker}
          <span style={{ color: 'var(--muted)', fontSize: 12 }}> · {turn.speaker_method}</span>
        </dd>
        <dt>命中规则</dt>
        <dd>
          {turn.hit_rules.length === 0 ? (
            <span style={{ color: 'var(--teal)' }}>未命中</span>
          ) : (
            turn.hit_rules.map((r) => (
              <Tag key={r} color="red" className="mono">
                {r}
              </Tag>
            ))
          )}
        </dd>
        {turn.willingness_score !== null && turn.willingness_score !== undefined && (
          <>
            <dt>还款意愿</dt>
            <dd>
              <span className="mono" style={{ fontWeight: 700, color: levelColor(turn.willingness_level) }}>
                {turn.willingness_score}
              </span>{' '}
              分 · {turn.willingness_level}
            </dd>
          </>
        )}
        {turn.strategy && (
          <>
            <dt>建议策略</dt>
            <dd>{turn.strategy}</dd>
          </>
        )}
        {turn.handoff && (
          <>
            <dt>人工接管</dt>
            <dd>
              <span className="stamp" style={{ color: 'var(--vermilion)' }}>
                {turn.handoff_package_id ? '已转人工' : '处置：人工接管'}
              </span>
            </dd>
          </>
        )}
      </dl>
      {turn.compliance
        .flatMap((c) => c.hits)
        .map((h, i) => (
          <div key={i} className="hit-card">
            <b className="mono">{h.rule_id}</b> {h.rule_type} · {h.level}
            <div>{h.rule_content}</div>
            <div className="hint">
              证据「{h.evidence}」→ {h.action}
            </div>
          </div>
        ))}
      {turn.needs_review && (
        <div className="review-box">
          <b>需人工复核</b>
          <ul>
            {turn.review_reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
      {turn.key_points.length > 0 && (
        <>
          <div className="sub-title">要点</div>
          <ul className="points">
            {turn.key_points.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
