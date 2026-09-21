import { useCallback, useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import { Paperclip, PanelRightOpen, PanelRightClose } from 'lucide-react'
import { useChat } from '../hooks/useChat'
import { useUpload } from '../hooks/useUpload'
import { useDocumentStore } from '../store/document.store'
import { MessageBubble } from '../components/chat/MessageBubble'
import { EmptyState } from '../components/chat/EmptyState'
import { ChatComposer } from '../components/chat/ChatComposer'

interface LayoutContext {
  rightPanelOpen: boolean
  toggleRightPanel: () => void
}

export const Chat = () => {
  const { rightPanelOpen, toggleRightPanel } = useOutletContext<LayoutContext>()

  const {
    messages,
    loading,
    status,
    ask,
  } = useChat()

  const { upload, uploadTextContent, loading: uploading, fetchDocuments } = useUpload()
  const activeDocument = useDocumentStore((s) => s.activeDocument)
  const documents = useDocumentStore((s) => s.documents)
  const setActiveDocument = useDocumentStore((s) => s.setActiveDocument)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleUpload = async () => {
    if (!selectedFile) return
    try {
      const doc = await upload(selectedFile)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (doc) {
        setActiveDocument(doc.document_id)
        toast.success(`Uploaded "${doc.filename}" — ask a question about it`)
      }
      fetchDocuments()
    } catch {
      toast.error('Upload failed')
    }
  }

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) setSelectedFile(file)
    },
    [],
  )

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleSubmit = async () => {
    const q = inputValue.trim()
    if (!q || loading) return
    setInputValue('')

    const doc = await uploadTextContent(q, `query-${Date.now()}`)
    if (doc) {
      setActiveDocument(doc.document_id)
      fetchDocuments()
    }

    await ask(q)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  const activeDoc = documents.find((d) => d.document_id === activeDocument)

  return (
    <>
      {/* Drag overlay */}
      {isDragOver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          role="region"
          aria-label="Drop zone"
        >
          <div className="rounded-xl border-2 border-dashed border-emerald-400 bg-white dark:bg-zinc-800 px-12 py-10 text-center shadow-lg animate-scale-in">
            <Paperclip size={36} className="mx-auto mb-3 text-emerald-500" />
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Drop your document here
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              PDF, DOCX, TXT, MD, CSV, JSON, HTML, and more
            </p>
          </div>
        </div>
      )}

      {/* Chat header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {activeDoc ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium truncate max-w-[200px]">
                <span className="truncate">{activeDoc.filename}</span>
              </span>
              {loading && status && (
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 animate-pulse">
                  {status}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">New conversation</span>
          )}
        </div>
        <button
          type="button"
          onClick={toggleRightPanel}
          className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label={rightPanelOpen ? 'Close trace panel' : 'Open trace panel'}
          title="RAG Trace"
        >
          {rightPanelOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,.html,.htm,.xml,.log,.py,.js,.ts,.java,.c,.cpp,.go,.rs,.rb,.php,.sh,.yaml,.yml,.toml,.ini,.cfg,.conf,.sql,.r,.swift,.kt,.scala,.tex,.bib,.rtf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) setSelectedFile(file)
        }}
      />

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {messages.length > 0 ? (
          <div className="space-y-5 max-w-[800px] mx-auto px-4 py-6">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
              />
            ))}
          </div>
        ) : (
          <EmptyState onSelectPrompt={(p) => setInputValue(p)} />
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Composer */}
      <ChatComposer
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        loading={loading}
        selectedFile={selectedFile}
        onFileSelect={setSelectedFile}
        uploading={uploading}
        onUpload={handleUpload}
        fileInputRef={fileInputRef}
      />
    </>
  )
}
