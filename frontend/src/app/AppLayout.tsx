import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { SidebarNav } from '../components/layout/SidebarNav'
import { RightPanel } from '../components/layout/RightPanel'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-zinc-900">
      <SidebarNav open={sidebarOpen} onToggle={() => setSidebarOpen((p) => !p)} />

      <main className="flex flex-1 flex-col min-w-0 relative">
        <Outlet context={{ rightPanelOpen, toggleRightPanel: () => setRightPanelOpen((p) => !p) }} />
      </main>

      <RightPanel open={rightPanelOpen} onClose={() => setRightPanelOpen(false)} />
    </div>
  )
}
