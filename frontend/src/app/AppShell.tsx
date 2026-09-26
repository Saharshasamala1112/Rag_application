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

      <main className="relative flex min-w-0 flex-1 flex-col">
        {!isDesktop && (
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-edge bg-surface px-3 dark:border-edge-dark dark:bg-surface-dark">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={sidebarOpen}
              aria-controls="app-sidebar"
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                'text-fg-secondary hover:bg-surface-secondary hover:text-fg',
                'dark:text-fg-dark-secondary dark:hover:bg-surface-dark-elevated dark:hover:text-fg-dark',
              )}
            >
              <Menu size={16} />
            </button>
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 dark:bg-accent-dark/10">
                <Layers size={13} className="text-accent dark:text-accent-dark" />
              </span>
              <span className="truncate text-sm font-semibold tracking-tight text-fg dark:text-fg-dark">
                RAG Workspace
              </span>
            </span>
          </header>
        )}

        <Outlet
          context={{
            contextPanelOpen,
            toggleContextPanel,
            selectSource,
          }}
        />
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
