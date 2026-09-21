import { Clock, Trash2, MessageSquare } from 'lucide-react'
import { useChatStore } from '../store/chat.store'

export function HistoryPage() {
  const sessions = useChatStore((s) => s.sessions)
  const activeSession = useChatStore((s) => s.activeSession)
  const setActiveSession = useChatStore((s) => s.setActiveSession)
  const deleteSession = useChatStore((s) => s.deleteSession)

  const sorted = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 h-14 border-b border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center">
        <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Chat History</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 mx-auto">
              <Clock size={24} className="text-zinc-300 dark:text-zinc-600" />
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">No conversations</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Start chatting to build your history</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-6 py-4 space-y-2">
            {sorted.map((session) => (
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
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    {session.messages.length} messages · {new Date(session.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteSession(session.id)
                  }}
                  className="p-1.5 rounded text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete conversation"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
