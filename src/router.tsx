import { createBrowserRouter } from 'react-router'
import { Shell } from './Shell'
import { AdminPage } from './pages/AdminPage'
import { CasesPage } from './pages/CasesPage'
import { ChatPage } from './pages/ChatPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <ChatPage /> },
      { path: 'cases', element: <CasesPage /> },
      { path: 'cases/:caseId', element: <CasesPage /> },
      { path: 'admin', element: <AdminPage /> },
    ],
  },
])
