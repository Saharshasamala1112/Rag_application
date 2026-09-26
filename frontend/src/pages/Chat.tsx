import { useCallback, useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import { Paperclip, PanelRightOpen, PanelRightClose, ArrowDown, Square, Sparkles } from 'lucide-react'
import { useChat } from '../hooks/useChat'
import { useUpload } from '../hooks/useUpload'
import { useDocumentStore } from '../store/document.store'
import type { ChatSource, ChatMessage } from '../types/chat'
import { MessageBubble } from '../components/chat/MessageBubble'
import { EmptyState } from '../components/chat/EmptyState'
import { ChatComposer } from '../components/chat/ChatComposer'
import { RagLoadingIndicator } from '../components/chat/RagLoadingIndicator'
import { DocumentScopeBadge } from '../components/chat/DocumentScopeBadge'
import { Tooltip } from '../components/ui/Tooltip'

interface LayoutContext {
  contextPanelOpen: boolean
  toggleContextPanel: () => void
  selectSource: (source: ChatSource) => void
}

export const Chat = () => {
  const { contextPanelOpen, toggleContextPanel, selectSource } =
    useOutletContext<LayoutContext>()

  const {
    messages,
    loading,
    status,
    traceSteps,
    ask,
    cancel,
  } = useChat()

  const { upload, loading: uploading, fetchDocuments } = useUpload()
  const activeDocument = useDocumentStore((s) => s.activeDocumentId)
  const documents = useDocumentStore((s) => s.documents)
  const setActiveDocument = useDocumentStore((s) => s.setActiveDocument)
  const handleSelectSource = useCallback(
    (source: ChatSource) => selectSource(source),
    [selectSource],
  )

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isAtBottom, setIsAtBottom] = useState(true)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const latestIsAtBottomRef = useRef(isAtBottom)
  const loadingRef = useRef(loading)
  const latestMessagesRef = useRef(messages)
  const hasMessages = messages.length > 0

  useEffect(() => {
    void fetchDocuments()
  }, [fetchDocuments])

  useEffect(() => {
    latestIsAtBottomRef.current = isAtBottom
    loadingRef.current = loading
    latestMessagesRef.current = messages
  }, [messages, isAtBottom, loading])

  useEffect(() => {
    if (!hasMessages) return

    let animationFrame = 0
    const scheduleScroll = () => {
      if (animationFrame !== 0) return
      animationFrame = requestAnimationFrame(() => {
        animationFrame = 0
        if (!latestIsAtBottomRef.current) return

        if (loadingRef.current) {
          const container = scrollContainerRef.current
          if (container) container.scrollTop = container.scrollHeight
        } else {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
      })
    }

    const observer = new MutationObserver(() => {
      scheduleScroll()
    })
    if (scrollContainerRef.current) {
      observer.observe(scrollContainerRef.current, {
        childList: true,
        characterData: true,
        subtree: true,
      })
    }
    scheduleScroll()

    return () => {
      observer.disconnect()
      if (animationFrame !== 0) cancelAnimationFrame(animationFrame)
    }
  }, [hasMessages])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const atBottom = scrollHeight - scrollTop - clientHeight < 60
      setIsAtBottom(atBottom)
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setIsAtBottom(true)
  }, [])

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
      void fetchDocuments()
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

  const handleSubmit = () => {
    const q = inputValue.trim()
    if (!q || loading) return
    setInputValue('')
    void ask(q)
  }

  const replayAssistantAnswer = useCallback((messageId: string) => {
    const currentMessages = latestMessagesRef.current
    const messageIndex = currentMessages.findIndex((message) => message.id === messageId)
    if (messageIndex < 0) return

    const previousUserMessage = currentMessages
      .slice(0, messageIndex)
      .reverse()
      .find((message: ChatMessage) => message.role === 'user')
    if (previousUserMessage) void ask(previousUserMessage.content)
  }, [ask])

  const handleStopOrSubmit = () => {
    if (loading) {
      cancel()
      toast.info('Generation cancelled')
    } else {
      void handleSubmit()
    }
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
          <div className="rounded-2xl border-2 border-dashed border-accent bg-surface dark:bg-surface-dark px-12 py-10 text-center shadow-lg animate-scale-in">
            <Paperclip size={36} className="mx-auto mb-3 text-accent dark:text-accent-dark" />
            <p className="text-sm font-medium text-fg dark:text-fg-dark">
              Drop your document here
            </p>
            <p className="text-xs text-fg-secondary dark:text-fg-dark-secondary mt-1">
              PDF, DOCX, TXT, MD, CSV, JSON, HTML, and more
            </p>
          </div>
        </div>
      )}

      {/* Chat header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-edge dark:border-edge-dark shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={14} className="text-fg-tertiary dark:text-fg-dark-tertiary shrink-0" />
          <DocumentScopeBadge
            documentName={activeDoc?.filename ?? null}
            onClear={() => setActiveDocument(null)}
          />
        </div>

        {/* Loading indicator in header */}
        {loading && (
          <div className="hidden md:flex items-center">
            <RagLoadingIndicator status={status} traceSteps={traceSteps} />
          </div>
        )}

        <div className="flex items-center gap-1">
          {loading && (
            <Tooltip content="Stop generating (Esc)" side="bottom">
              <button
                type="button"
                onClick={cancel}
                className="flex items-center justify-center w-7 h-7 rounded-md text-danger hover:text-danger-hover hover:bg-danger-subtle dark:text-danger-dark dark:hover:bg-danger-dark-subtle transition-colors"
                aria-label="Stop generating"
              >
                <Square size={13} fill="currentColor" />
              </button>
            </Tooltip>
          )}
          <button
            type="button"
            onClick={toggleContextPanel}
            className="flex items-center justify-center w-7 h-7 rounded-md text-fg-tertiary hover:text-fg hover:bg-surface-secondary dark:text-fg-dark-tertiary dark:hover:text-fg-dark dark:hover:bg-surface-dark-elevated transition-colors"
            aria-label={contextPanelOpen ? 'Close trace panel' : 'Open trace panel'}
            title="RAG Trace"
          >
            {contextPanelOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
          </button>
        </div>
      </div>

      {/* Mobile loading indicator */}
      {loading && (
        <div className="md:hidden border-b border-edge dark:border-edge-dark px-2 py-1">
          <RagLoadingIndicator status={status} traceSteps={traceSteps} />
        </div>
      )}

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
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto relative"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {messages.length > 0 ? (
          <div className="space-y-6 max-w-[800px] mx-auto px-4 sm:px-6 py-6">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onSelectSource={handleSelectSource}
                onRetry={replayAssistantAnswer}
                onRegenerate={replayAssistantAnswer}
              />
            ))}
          </div>
        ) : (
          <EmptyState onSelectPrompt={(p) => setInputValue(p)} />
        )}
        <div ref={chatEndRef} />

        {/* Scroll to bottom button */}
        {!isAtBottom && messages.length > 0 && (
          <div className="sticky bottom-4 flex justify-center pointer-events-none">
            <button
              type="button"
              onClick={scrollToBottom}
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-edge dark:border-edge-dark bg-surface dark:bg-surface-dark shadow-md hover:bg-surface-secondary dark:hover:bg-surface-dark-elevated transition-colors text-xs text-fg-secondary dark:text-fg-dark-secondary"
              aria-label="Scroll to bottom"
            >
              <ArrowDown size={13} />
              <span>Scroll to bottom</span>
            </button>
          </div>
        )}
      </div>

      {/* Composer */}
      <ChatComposer
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSubmit={handleStopOrSubmit}
        onKeyDown={handleKeyDown}
        loading={loading}
        selectedFile={selectedFile}
        onFileSelect={setSelectedFile}
        uploading={uploading}
        onUpload={() => void handleUpload()}
        fileInputRef={fileInputRef}
      />
    </>
  )
}
