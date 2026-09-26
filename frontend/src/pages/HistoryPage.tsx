import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Trash2, MessageSquare, Search } from 'lucide-react'
import { useChatStore } from '../store/chat.store'
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog'

export function HistoryPage() {
  const navigate = useNavigate()
  const sessions = useChatStore((s) => s.sessions)
  const activeSessionId = useChatStore((s) => s.activeSessionId)
  const setActiveSession = useChatStore((s) => s.setActiveSession)
  const deleteSession = useChatStore((s) => s.deleteSession)
  const loadServerConversations = useChatStore((s) => s.loadServerConversations)
  const syncSessionFromServer = useChatStore((s) => s.syncSessionFromServer)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  useEffect(() => {
    void loadServerConversations()
  }, [loadServerConversations])

  const sorted = useMemo(() => {
    const filtered = sessions.filter(
      (s) => search.trim() === '' || s.title.toLowerCase().includes(search.toLowerCase()),
    )
    return [...filtered].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }, [sessions, search])

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteSession(deleteTarget)
    setDeleteTarget(null)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-edge px-6 dark:border-edge-dark">
        <h1 className="text-sm font-semibold text-fg dark:text-fg-dark">Chat History</h1>
        {sessions.length > 0 && (
          <div className="relative ml-4 max-w-xs flex-1">
            <Search
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-tertiary dark:text-fg-dark-tertiary"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search conversations"
              placeholder="Search conversations..."
              className="w-full rounded-md border border-edge bg-surface-secondary py-1.5 pl-8 pr-3 text-[11px] text-fg placeholder-fg-tertiary focus:outline-none focus:ring-1 focus:ring-accent/40 dark:border-edge-dark dark:bg-surface-dark-elevated dark:text-fg-dark"
            />
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-surface-secondary dark:bg-surface-dark-elevated">
              <Clock size={24} className="text-fg-muted dark:text-fg-dark-tertiary" />
            </div>
            <p className="mb-1 text-sm font-medium text-fg-secondary dark:text-fg-dark-secondary">
              {search ? 'No matching conversations' : 'No conversations yet'}
            </p>
            <p className="text-xs text-fg-tertiary dark:text-fg-dark-tertiary">
              {search ? 'Try a different search' : 'Start chatting to build your history'}
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-2 px-6 py-4">
            {sorted.map((session) => {
              const lastMsg = session.messages[session.messages.length - 1]
              const preview = lastMsg?.content?.slice(0, 100) || ''
              return (
                <div
                  key={session.id}
                  className={`group flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                    activeSessionId === session.id
                      ? 'border-accent/30 bg-accent-subtle dark:border-accent-dark/30 dark:bg-accent-dark-subtle'
                      : 'border-edge bg-surface hover:border-edge-strong dark:border-edge-dark dark:bg-surface-dark dark:hover:border-edge-dark-strong'
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={activeSessionId === session.id}
                    onClick={() => {
                      setActiveSession(session.id)
                      void syncSessionFromServer(session.id)
                      void navigate('/')
                    }}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <MessageSquare
                      size={14}
                      className="shrink-0 text-fg-tertiary dark:text-fg-dark-tertiary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-fg dark:text-fg-dark">
                        {session.title || 'Untitled conversation'}
                      </p>
                      {preview && (
                        <p className="mt-0.5 truncate text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
                          {preview}
                        </p>
                      )}
                      <p className="mt-0.5 text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
                        {session.messages.length} message{session.messages.length !== 1 ? 's' : ''}{' '}
                        · {new Date(session.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget(session.id)
                    }}
                    className="rounded p-1.5 text-fg-muted hover:text-danger dark:text-fg-dark-tertiary dark:hover:text-danger-dark"
                    title="Delete conversation"
                    aria-label={`Delete ${session.title || 'conversation'}`}
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
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
