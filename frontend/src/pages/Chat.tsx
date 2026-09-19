import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useChat } from '../hooks/useChat'
import { useUpload } from '../hooks/useUpload'
import { useDocumentStore } from '../store/document.store'
import type { ChatMessage as ChatMessageType } from '../types/chat'

const quickPrompts = [
  'Summarize this document',
  'What are the key findings?',
  'Explain the main concepts',
  'List all important definitions',
  'What conclusions are drawn?',
  'Compare different viewpoints',
]

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function FileIcon({ type }: { type: string }) {
  const ext = type.replace('.', '').toLowerCase()
  const colors: Record<string, string> = {
    pdf: 'bg-red-100 text-red-600',
    doc: 'bg-blue-100 text-blue-600',
    docx: 'bg-blue-100 text-blue-600',
    txt: 'bg-slate-100 text-slate-600',
    md: 'bg-purple-100 text-purple-600',
    csv: 'bg-green-100 text-green-600',
    json: 'bg-yellow-100 text-yellow-600',
    html: 'bg-orange-100 text-orange-600',
  }
  const cls = colors[ext] || 'bg-slate-100 text-slate-500'
  return (
    <span className={`inline-flex items-center justify-center w-6 h-5 rounded text-[10px] font-bold uppercase ${cls}`}>
      {ext.slice(0, 3)}
    </span>
  )
}

