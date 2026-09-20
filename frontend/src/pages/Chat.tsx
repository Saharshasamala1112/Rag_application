import { useCallback, useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { toast } from 'sonner'
import { Paperclip } from 'lucide-react'
import { useChat } from '../hooks/useChat'
import { useUpload } from '../hooks/useUpload'
import { useDocumentStore } from '../store/document.store'
import { Sidebar } from '../components/layout/Sidebar'
import { TopBar } from '../components/layout/TopBar'
import { SourcesPanel } from '../components/sources/SourcesPanel'
import { MessageBubble } from '../components/chat/MessageBubble'
import { EmptyState } from '../components/chat/EmptyState'
import { ChatComposer } from '../components/chat/ChatComposer'
import type { ChatSource } from '../types/chat'

export const Chat = () => {
  const {
    messages,
    loading,
    status,
    ask,
  } = useChat()

  const { upload, loading: uploading, fetchDocuments } = useUpload()
  const setActiveDocument = useDocumentStore((s) => s.setActiveDocument)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [isDragOver, setIsDragOver] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [panelSources, setPanelSources] = useState<ChatSource[] | null>(null)

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
      if (doc) setActiveDocument(doc.document_id)
      fetchDocuments()
      toast.success('Document uploaded')
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
    await ask(q)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  // Determine panel sources: manual selection or last message with sources
  const displaySources = panelSources && panelSources.length > 0
    ? panelSources
    : (() => {
        const last = [...messages].reverse().find((m) => m.sources && m.sources.length > 0)
        if (!last || last.isStreaming) return null
        return last.sources!
      })()

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-zinc-900">
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

      {/* Sidebar */}
      <Sidebar
        open={showSidebar}
        onClose={() => setShowSidebar(false)}
        onToggle={() => setShowSidebar((prev) => !prev)}
      />

      {/* Main chat area */}
      <main
        className="flex flex-1 flex-col min-w-0 relative"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <TopBar
          sidebarOpen={showSidebar}
          onToggleSidebar={() => setShowSidebar(true)}
          loading={loading}
          status={status}
        />

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {messages.length > 0 ? (
            <div className="space-y-5 max-w-[800px] mx-auto px-4 py-6">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onSelectSource={(sources) => setPanelSources(sources)}
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
      </main>

      {/* Sources panel */}
      {displaySources && (
        <SourcesPanel
          sources={displaySources}
          onClose={() => setPanelSources(null)}
        />
      )}
    </div>
  )
}
