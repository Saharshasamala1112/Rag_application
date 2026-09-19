import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { ChatBox } from '../components/chat/ChatBox'
import { ChatInput } from '../components/chat/ChatInput'
import { useChat } from '../hooks/useChat'
import { useUpload } from '../hooks/useUpload'
import { useDocumentStore } from '../store/document.store'

const quickPrompts = [
  'Summarize this document',
  'What are the key points?',
  'Explain the main concepts',
  'What conclusions are drawn?',
]

export const Chat = () => {
  const {
    messages,
    loading,
    ask,
    clearMessages,
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

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSubmit = async (q: string) => {
    await ask(q)
  }

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

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-4">
      {/* Sidebar */}
      <aside
        className={`${showSidebar ? 'w-72' : 'w-0'} shrink-0 transition-all duration-300 overflow-hidden flex flex-col border border-slate-200 rounded-2xl bg-white`}
      >
        <div className="p-4 border-b border-slate-100">
          <button
            type="button"
            onClick={createSession}
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            + New Chat
          </button>
        </div>

        <div className="p-3 border-b border-slate-100">
          <p className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Documents
          </p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            <button
              type="button"
              onClick={() => setActiveDocument(null)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                !activeDocumentId
                  ? 'bg-slate-100 font-medium text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              All documents
            </button>
            {documents.map((doc) => (
              <button
                key={doc.document_id}
                type="button"
                onClick={() => setActiveDocument(doc.document_id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition truncate ${
                  activeDocumentId === doc.document_id
                    ? 'bg-slate-100 font-medium text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {doc.filename}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <p className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Sessions
          </p>
          <div className="space-y-1">
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
                    className="mr-1 p-1 rounded opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition"
                  >
                    ×
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
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            Clear messages
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col gap-4 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowSidebar(!showSidebar)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition"
            >
              ☰
            </button>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">RAG Assistant</h1>
              <p className="text-xs text-slate-500">
                {activeDocumentId
                  ? `Querying: ${documents.find((d) => d.document_id === activeDocumentId)?.filename ?? 'document'}`
                  : 'Querying all documents'}
              </p>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Thinking...
            </div>
          ) : null}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-6">
          {messages.length > 0 ? (
            <ChatBox messages={messages} isTyping={loading} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="text-4xl mb-4">💬</div>
              <h2 className="text-lg font-semibold text-slate-900">Ask anything</h2>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Upload documents and ask questions. The AI finds relevant information
                and provides accurate answers with sources.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2 max-w-lg">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void handleSubmit(prompt)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Upload + Input */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          {selectedFile ? (
            <div className="mb-3 flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-sky-900">{selectedFile.name}</p>
                <p className="text-xs text-sky-600">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="rounded-lg px-3 py-1.5 text-xs text-sky-600 hover:bg-sky-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleUpload()}
                  disabled={uploading}
                  className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          ) : null}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.csv,.json,.html,.htm,.xml,.log,.py,.js,.ts,.java,.c,.cpp,.go,.rs,.rb,.php,.sh,.yaml,.yml,.toml,.ini,.cfg,.conf,.sql,.r,.swift,.kt,.scala,.tex,.bib,.rtf"
            className="hidden"
            onChange={handleFileChange}
          />

          <ChatInput
            onSubmit={handleSubmit}
            disabled={loading}
            onUploadClick={() => fileInputRef.current?.click()}
            uploadDisabled={uploading}
          />
        </div>
      </main>
    </div>
  )
}
