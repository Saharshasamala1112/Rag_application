import { useLocation } from 'react-router-dom'
import {
  MessageSquare,
  FileText,
  FolderOpen,
  Search,
  Clock,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Layers,
} from 'lucide-react'
import { NavItem } from '../navigation/NavItem'
import { UserMenu } from '../navigation/UserMenu'
import { ThemeToggle } from '../ui/ThemeToggle'
import { Tooltip } from '../ui/Tooltip'
import { Button } from '../ui/Button'
import { useDocumentStore } from '../../store/document.store'
import { useChatStore } from '../../store/chat.store'
import { cn } from '../../lib/utils'

const NAV_ITEMS = [
  { to: '/', icon: MessageSquare, label: 'Chat', exact: true },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/collections', icon: FolderOpen, label: 'Collections' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()
  const documents = useDocumentStore((s) => s.documents)
  const sessions = useChatStore((s) => s.sessions)
  const createSession = useChatStore((s) => s.createSession)
  const setActiveSession = useChatStore((s) => s.setActiveSession)

  const handleNewChat = () => {
    const id = createSession()
    setActiveSession(id)
    if (location.pathname !== '/') {
      window.location.href = '/'
    }
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-surface border-r border-edge',
        'dark:bg-surface-dark dark:border-edge-dark',
        'transition-all duration-200 ease-in-out',
        collapsed ? 'w-14' : 'w-56',
      )}
    >
      {/* Logo + Collapse */}
      <div className="flex h-12 items-center justify-between px-3 border-b border-edge dark:border-edge-dark shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-accent/10 dark:bg-accent-dark/10">
              <Layers size={13} className="text-accent dark:text-accent-dark" />
            </div>
            <span className="text-sm font-semibold text-fg dark:text-fg-dark tracking-tight truncate">
              RAG Workspace
            </span>
          </div>
        )}
        <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right">
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-md transition-colors',
              'text-fg-tertiary hover:text-fg hover:bg-surface-secondary',
              'dark:text-fg-dark-tertiary dark:hover:text-fg-dark dark:hover:bg-surface-dark-elevated',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </Tooltip>
      </div>

      {/* New Chat */}
      <div className="px-2 pt-3 pb-1 shrink-0">
        {collapsed ? (
          <Tooltip content="New Chat" side="right">
            <button
              type="button"
              onClick={handleNewChat}
              className={cn(
                'flex items-center justify-center w-full h-8 rounded-lg transition-colors',
                'bg-accent text-white hover:bg-accent-hover',
                'dark:bg-accent-dark dark:text-app-dark dark:hover:bg-accent-dark-hover',
              )}
              aria-label="New chat"
            >
              <Plus size={14} />
            </button>
          </Tooltip>
        ) : (
          <Button
            variant="primary"
            size="md"
            onClick={handleNewChat}
            className="w-full"
          >
            <Plus size={14} />
            New Chat
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5" role="navigation" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            collapsed={collapsed}
            exact={item.exact}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-edge dark:border-edge-dark px-2 py-2 space-y-1 shrink-0">
        {!collapsed && (
          <div className="flex items-center justify-between px-2.5 py-1 text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
            <span>{documents.length} docs</span>
            <span className="text-fg-muted dark:text-fg-dark-tertiary">·</span>
            <span>{sessions.length} chats</span>
          </div>
        )}
        <div className="flex items-center">
          <ThemeToggle collapsed={collapsed} />
        </div>
        <UserMenu collapsed={collapsed} />
      </div>
    </aside>
  )
}
