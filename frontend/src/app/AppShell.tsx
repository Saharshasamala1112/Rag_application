import { useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { ContextPanel } from '../components/layout/ContextPanel'
import { KeyboardShortcutsHelp } from '../components/ui/KeyboardShortcutsHelp'
import { useKeyboardShortcuts, useHelpDialog } from '../hooks/useKeyboardShortcuts'
import type { ChatSource } from '../types/chat'

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [contextPanelOpen, setContextPanelOpen] = useState(false)
  const [selectedSource, setSelectedSource] = useState<ChatSource | null>(null)
  const { open: helpOpen, setOpen: setHelpOpen } = useHelpDialog()

  useKeyboardShortcuts()
  const selectSource = useCallback((source: ChatSource) => {
    setSelectedSource(source)
    setContextPanelOpen(true)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-app dark:bg-app-dark">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((p) => !p)}
      />

      <main className="flex flex-1 flex-col min-w-0 relative">
        <Outlet context={{
          contextPanelOpen,
          toggleContextPanel: () => setContextPanelOpen((p) => !p),
          selectSource,
        }} />
      </main>

      <ContextPanel
        open={contextPanelOpen}
        onClose={() => setContextPanelOpen(false)}
        selectedSource={selectedSource}
      />

      <KeyboardShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
