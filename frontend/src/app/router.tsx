import { Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { App } from '../App'
import { AppShell } from './AppShell'
import {
  Chat,
  CollectionsPage,
  DocumentDetailPage,
  DocumentsPage,
  HistoryPage,
  PageLoadingFallback,
  SearchPage,
  SettingsPage,
} from './lazyPages'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <Suspense fallback={<PageLoadingFallback />}><Chat /></Suspense>,
          },
          {
            path: 'documents',
            element: <Suspense fallback={<PageLoadingFallback />}><DocumentsPage /></Suspense>,
          },
          {
            path: 'documents/:id',
            element: <Suspense fallback={<PageLoadingFallback />}><DocumentDetailPage /></Suspense>,
          },
          {
            path: 'collections',
            element: <Suspense fallback={<PageLoadingFallback />}><CollectionsPage /></Suspense>,
          },
          {
            path: 'search',
            element: <Suspense fallback={<PageLoadingFallback />}><SearchPage /></Suspense>,
          },
          {
            path: 'history',
            element: <Suspense fallback={<PageLoadingFallback />}><HistoryPage /></Suspense>,
          },
          {
            path: 'settings',
            element: <Suspense fallback={<PageLoadingFallback />}><SettingsPage /></Suspense>,
          },
        ],
      },
    ],
  },
])
