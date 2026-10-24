import { createBrowserRouter } from 'react-router'
import { Shell } from './Shell'
import { AdminPage } from './pages/AdminPage'
import { CasesPage } from './pages/CasesPage'
import { ChatPage } from './pages/ChatPage'
import { CostPage } from './pages/CostPage'
import { ReportPage } from './pages/ReportPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <ChatPage /> },
      { path: 'cases', element: <CasesPage /> },
      { path: 'cases/:caseId', element: <CasesPage /> },
      { path: 'reports/:artifactId', element: <ReportPage /> },
      { path: 'costs', element: <CostPage /> },
      { path: 'admin', element: <AdminPage /> },
    ],
  },
])
