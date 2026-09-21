import { useState, useMemo } from 'react'
import { Clock, Trash2, MessageSquare, Search } from 'lucide-react'
import { useChatStore } from '../store/chat.store'
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog'

export function HistoryPage() {
  const sessions = useChatStore((s) => s.sessions)
  const activeSession = useChatStore((s) => s.activeSession)
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
      <div className="px-6 h-14 border-b border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center gap-3">
        <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Chat History</h1>
        {sessions.length > 0 && (
          <div className="relative ml-4 flex-1 max-w-xs">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            />
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 mx-auto">
              <Clock size={24} className="text-zinc-300 dark:text-zinc-600" />
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              {search ? 'No matching conversations' : 'No conversations yet'}
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
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
                    activeSession === session.id
                      ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                  }`}
                  onClick={() => {
                    setActiveSession(session.id)
                    window.location.href = '/'
                  }}
                >
                  <MessageSquare size={14} className="text-zinc-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {session.title || 'Untitled conversation'}
                    </p>
                    {preview && (
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                        {preview}
                      </p>
                    )}
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      {session.messages.length} message{session.messages.length !== 1 ? 's' : ''} · {new Date(session.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget(session.id)
                    }}
                    className="p-1.5 rounded text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
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
        loading={deleting}
      />
    </div>
  )
}
