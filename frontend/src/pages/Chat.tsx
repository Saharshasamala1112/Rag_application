import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import {
  PanelLeft,
  Send,
  Trash2,
  Plus,
  Paperclip,
  Loader2,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
  X,
  FileText,
  Clock,
} from 'lucide-react'
import { useChat } from '../hooks/useChat'
import { useUpload } from '../hooks/useUpload'
import { useDocumentStore } from '../store/document.store'
import { deleteDocument } from '../services/upload.service'
import type { ChatMessage as ChatMessageType, ChatSource } from '../types/chat'

const quickPrompts = [
  'Summarize this document',
  'What are the key findings?',
  'Explain the main concepts',
  'List all important definitions',
  'What conclusions are drawn?',
  'Compare different viewpoints',
]

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function FileIcon({ type }: { type: string }) {
  const ext = type.replace('.', '').toLowerCase()
  const colors: Record<string, { light: string; dark: string }> = {
    pdf: {
      light: 'bg-red-100 text-red-600',
      dark: 'dark:bg-red-900/30 dark:text-red-400',
    },
    doc: {
      light: 'bg-blue-100 text-blue-600',
      dark: 'dark:bg-blue-900/30 dark:text-blue-400',
    },
    docx: {
      light: 'bg-blue-100 text-blue-600',
      dark: 'dark:bg-blue-900/30 dark:text-blue-400',
    },
    txt: {
      light: 'bg-slate-100 text-slate-600',
      dark: 'dark:bg-slate-700 dark:text-slate-400',
    },
    md: {
      light: 'bg-purple-100 text-purple-600',
      dark: 'dark:bg-purple-900/30 dark:text-purple-400',
    },
    csv: {
      light: 'bg-green-100 text-green-600',
      dark: 'dark:bg-green-900/30 dark:text-green-400',
    },
    json: {
      light: 'bg-yellow-100 text-yellow-600',
      dark: 'dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    html: {
      light: 'bg-orange-100 text-orange-600',
      dark: 'dark:bg-orange-900/30 dark:text-orange-400',
    },
  }
  const color = colors[ext] || {
    light: 'bg-slate-100 text-slate-500',
    dark: 'dark:bg-slate-700 dark:text-slate-400',
  }
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-5 rounded text-[10px] font-bold uppercase ${color.light} ${color.dark}`}
    >
      {ext.slice(0, 3)}
    </span>
  )
}

type ThemeMode = 'light' | 'dark' | 'system'

function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system'
    return (localStorage.getItem('docuchat-theme') as ThemeMode) || 'system'
  })

  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem('docuchat-theme')
    if (saved === 'dark') return true
    if (saved === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    if (mode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mq.matches)
      setDark(mq.matches)
      const handler = (e: MediaQueryListEvent) => {
        applyTheme(e.matches)
        setDark(e.matches)
      }
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }

    applyTheme(mode === 'dark')
    setDark(mode === 'dark')
  }, [mode])

  const cycle = () => {
    const next: ThemeMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light'
    setMode(next)
    localStorage.setItem('docuchat-theme', next)
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${mode}. Click to cycle.`}
      className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
      title={`Theme: ${mode}`}
    >
      {mode === 'system' ? <Monitor size={16} /> : dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

function MessageBubble({ message, onSelectSource }: { message: ChatMessageType; onSelectSource?: (source: ChatSource) => void }) {
  const isUser = message.role === 'user'
  const [sourcesExpanded, setSourcesExpanded] = useState(false)

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? '' : 'w-full max-w-[80%]'}`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-zinc-200 flex items-center justify-center text-white dark:text-zinc-900">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              DocuChat
            </span>
            <span className="text-[10px] text-zinc-300 dark:text-zinc-600">
              &middot;
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {formatTime(message.createdAt)}
            </span>
            {message.isStreaming && (
              <>
                <span className="text-[10px] text-zinc-300 dark:text-zinc-600">
                  &middot;
                </span>
                <span className="text-[10px] text-emerald-500 animate-pulse">
                  streaming
                </span>
              </>
            )}
          </div>
        )}

        {isUser ? (
          <div className="rounded-3xl rounded-br-md bg-[#2f2f2f] text-white px-5 py-3.5 shadow-sm">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </p>
          </div>
        ) : (
          <div className="px-1 py-1">
            <div className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-headings:mt-3 prose-headings:mb-1.5 prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-pre:bg-slate-50 dark:prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-slate-700 prose-code:text-slate-800 dark:prose-code:text-slate-200 prose-code:bg-slate-100 dark:prose-code:bg-slate-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-a:text-sky-600 dark:prose-a:text-sky-400">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content ||
                  (message.isStreaming ? '' : 'No response generated.')}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block h-4 w-0.5 bg-zinc-900 dark:bg-zinc-200 animate-pulse ml-0.5" />
              )}
            </div>
          </div>
        )}

        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-800/50 p-4">
            <button
              type="button"
              onClick={() => setSourcesExpanded((prev) => !prev)}
              className="flex items-center gap-1.5 mb-0 w-full text-left"
            >
              <ChevronDown
                size={14}
                className={`text-zinc-400 transition-transform duration-200 ${
                  sourcesExpanded ? 'rotate-180' : ''
                }`}
              />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Sources ({message.sources.length})
              </p>
            </button>
            {sourcesExpanded && (
              <div className="space-y-2 mt-2.5">
                {message.sources.map((source, idx) => (
                  <div
                    key={`${source.source}-${source.chunk_id}-${idx}`}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {source.source}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {source.page_number && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                            p.{source.page_number}
                          </span>
                        )}
                        {source.header && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                            {source.header}
                          </span>
                        )}
                        <span className="rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                          {source.score}%
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {source.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Mobile "Open sources panel" button */}
        {!isUser && message.sources && message.sources.length > 0 && !sourcesExpanded && onSelectSource && (
          <button
            type="button"
            onClick={() => onSelectSource(message.sources![0])}
            className="xl:hidden mt-2 text-[11px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
          >
            View all sources in panel →
          </button>
        )}
      </div>
    </div>
  )
}

function SourcesPanel({
  sources,
  onClose,
  mobile = false,
}: {
  sources: ChatSource[]
  onClose: () => void
  mobile?: boolean
}) {
  if (!sources.length) return null
  return (
    <aside
      className={`
        ${mobile ? 'w-full h-full fixed inset-0 z-50 bg-zinc-50 dark:bg-zinc-900' : 'w-[320px] shrink-0 border-l border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30 overflow-y-auto hidden xl:block'}
      `}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Sources ({sources.length})
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
        >
          <X size={14} />
        </button>
      </div>
      <div className="p-3 space-y-2">
        {sources.map((source, idx) => (
          <div
            key={`${source.source}-${source.chunk_id}-${idx}`}
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <FileText size={12} className="text-zinc-400 shrink-0" />
              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {source.source}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              {source.page_number && (
                <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                  <span>p.{source.page_number}</span>
                </span>
              )}
              {source.header && (
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                  {source.header}
                </span>
              )}
              <span className="ml-auto rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                {source.score}%
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-4">
              {source.content}
            </p>
          </div>
        ))}
      </div>
    </aside>
  )
}

export const Chat = () => {
  const {
    messages,
    loading,
    status,
    ask,
    sessions,
    activeSessionId,
    createSession,
    setActiveSession,
    deleteSession,
  } = useChat()

  const { upload, loading: uploading, fetchDocuments } = useUpload()
  const documents = useDocumentStore((s) => s.documents)
  const activeDocumentId = useDocumentStore((s) => s.activeDocumentId)
  const setActiveDocument = useDocumentStore((s) => s.setActiveDocument)
  const removeDocument = useDocumentStore((s) => s.removeDocument)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [isDragOver, setIsDragOver] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [docsExpanded, setDocsExpanded] = useState(true)
  const [panelSources, setPanelSources] = useState<ChatSource[] | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [mobileView, setMobileView] = useState<'chat' | 'sources'>('chat')

  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] ?? null)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploadProgress(10)
    const timer = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 5, 90))
    }, 300)
    try {
      const doc = await upload(selectedFile)
      setUploadProgress(100)
      setTimeout(() => {
        setUploadProgress(0)
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        if (doc) setActiveDocument(doc.document_id)
        fetchDocuments()
      }, 500)
    } catch {
      setUploadProgress(0)
    } finally {
      clearInterval(timer)
    }
  }

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) setSelectedFile(file)
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleSubmit = async () => {
    const q = inputValue.trim()
    if (!q || loading) return
    setInputValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    await ask(q)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

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

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-[#212121]">
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Delete Document
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
              Are you sure you want to delete this document? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteDocument(deleteConfirm)}
                disabled={deletingId !== null}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50 transition"
              >
                {deletingId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drag overlay - full screen */}
      {isDragOver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="rounded-2xl border-2 border-dashed border-sky-400 bg-white dark:bg-zinc-800 px-12 py-10 text-center shadow-xl">
            <Paperclip
              size={48}
              className="mx-auto mb-3 text-sky-500 dark:text-sky-400"
            />
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Drop your document here
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              PDF, DOCX, TXT, MD, CSV, JSON, HTML, and more
            </p>
          </div>
        </div>
      )}

      {/* Mobile sidebar backdrop */}
      {showSidebar && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          showSidebar ? 'w-full sm:w-[260px]' : 'w-0'
        } shrink-0 transition-all duration-300 overflow-hidden flex flex-col bg-[#171717] fixed lg:relative inset-y-0 left-0 z-40`}
      >
        <div className="p-3 flex flex-col h-full">
          {/* New chat button */}
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                createSession()
                setActiveDocument(null)
              }}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800 active:scale-[0.98]"
            >
              <Plus size={16} />
              New chat
            </button>
            <button
              type="button"
              aria-label="Toggle sidebar"
              onClick={() => setShowSidebar(false)}
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
            >
              <PanelLeft size={18} />
            </button>
          </div>

          {/* Sessions list */}
          <div className="flex-1 overflow-y-auto space-y-0.5">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center rounded-lg transition ${
                  session.id === activeSessionId
                    ? 'bg-zinc-800'
                    : 'hover:bg-zinc-800/60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveSession(session.id)
                    if (window.innerWidth < 1024) setShowSidebar(false)
                  }}
                  className="flex-1 px-3 py-2 text-left text-sm truncate text-zinc-300"
                >
                  {session.title}
                </button>
                {sessions.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Delete ${session.title}`}
                    onClick={() => deleteSession(session.id)}
                    className="mr-2 p-1 rounded opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Documents section */}
          <div className="mt-2 border-t border-zinc-800 pt-2">
            <button
              type="button"
              onClick={() => setDocsExpanded((prev) => !prev)}
              className="flex items-center gap-1.5 w-full px-2 mb-1 text-left"
            >
              <ChevronDown
                size={14}
                className={`text-zinc-500 transition-transform duration-200 ${
                  docsExpanded ? 'rotate-0' : '-rotate-90'
                }`}
              />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Documents
              </span>
              <span className="ml-auto text-[10px] text-zinc-600">
                {documents.length}
              </span>
            </button>
            {docsExpanded && (
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {/* Upload progress bar */}
                {uploadProgress > 0 && (
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Loader2 size={10} className="text-emerald-400 animate-spin" />
                      <span className="text-[10px] text-zinc-400">
                        {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Processing...'}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                {documents.map((doc) => (
                  <div
                    key={doc.document_id}
                    className={`group flex items-center rounded-lg transition ${
                      activeDocumentId === doc.document_id
                        ? 'bg-zinc-800'
                        : 'hover:bg-zinc-800/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveDocument(doc.document_id)}
                      className={`flex-1 flex items-center gap-2 px-3 py-2 text-left text-sm ${
                        activeDocumentId === doc.document_id
                          ? 'font-medium text-zinc-100'
                          : 'text-zinc-400'
                      }`}
                    >
                      <FileIcon type={doc.file_type} />
                      <span className="truncate flex-1">{doc.filename}</span>
                      {activeDocumentId === doc.document_id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${doc.filename}`}
                      onClick={() => setDeleteConfirm(doc.document_id)}
                      className="mr-2 p-1 rounded opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {documents.length === 0 && (
                  <p className="px-3 py-4 text-xs text-zinc-600 text-center">
                    No documents uploaded yet
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Theme toggle at bottom */}
          <div className="mt-2 border-t border-zinc-800 pt-2 flex items-center justify-between">
            <span className="text-xs text-zinc-500 px-2">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main
        className="flex flex-1 flex-col min-w-0 relative"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
          {!showSidebar && (
            <button
              type="button"
              aria-label="Toggle sidebar"
              onClick={() => setShowSidebar(true)}
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
            >
              <PanelLeft size={18} />
            </button>
          )}
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {activeDocumentId
              ? `Querying: ${documents.find((d) => d.document_id === activeDocumentId)?.filename || 'Document'}`
              : `${documents.length} document${documents.length !== 1 ? 's' : ''} available`}
          </p>
          {loading && status && (
            <div className="ml-auto flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <Loader2 size={12} className="animate-spin" />
              {status}
            </div>
          )}
          {loading && !status && (
            <div className="ml-auto flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <Loader2 size={12} className="animate-spin" />
              Analyzing...
            </div>
          )}
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 py-6"
          role="log"
          aria-live="polite"
        >
          {messages.length > 0 ? (
            <div className="space-y-6 max-w-[48rem] mx-auto">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onSelectSource={(source) => setPanelSources([source])}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center max-w-lg mx-auto">
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
                How can I help you today?
              </h2>
              <div className="grid grid-cols-2 gap-2 w-full">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInputValue(prompt)}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-left text-sm text-zinc-600 dark:text-zinc-400 transition hover:border-zinc-900 dark:hover:border-zinc-300 hover:bg-zinc-900 dark:hover:bg-zinc-200 hover:text-white dark:hover:text-zinc-900 active:scale-[0.98]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <div className="px-4 pb-4 pt-2">
          <div className="max-w-[48rem] mx-auto">
            {/* Upload preview chip */}
            {selectedFile && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2">
                <FileIcon
                  type={selectedFile.name.split('.').pop() || ''}
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate flex-1">
                  {selectedFile.name}
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
                <button
                  type="button"
                  aria-label="Cancel upload"
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
                >
                  <X size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Upload and index document"
                  onClick={() => void handleUpload()}
                  disabled={uploading}
                  className="rounded-lg bg-zinc-900 dark:bg-zinc-200 px-3 py-1.5 text-xs font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-300 disabled:opacity-50 transition"
                >
                  {uploading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    'Upload'
                  )}
                </button>
              </div>
            )}

            {/* Input box */}
            <div className="flex items-end gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 shadow-sm focus-within:border-zinc-400 dark:focus-within:border-zinc-500 focus-within:shadow-md transition-all">
              <button
                type="button"
                aria-label="Upload document"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="shrink-0 rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-50"
              >
                <Paperclip size={18} />
              </button>
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 200) + 'px'
                }}
                onKeyDown={handleKeyDown}
                placeholder="Message DocuChat..."
                rows={1}
                className="flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
              <button
                type="button"
                aria-label="Send message"
                onClick={() => void handleSubmit()}
                disabled={loading || !inputValue.trim()}
                className="shrink-0 rounded-xl bg-zinc-900 dark:bg-zinc-200 p-2 text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-center text-[10px] text-zinc-300 dark:text-zinc-600 mt-2">
              Enter to send &middot; Shift+Enter for new line &middot; Drag &
              drop documents to upload
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,.html,.htm,.xml,.log,.py,.js,.ts,.java,.c,.cpp,.go,.rs,.rb,.php,.sh,.yaml,.yml,.toml,.ini,.cfg,.conf,.sql,.r,.swift,.kt,.scala,.tex,.bib,.rtf"
          className="hidden"
          onChange={handleFileChange}
        />
      </main>

      {/* Sources Panel - shown when viewing sources */}
      {panelSources && panelSources.length > 0 && (
        <SourcesPanel
          sources={panelSources}
          onClose={() => setPanelSources(null)}
        />
      )}

      {/* Default sources panel for last message with sources */}
      {!panelSources && messages.length > 0 && (() => {
        const lastWithSources = [...messages].reverse().find((m) => m.sources && m.sources.length > 0)
        if (!lastWithSources || lastWithSources.isStreaming) return null
        return (
          <SourcesPanel
            sources={lastWithSources.sources!}
            onClose={() => {}}
          />
        )
      })()}
    </div>
  )
}
