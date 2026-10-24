import { AuditOutlined, ControlOutlined, MessageOutlined } from '@ant-design/icons'
import { NavLink, Outlet } from 'react-router'

const NAV = [
  { to: '/', label: '对话台', icon: <MessageOutlined />, end: true },
  { to: '/cases', label: '案件审计', icon: <AuditOutlined />, end: false },
  { to: '/admin', label: '管理台', icon: <ControlOutlined />, end: false },
]

export function Shell() {
  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="app-brand">催收中枢</div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            {n.icon}
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
