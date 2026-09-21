import { useEffect, useState } from 'react'
import {
  PanelLeft,
  Plus,
  FileText,
  ChevronDown,
  Trash2,
  Search,
} from 'lucide-react'
import { useChatStore } from '../../store/chat.store'
import { useDocumentStore } from '../../store/document.store'
import { ThemeToggle } from '../ui/ThemeToggle'
import { FileIcon } from '../ui/FileIcon'
import { ConfirmationDialog } from '../ui/ConfirmationDialog'
import { deleteDocument } from '../../services/upload.service'
import { toast } from 'sonner'

interface SidebarProps {
  open: boolean
  onClose: () => void
  onToggle: () => void
}

function groupSessionsByDate(sessions: { id: string; title: string; updatedAt: string }[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)

  const groups: { label: string; sessions: typeof sessions }[] = []
  const todaySessions: typeof sessions = []
  const yesterdaySessions: typeof sessions = []
  const olderSessions: typeof sessions = []

  for (const s of sessions) {
    const d = new Date(s.updatedAt)
    if (d >= today) todaySessions.push(s)
    else if (d >= yesterday) yesterdaySessions.push(s)
    else olderSessions.push(s)
  }

  if (todaySessions.length) groups.push({ label: 'Today', sessions: todaySessions })
  if (yesterdaySessions.length) groups.push({ label: 'Yesterday', sessions: yesterdaySessions })
  if (olderSessions.length) groups.push({ label: 'Older', sessions: olderSessions })

  return groups
}

export function Sidebar({ open, onClose, onToggle }: SidebarProps) {
  const {
    sessions,
    activeSessionId,
    createSession,
    setActiveSession,
    deleteSession,
    loadServerConversations,
    syncSessionFromServer,
  } = useChatStore()

  const documents = useDocumentStore((s) => s.documents)
  const activeDocumentId = useDocumentStore((s) => s.activeDocumentId)
  const setActiveDocument = useDocumentStore((s) => s.setActiveDocument)
  const removeDocument = useDocumentStore((s) => s.removeDocument)

  const [docsExpanded, setDocsExpanded] = useState(true)
  const [docSearch, setDocSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Load server conversations on mount
  useEffect(() => {
    loadServerConversations()
  }, [loadServerConversations])

  // Sync messages from server when switching sessions
  useEffect(() => {
    if (activeSessionId) {
      syncSessionFromServer(activeSessionId)
    }
  }, [activeSessionId, syncSessionFromServer])

  const filteredDocs = docSearch
    ? documents.filter((d) =>
        d.filename.toLowerCase().includes(docSearch.toLowerCase())
      )
    : documents

  const handleDeleteDocument = async (documentId: string) => {
    setDeletingId(documentId)
    try {
      await deleteDocument(documentId)
      removeDocument(documentId)
      toast.success('Document deleted')
    } catch {
      toast.error('Failed to delete document')
    } finally {
      setDeletingId(null)
      setDeleteConfirm(null)
    }
  }

  const grouped = groupSessionsByDate(
    sessions.map((s) => ({ id: s.id, title: s.title, updatedAt: s.updatedAt }))
  )

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={!!deleteConfirm}
        title="Delete document?"
        description="This will remove the document and all its indexed content. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={!!deletingId}
        onConfirm={() => deleteConfirm && void handleDeleteDocument(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Sidebar panel */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-40
          w-[260px] shrink-0 flex flex-col
          bg-zinc-50 dark:bg-zinc-900
          border-r border-zinc-200 dark:border-zinc-800
          transition-transform duration-200 ease-out
          lg:transition-none
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        role="navigation"
        aria-label="Sidebar"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 h-14 shrink-0 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center shrink-0">
              <FileText size={13} className="text-white dark:text-zinc-900" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
                DocuChat
              </h1>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate leading-tight">
                AI Document Workspace
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors lg:hidden"
          >
            <PanelLeft size={16} />
          </button>
        </div>

        {/* New chat + toggle */}
        <div className="px-3 py-2.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              createSession()
              setActiveDocument(null)
              if (window.innerWidth < 1024) onClose()
            }}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.98] transition-all"
          >
            <Plus size={14} />
            New chat
          </button>
          <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={onToggle}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors hidden lg:flex"
          >
            <PanelLeft size={16} />
          </button>
        </div>

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto px-1.5 py-1">
          {grouped.map((group) => (
            <div key={group.label} className="mb-1">
              <div className="px-2 py-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {group.label}
                </span>
              </div>
              <div className="space-y-px">
                {group.sessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => {
                      setActiveSession(session.id)
                      if (window.innerWidth < 1024) onClose()
                    }}
                    className={`group w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-left transition-colors ${
                      session.id === activeSessionId
                        ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <span className="text-xs truncate">{session.title}</span>
                    {sessions.length > 1 && (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Delete ${session.title}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSession(session.id)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation()
                            deleteSession(session.id)
                          }
                        }}
                        className="p-0.5 rounded opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all shrink-0"
                      >
                        <Trash2 size={12} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="px-2 py-8 text-center">
              <p className="text-xs text-zinc-400 dark:text-zinc-500">No conversations yet</p>
            </div>
          )}
        </div>

        {/* Documents section */}
        <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setDocsExpanded((prev) => !prev)}
            className="flex items-center gap-1.5 w-full px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
          >
            <ChevronDown
              size={12}
              className={`text-zinc-400 transition-transform duration-200 shrink-0 ${
                docsExpanded ? 'rotate-0' : '-rotate-90'
              }`}
            />
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Documents
            </span>
            <span className="text-[10px] text-zinc-300 dark:text-zinc-600 ml-auto mr-1">
              {documents.length}
            </span>
          </button>

          {docsExpanded && (
            <div className="px-2 pb-2 max-h-56 overflow-y-auto">
              {/* Search */}
              {documents.length > 3 && (
                <div className="relative mb-1.5">
                  <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600" />
                  <input
                    type="text"
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full pl-6 pr-2 py-1.5 text-[11px] bg-zinc-100 dark:bg-zinc-800 border-0 rounded-md text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-600 transition-shadow"
                  />
                </div>
              )}

              {/* Document list */}
              {filteredDocs.map((doc) => (
                <div
                  key={doc.document_id}
                  className={`group flex items-center rounded-md transition-colors ${
                    activeDocumentId === doc.document_id
                      ? 'bg-zinc-200 dark:bg-zinc-800'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveDocument(doc.document_id)}
                    className="flex-1 flex items-center gap-2 px-2 py-1.5 min-w-0 text-left"
                  >
                    <FileIcon type={doc.file_type} />
                    <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate">
                      {doc.filename}
                    </span>
                    {activeDocumentId === doc.document_id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${doc.filename}`}
                    onClick={() => setDeleteConfirm(doc.document_id)}
                    className="mr-1.5 p-0.5 rounded opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all shrink-0"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}

              {filteredDocs.length === 0 && documents.length > 0 && (
                <p className="px-2 py-3 text-[11px] text-zinc-400 text-center">No documents found</p>
              )}
              {documents.length === 0 && (
                <div className="px-2 py-4 text-center">
                  <FileText size={20} className="mx-auto mb-1.5 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">No documents yet</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-3 py-2 border-t border-zinc-200 dark:border-zinc-800">
          <ThemeToggle />
        </div>
      </aside>
    </>
  )
}
