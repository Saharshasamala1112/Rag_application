import { createBrowserRouter } from 'react-router-dom'
import { App } from '../App'
import { AppLayout } from './AppLayout'
import { Chat } from '../pages/Chat'
import { DocumentsPage } from '../pages/DocumentsPage'
import { DocumentDetailPage } from '../pages/DocumentDetailPage'
import { CollectionsPage } from '../pages/CollectionsPage'
import { SearchPage } from '../pages/SearchPage'
import { SettingsPage } from '../pages/SettingsPage'
import { HistoryPage } from '../pages/HistoryPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Chat /> },
          { path: 'documents', element: <DocumentsPage /> },
          { path: 'documents/:id', element: <DocumentDetailPage /> },
          { path: 'collections', element: <CollectionsPage /> },
          { path: 'search', element: <SearchPage /> },
          { path: 'history', element: <HistoryPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
])
