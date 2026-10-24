import { api, unwrap } from '../api/client'
import type { SessionListItem } from '../api/types'
import { useLoad } from '../lib/useLoad'
import { sessionStateLabel } from './session'

interface Props {
  currentId: string | null
  revision: string
  onOpen: (item: SessionListItem) => void
}

export function SessionList({ currentId, revision, onOpen }: Props) {
  const list = useLoad(() => unwrap(api.GET('/api/sessions')), [revision])
  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <div className="panel-head">
        <span className="label">会话</span>
        <span className="mono" style={{ color: 'var(--muted)', fontSize: 12 }}>
          {list.data?.length ?? 0} 条
        </span>
      </div>
      <div className="session-list">
        {list.data?.map((item) => (
          <button
            key={item.session_id}
            className={`session-item ${currentId === item.session_id ? 'on' : ''}`}
            onClick={() => onOpen(item)}
          >
            <span className="session-item-top">
              <span className="mono cid">{item.session_id}</span>
              <span className="mono owe">{sessionStateLabel(item)}</span>
            </span>
            <span className="meta">
              {item.customer_id} · {item.mode} · {item.started_at.slice(5, 16).replace('T', ' ')}
              {item.end_reason ? ` · ${item.end_reason}` : ''}
            </span>
          </button>
        ))}
        {list.error && <div className="hint" style={{ padding: '4px 8px 8px' }}>{list.error}</div>}
        {list.data?.length === 0 && <div className="hint" style={{ padding: '4px 8px 8px' }}>还没有会话</div>}
      </div>
    </div>
  )
}