function MessageBubble({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? '' : 'w-full max-w-[80%]'}`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-xs font-medium text-slate-500">DocuChat</span>
            <span className="text-[10px] text-slate-300">&middot;</span>
            <span className="text-[10px] text-slate-400">{formatTime(message.createdAt)}</span>
            {message.isStreaming && (
              <>
                <span className="text-[10px] text-slate-300">&middot;</span>
                <span className="text-[10px] text-emerald-500 animate-pulse">streaming</span>
              </>
            )}
          </div>
        )}

        {isUser ? (
          <div className="rounded-2xl rounded-br-md bg-slate-900 text-white px-5 py-3.5 shadow-sm">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          </div>
        ) : (
          <div className="rounded-2xl rounded-bl-md bg-white border border-slate-200 px-5 py-4 shadow-sm">
            <div className="prose prose-sm prose-slate max-w-none prose-headings:mt-3 prose-headings:mb-1.5 prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 prose-code:text-slate-800 prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-strong:text-slate-900 prose-a:text-sky-600">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content || (message.isStreaming ? '' : 'No response generated.')}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block h-4 w-0.5 bg-slate-900 animate-pulse ml-0.5" />
              )}
            </div>
          </div>
        )}

        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Sources ({message.sources.length})
            </p>
            <div className="space-y-2">
              {message.sources.map((source, idx) => (
                <div
                  key={`${source.source}-${source.chunk_id}-${idx}`}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-900 truncate">
                      {source.source}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {source.page_number && (
                        <span className="text-[10px] text-slate-400">p.{source.page_number}</span>
                      )}
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        {(source.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  {source.header && (
                    <p className="text-[11px] font-medium text-sky-600 mb-1">{source.header}</p>
                  )}
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {source.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const Chat = () => {
  const {
    messages, loading, ask, clearMessages, sessions,
    activeSessionId, createSession, setActiveSession, deleteSession,
  } = useChat()

  const { upload, loading: uploading, fetchDocuments } = useUpload()
  const documents = useDocumentStore((s) => s.documents)
  const activeDocumentId = useDocumentStore((s) => s.activeDocumentId)
  const setActiveDocument = useDocumentStore((s) => s.setActiveDocument)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [isDragOver, setIsDragOver] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] ?? null)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    const doc = await upload(selectedFile)
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (doc) setActiveDocument(doc.document_id)
    await fetchDocuments()
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

  return (
    <div className="flex h-[calc(100vh-1rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      {/* Sidebar */}
      <aside
        className={`${showSidebar ? 'w-80' : 'w-0'} shrink-0 transition-all duration-300 overflow-hidden flex flex-col border-r border-slate-100 bg-slate-50/50`}
      >
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">DocuChat</h2>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">v2.0</span>
          </div>
          <button
            type="button"
            onClick={() => { createSession(); setActiveDocument(null) }}
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 active:scale-[0.98]"
          >
            + New Conversation
          </button>
        </div>

        <div className="px-3 pb-3">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Documents</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-medium text-sky-600 hover:text-sky-700"
            >
              + Upload
            </button>
          </div>
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => setActiveDocument(null)}
              className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                !activeDocumentId
                  ? 'bg-slate-900 font-medium text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="w-5 text-center text-xs">All</span>
              <span className="truncate">All Documents</span>
              <span className="ml-auto text-[10px] opacity-50">{documents.length}</span>
            </button>
            {documents.map((doc) => (
              <button
                key={doc.document_id}
                type="button"
                onClick={() => setActiveDocument(doc.document_id)}
                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeDocumentId === doc.document_id
                    ? 'bg-slate-900 font-medium text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileIcon type={doc.file_type} />
                <span className="truncate flex-1">{doc.filename}</span>
                {activeDocumentId === doc.document_id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            ))}
            {documents.length === 0 && (
              <p className="px-3 py-4 text-xs text-slate-400 text-center">
                No documents uploaded yet
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100" />

        <div className="flex-1 overflow-y-auto p-3">
          <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Conversations
          </p>
          <div className="space-y-0.5">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center rounded-lg transition ${
                  session.id === activeSessionId ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveSession(session.id)}
                  className="flex-1 px-3 py-2 text-left text-sm truncate text-slate-700"
                >
                  {session.title}
                </button>
                {sessions.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => deleteSession(session.id)}
                    className="mr-2 p-1 rounded opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition text-xs"
                  >
                    x
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-slate-100">
          <button
            type="button"
            onClick={clearMessages}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Clear Conversation
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main
        className="flex flex-1 flex-col min-w-0 relative"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowSidebar(!showSidebar)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <h1 className="text-sm font-semibold text-slate-900">
                {activeDocumentId
                  ? documents.find((d) => d.document_id === activeDocumentId)?.filename || 'Document'
                  : 'All Documents'}
              </h1>
              <p className="text-[11px] text-slate-400">
                {activeDocumentId ? 'Querying specific document' : `Querying ${documents.length} document${documents.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          {loading && (
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Analyzing...
            </div>
          )}
        </div>

        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/10 backdrop-blur-sm rounded-2xl">
            <div className="rounded-2xl border-2 border-dashed border-sky-400 bg-white px-12 py-10 text-center shadow-xl">
              <div className="text-4xl mb-3">&#128196;</div>
              <p className="text-sm font-medium text-slate-900">Drop your document here</p>
              <p className="text-xs text-slate-500 mt-1">PDF, DOCX, TXT, MD, CSV, JSON, HTML, and more</p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length > 0 ? (
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center mb-6 shadow-lg">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">DocuChat Assistant</h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-8">
                Upload any document and ask questions. I will find the exact information you need with source citations.
              </p>
              <div className="grid grid-cols-2 gap-2 w-full">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInputValue(prompt)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-600 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white active:scale-[0.98]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Upload preview */}
        {selectedFile && (
          <div className="mx-6 mb-2 flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <FileIcon type={selectedFile.name.split('.').pop() || ''} />
              <div>
                <p className="text-sm font-medium text-sky-900">{selectedFile.name}</p>
                <p className="text-xs text-sky-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="rounded-lg px-3 py-1.5 text-xs text-sky-600 hover:bg-sky-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleUpload()}
                disabled={uploading}
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50 transition"
              >
                {uploading ? 'Processing...' : 'Upload & Index'}
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-6 pb-6 pt-2">
          <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm focus-within:border-slate-900 focus-within:shadow-md transition-all">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              title="Upload document"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your documents..."
              rows={1}
              className="flex-1 resize-none rounded-xl border-0 bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={loading || !inputValue.trim()}
              className="shrink-0 rounded-xl bg-slate-900 p-2.5 text-white transition hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-300 mt-2">
            Enter to send &middot; Shift+Enter for new line &middot; Drag & drop documents to upload
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,.html,.htm,.xml,.log,.py,.js,.ts,.java,.c,.cpp,.go,.rs,.rb,.php,.sh,.yaml,.yml,.toml,.ini,.cfg,.conf,.sql,.r,.swift,.kt,.scala,.tex,.bib,.rtf"
          className="hidden"
          onChange={handleFileChange}
        />
      </main>
    </div>
  )
}
