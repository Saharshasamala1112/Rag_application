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
  /** Drawer visibility on screens below `lg`. Always rendered on desktop. */
  open: boolean
  /** Dismisses the drawer on screens below `lg`. */
  onClose: () => void
  /** Desktop layout: the sidebar sits in the flow. Below `lg` it is an overlay drawer. */
  isDesktop: boolean
}

export function Sidebar({ collapsed, onToggle, open, onClose, isDesktop }: SidebarProps) {
  const location = useLocation()
  const documents = useDocumentStore((s) => s.documents)
  const sessions = useChatStore((s) => s.sessions)
  const createSession = useChatStore((s) => s.createSession)
  const setActiveSession = useChatStore((s) => s.setActiveSession)

  // Below `lg` the sidebar only exists while the drawer is open, so closed
  // navigation is not reachable by keyboard or screen readers.
  if (!isDesktop && !open) return null

  const iconOnly = isDesktop && collapsed

  const handleNewChat = () => {
    const id = createSession()
    setActiveSession(id)
    if (location.pathname !== '/') {
      window.location.href = '/'
    }
  }

  return (
    <>
      {!isDesktop && (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          onClick={onClose}
          aria-hidden="true"
          data-testid="sidebar-backdrop"
        />
      )}
      <aside
        id="app-sidebar"
        className={cn(
          'flex h-full flex-col border-r border-edge bg-surface',
          'dark:border-edge-dark dark:bg-surface-dark',
          'transition-all duration-200 ease-in-out',
          isDesktop
            ? collapsed
              ? 'w-14'
              : 'w-56'
            : 'fixed inset-y-0 left-0 z-40 w-64 max-w-[80vw] shadow-xl',
        )}
      >
        {/* Logo + Collapse / Close */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-edge px-3 dark:border-edge-dark">
          {!iconOnly && (
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10 dark:bg-accent-dark/10">
                <Layers size={13} className="text-accent dark:text-accent-dark" />
              </div>
              <span className="truncate text-sm font-semibold tracking-tight text-fg dark:text-fg-dark">
                RAG Workspace
              </span>
            </div>
          )}
          <Tooltip
            content={
              isDesktop
                ? collapsed
                  ? 'Expand sidebar'
                  : 'Collapse sidebar'
                : 'Close navigation menu'
            }
            side="right"
          >
            <button
              type="button"
              onClick={isDesktop ? onToggle : onClose}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                'text-fg-tertiary hover:bg-surface-secondary hover:text-fg',
                'dark:text-fg-dark-tertiary dark:hover:bg-surface-dark-elevated dark:hover:text-fg-dark',
              )}
              aria-label={
                isDesktop
                  ? collapsed
                    ? 'Expand sidebar'
                    : 'Collapse sidebar'
                  : 'Close navigation menu'
              }
            >
              {isDesktop ? (
                collapsed ? (
                  <PanelLeftOpen size={15} />
                ) : (
                  <PanelLeftClose size={15} />
                )
              ) : (
                <PanelLeftClose size={15} />
              )}
            </button>
          </Tooltip>
        </div>

        {/* New Chat */}
        <div className="shrink-0 px-2 pb-1 pt-3">
          {iconOnly ? (
            <Tooltip content="New Chat" side="right">
              <button
                type="button"
                onClick={handleNewChat}
                className={cn(
                  'flex h-8 w-full items-center justify-center rounded-lg transition-colors',
                  'bg-accent text-white hover:bg-accent-hover',
                  'dark:bg-accent-dark dark:text-app-dark dark:hover:bg-accent-dark-hover',
                )}
                aria-label="New chat"
              >
                <Plus size={14} />
              </button>
            </Tooltip>
          ) : (
            <Button variant="primary" size="md" onClick={handleNewChat} className="w-full">
              <Plus size={14} />
              New Chat
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 space-y-0.5 overflow-y-auto px-2 py-1"
          role="navigation"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              collapsed={iconOnly}
              exact={item.exact}
              onClick={onClose}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 space-y-1 border-t border-edge px-2 py-2 dark:border-edge-dark">
          {!iconOnly && (
            <div className="flex items-center justify-between px-2.5 py-1 text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
              <span>{documents.length} docs</span>
              <span className="text-fg-muted dark:text-fg-dark-tertiary">·</span>
              <span>{sessions.length} chats</span>
            </div>
          )}
          <div className="flex items-center">
            <ThemeToggle collapsed={iconOnly} />
          </div>
          <UserMenu collapsed={iconOnly} />
        </div>
      </aside>
    </>
  )
}
