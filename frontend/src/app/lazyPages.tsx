import { lazy } from 'react'

export const Chat = lazy(() =>
  import('../pages/Chat').then((module) => ({ default: module.Chat })),
)
export const DocumentsPage = lazy(() =>
  import('../pages/DocumentsPage').then((module) => ({ default: module.DocumentsPage })),
)
export const DocumentDetailPage = lazy(() =>
  import('../pages/DocumentDetailPage').then((module) => ({
    default: module.DocumentDetailPage,
  })),
)
export const CollectionsPage = lazy(() =>
  import('../pages/CollectionsPage').then((module) => ({
    default: module.CollectionsPage,
  })),
)
export const SearchPage = lazy(() =>
  import('../pages/SearchPage').then((module) => ({ default: module.SearchPage })),
)
export const HistoryPage = lazy(() =>
  import('../pages/HistoryPage').then((module) => ({ default: module.HistoryPage })),
)
export const SettingsPage = lazy(() =>
  import('../pages/SettingsPage').then((module) => ({ default: module.SettingsPage })),
)

export function PageLoadingFallback() {
  return (
    <div
      className="flex flex-1 items-center justify-center text-xs text-fg-tertiary dark:text-fg-dark-tertiary"
      role="status"
      aria-live="polite"
    >
      Loading page...
    </div>
  )
}
