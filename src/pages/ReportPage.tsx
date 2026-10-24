import { Empty } from 'antd'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useParams } from 'react-router'
import { api, unwrap } from '../api/client'
import { useLoad } from '../lib/useLoad'
import { time } from '../lib/format'

export function ReportPage() {
  const { artifactId = '' } = useParams()
  const art = useLoad(
    () => unwrap(api.GET('/api/artifacts/{artifact_id}', { params: { path: { artifact_id: artifactId } } })),
    [artifactId],
  )
  if (art.error) return <Empty description={art.error} />
  if (!art.data) return <div className="hint">加载中…</div>
  const content = art.data.content as { markdown?: string } | null
  return (
    <div className="page">
      <h1 className="page-title">
        {art.data.kind}
        <small className="mono">
          {art.data.artifact_id} · {time(art.data.created_at)}
        </small>
      </h1>
      <div className="panel" style={{ padding: 16, overflow: 'auto' }}>
        {content?.markdown ? (
          <div className="markdown">
            <Markdown remarkPlugins={[remarkGfm]}>{content.markdown}</Markdown>
          </div>
        ) : (
          <pre className="pkg-val">{JSON.stringify(art.data.content, null, 2)}</pre>
        )}
      </div>
    </div>
  )
}
