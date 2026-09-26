import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, Layers } from 'lucide-react'
import { Sidebar } from '../components/layout/Sidebar'
import { ContextPanel } from '../components/layout/ContextPanel'
import { KeyboardShortcutsHelp } from '../components/ui/KeyboardShortcutsHelp'
import { useKeyboardShortcuts, useHelpDialog } from '../hooks/useKeyboardShortcuts'
import { useChatStore } from '../store/chat.store'
import { MEDIA_QUERIES } from '../lib/breakpoints'
import { useMediaQuery } from '../lib/useMediaQuery'
import { cn } from '../lib/utils'
import type { ChatSource } from '../types/chat'

export interface AppShellContext {
  contextPanelOpen: boolean
  toggleContextPanel: () => void
  selectSource: (source: ChatSource) => void
}

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [contextPanelOpen, setContextPanelOpen] = useState(false)
  const [selectedSource, setSelectedSource] = useState<ChatSource | null>(null)
  const { open: helpOpen, setOpen: setHelpOpen } = useHelpDialog()
  const isDesktop = useMediaQuery(MEDIA_QUERIES.desktop)

  useKeyboardShortcuts()
  const selectSource = useCallback((source: ChatSource) => {
    setSelectedSource(source)
    setContextPanelOpen(true)
  }, [])
  const toggleContextPanel = useCallback(() => setContextPanelOpen((p) => !p), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const closeContextPanel = useCallback(() => setContextPanelOpen(false), [])

  // Escape dismisses the drawer, unless the shortcut is already used to stop a stream.
  useEffect(() => {
    if (isDesktop) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (useChatStore.getState().activeStream) return
      setSidebarOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isDesktop])

  return (
    <div className="flex h-screen overflow-hidden bg-app dark:bg-app-dark">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((p) => !p)}
        open={sidebarOpen}
        onClose={closeSidebar}
        isDesktop={isDesktop}
      />

      <main className="flex flex-1 flex-col min-w-0 relative">
        {!isDesktop && (
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-edge dark:border-edge-dark bg-surface dark:bg-surface-dark px-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={sidebarOpen}
              aria-controls="app-sidebar"
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-md transition-colors',
                'text-fg-secondary hover:text-fg hover:bg-surface-secondary',
                'dark:text-fg-dark-secondary dark:hover:text-fg-dark dark:hover:bg-surface-dark-elevated',
              )}
            >
              <Menu size={16} />
            </button>
            <span className="flex items-center gap-2 min-w-0">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-accent/10 dark:bg-accent-dark/10 shrink-0">
                <Layers size={13} className="text-accent dark:text-accent-dark" />
              </span>
              <span className="text-sm font-semibold text-fg dark:text-fg-dark tracking-tight truncate">
                RAG Workspace
              </span>
            </span>
          </header>
        )}

        <Outlet context={{
          contextPanelOpen,
          toggleContextPanel,
          selectSource,
        }} />
      </main>

      <ContextPanel
        open={contextPanelOpen}
        onClose={closeContextPanel}
        selectedSource={selectedSource}
        isDesktop={isDesktop}
      />

      <KeyboardShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
