import { useEffect, useRef, useState } from 'react'
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

  const { uploadTextContent, fetchDocuments } = useUpload()
  const setActiveDocument = useDocumentStore((s) => s.setActiveDocument)

  const [showSidebar, setShowSidebar] = useState(true)
  const [inputValue, setInputValue] = useState('')
  const [panelSources, setPanelSources] = useState<ChatSource[] | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  const displaySources = panelSources && panelSources.length > 0
    ? panelSources
    : (() => {
        const last = [...messages].reverse().find((m) => m.sources && m.sources.length > 0)
        if (!last || last.isStreaming) return null
        return last.sources!
      })()

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-zinc-900">
      <Sidebar
        open={showSidebar}
        onClose={() => setShowSidebar(false)}
        onToggle={() => setShowSidebar((prev) => !prev)}
      />

      <main className="flex flex-1 flex-col min-w-0 relative">
        <TopBar
          sidebarOpen={showSidebar}
          onToggleSidebar={() => setShowSidebar(true)}
          loading={loading}
          status={status}
        />

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

        <ChatComposer
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          loading={loading}
        />
      </main>

      {displaySources && (
        <SourcesPanel
          sources={displaySources}
          onClose={() => setPanelSources(null)}
        />
      )}
    </div>
  )
}
