import { NavLink, useLocation } from 'react-router-dom'
import {
  MessageSquare,
  FileText,
  FolderOpen,
  Search,
  Settings,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
} from 'lucide-react'
import { ThemeToggle } from '../ui/ThemeToggle'
import { useDocumentStore } from '../../store/document.store'
import { useChatStore } from '../../store/chat.store'

const NAV_ITEMS = [
  { to: '/', icon: MessageSquare, label: 'Chat' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/collections', icon: FolderOpen, label: 'Collections' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

interface SidebarNavProps {
  open: boolean
  onToggle: () => void
}

export function SidebarNav({ open, onToggle }: SidebarNavProps) {
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
      className={`flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 transition-all duration-200 ease-in-out ${
        open ? 'w-56' : 'w-14'
      }`}
    >
      {/* Header */}
      <div className="flex h-12 items-center justify-between px-3 border-b border-zinc-200 dark:border-zinc-800">
        {open && (
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 tracking-tight">
            DocuChat
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {open ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
        </button>
      </div>

      {/* New Chat button */}
      <div className="px-2 pt-2 pb-1">
        <button
          type="button"
          onClick={handleNewChat}
          className={`flex items-center gap-2 w-full rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors font-medium ${
            open ? 'px-3 py-2 text-xs' : 'justify-center px-0 py-2'
          }`}
          title="New chat"
        >
          <Plus size={14} />
          {open && <span>New Chat</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to)

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-700 dark:hover:text-zinc-300'
              } ${!open ? 'justify-center px-0' : ''}`}
              title={open ? undefined : item.label}
            >
              <Icon size={15} className="shrink-0" />
              {open && <span>{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Stats + Theme */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 px-2 py-2 space-y-1">
        {open && (
          <div className="flex items-center justify-between px-2.5 py-1 text-[10px] text-zinc-400 dark:text-zinc-500">
            <span>{documents.length} docs</span>
            <span>{sessions.length} chats</span>
          </div>
        )}
        <ThemeToggle collapsed={!open} />
      </div>
    </aside>
  )
}
