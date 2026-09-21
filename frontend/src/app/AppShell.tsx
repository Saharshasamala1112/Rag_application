import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { ContextPanel } from '../components/layout/ContextPanel'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [contextPanelOpen, setContextPanelOpen] = useState(false)

  useKeyboardShortcuts()

  return (
    <div className="flex h-screen overflow-hidden bg-app dark:bg-app-dark">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((p) => !p)}
      />

      <main className="flex flex-1 flex-col min-w-0 relative">
        <Outlet context={{ contextPanelOpen, toggleContextPanel: () => setContextPanelOpen((p) => !p) }} />
      </main>

      <ContextPanel
        open={contextPanelOpen}
        onClose={() => setContextPanelOpen(false)}
      />
    </div>
  )
}
