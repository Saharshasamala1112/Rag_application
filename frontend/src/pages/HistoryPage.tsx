import { useState, useMemo } from 'react'
import { Clock, Trash2, MessageSquare, Search } from 'lucide-react'
import { useChatStore } from '../store/chat.store'
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog'

export function HistoryPage() {
  const sessions = useChatStore((s) => s.sessions)
  const activeSessionId = useChatStore((s) => s.activeSessionId)
  const setActiveSession = useChatStore((s) => s.setActiveSession)
  const deleteSession = useChatStore((s) => s.deleteSession)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const sorted = useMemo(() => {
    const filtered = sessions.filter((s) =>
      search.trim() === '' || s.title.toLowerCase().includes(search.toLowerCase())
    )
    return [...filtered].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }, [sessions, search])

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteSession(deleteTarget)
    setDeleteTarget(null)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 h-12 border-b border-edge dark:border-edge-dark shrink-0 flex items-center gap-3">
        <h1 className="text-sm font-semibold text-fg dark:text-fg-dark">Chat History</h1>
        {sessions.length > 0 && (
          <div className="relative ml-4 flex-1 max-w-xs">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-tertiary dark:text-fg-dark-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-surface-secondary dark:bg-surface-dark-elevated border border-edge dark:border-edge-dark rounded-md text-fg dark:text-fg-dark placeholder-fg-tertiary focus:outline-none focus:ring-1 focus:ring-accent/40"
            />
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-surface-secondary dark:bg-surface-dark-elevated mx-auto">
              <Clock size={24} className="text-fg-muted dark:text-fg-dark-tertiary" />
            </div>
            <p className="text-sm font-medium text-fg-secondary dark:text-fg-dark-secondary mb-1">
              {search ? 'No matching conversations' : 'No conversations yet'}
            </p>
            <p className="text-xs text-fg-tertiary dark:text-fg-dark-tertiary">
              {search ? 'Try a different search' : 'Start chatting to build your history'}
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-6 py-4 space-y-2">
            {sorted.map((session) => {
              const lastMsg = session.messages[session.messages.length - 1]
              const preview = lastMsg?.content?.slice(0, 100) || ''
              return (
                <div
                  key={session.id}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors cursor-pointer ${
                    activeSessionId === session.id
                      ? 'border-accent/30 dark:border-accent-dark/30 bg-accent-subtle dark:bg-accent-dark-subtle'
                      : 'border-edge dark:border-edge-dark hover:border-edge-strong dark:hover:border-edge-dark-strong bg-surface dark:bg-surface-dark'
                  }`}
                  onClick={() => {
                    setActiveSession(session.id)
                    window.location.href = '/'
                  }}
                >
                  <MessageSquare size={14} className="text-fg-tertiary dark:text-fg-dark-tertiary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-fg dark:text-fg-dark truncate">
                      {session.title || 'Untitled conversation'}
                    </p>
                    {preview && (
                      <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary truncate mt-0.5">
                        {preview}
                      </p>
                    )}
                    <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary mt-0.5">
                      {session.messages.length} message{session.messages.length !== 1 ? 's' : ''} · {new Date(session.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget(session.id)
                    }}
                    className="p-1.5 rounded text-fg-muted hover:text-danger dark:text-fg-dark-tertiary dark:hover:text-danger-dark opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete conversation"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmationDialog
        open={!!deleteTarget}
        title="Delete conversation"
        description="This will permanently remove this conversation and all its messages."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
