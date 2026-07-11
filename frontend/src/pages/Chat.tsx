import { useEffect, useRef, useState } from 'react'
import { Card } from '../components/common/Card'
import { Loader } from '../components/common/Loader'
import { ChatBox } from '../components/chat/ChatBox'
import { ChatInput } from '../components/chat/ChatInput'
import { useChat } from '../hooks/useChat'
import { useDocumentStore } from '../store/document.store'
import { Button } from '../components/common/Button'

export const Chat = () => {
  const { messages, loading, error, ask, clearMessages, sessions, activeSessionId, createSession, setActiveSession, deleteSession } = useChat()
  const document = useDocumentStore((state) => state.document)
  const [status, setStatus] = useState('Ask a question about your uploaded document.')
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSubmit = async (question: string) => {
    setStatus('Searching the uploaded document...')
    await ask(question)
    setStatus('Answer ready.')
  }

  const handleQuickPrompt = async (prompt: string) => {
    setStatus('Preparing your prompt...')
    await ask(prompt)
    setStatus('Answer ready.')
  }

  const exportHistory = () => {
    const content = {
      document,
      history: messages,
    }
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `document-chat-${new Date().toISOString()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const cloneDocument = document ?? { fileName: 'No document uploaded', fileType: '', fileSize: 0, uploadedAt: '' }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
      <section className="flex min-h-[calc(100vh-140px)] flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Document Assistant</p>
            <h1 className="text-2xl font-semibold text-slate-900">Chat with your document</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Get answers, summaries, and citations from your uploaded document with a familiar chatbot experience.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={clearMessages} disabled={!messages.length} className="bg-white text-slate-900 hover:bg-slate-100">
              Clear chat
            </Button>
            <Button onClick={exportHistory} disabled={!messages.length}>
              Export chat
            </Button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 shadow-sm">
            <p className="font-semibold text-slate-900">Current document</p>
            <p className="mt-2 text-sm text-slate-700">{cloneDocument.fileName}</p>
            <p className="mt-2 text-xs text-slate-500">{cloneDocument.fileType || 'Unknown type'} • {cloneDocument.fileSize ? `${(cloneDocument.fileSize / 1024).toFixed(1)} KB` : 'Size unknown'}</p>
            <p className="mt-1 text-xs text-slate-500">{cloneDocument.uploadedAt ? new Date(cloneDocument.uploadedAt).toLocaleString() : 'Upload time unavailable'}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 shadow-sm">
            <p className="font-semibold text-slate-900">Live status</p>
            <p className="mt-2 text-sm">{error ?? status}</p>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
          <div className="max-h-[calc(100vh-420px)] overflow-y-auto px-4 py-5 sm:px-6">
            {messages.length ? (
              <ChatBox messages={messages} isTyping={loading} />
            ) : (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">
                <p className="text-lg font-semibold text-slate-900">Your chat is ready</p>
                <p className="mt-3 max-w-md text-sm leading-6">Ask a question about your uploaded document and get answers with source references, just like a modern chatbot.</p>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        <div className="mt-6">
          <ChatInput onSubmit={handleSubmit} disabled={loading} />
          <p className="mt-3 text-sm text-slate-500">Tip: Press Enter to send, Shift+Enter for a new line.</p>
          {loading ? <div className="mt-4"><Loader label="Generating your answer…" /></div> : null}
        </div>
      </section>

      <aside className="space-y-6">
        <Card title="Sessions" description="Keep multiple conversations and switch instantly.">
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-900">Active session</p>
              <Button onClick={createSession} className="rounded-full bg-slate-900 px-3 py-2 text-xs text-white hover:bg-slate-800">
                New
              </Button>
            </div>
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center justify-between gap-3 rounded-3xl border px-4 py-3 transition ${session.id === activeSessionId ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-900 hover:bg-slate-50'}`}
              >
                <button
                  type="button"
                  onClick={() => setActiveSession(session.id)}
                  className="text-left"
                >
                  <p className="text-sm font-semibold">{session.title}</p>
                  <p className="text-xs text-slate-500 group-hover:text-slate-700">{new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSession(session.id)}
                    className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 hover:border-slate-900 hover:text-slate-900"
                  >
                    {session.id === activeSessionId ? 'Current' : 'Switch'}
                  </button>
                  {sessions.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => deleteSession(session.id)}
                      className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Quick prompts" description="Try these common questions to get the most from your document.">
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-slate-900 hover:bg-slate-100" onClick={() => handleQuickPrompt('Summarize this document in 3 bullet points')}>
              <p className="font-semibold text-slate-900">Summarize the document</p>
              <p className="mt-1">Give me the main points in 3-4 sentences.</p>
            </li>
            <li className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-slate-900 hover:bg-slate-100" onClick={() => handleQuickPrompt('Which section talks about liabilities and obligations?')}>
              <p className="font-semibold text-slate-900">Find key clauses</p>
              <p className="mt-1">Which section talks about liabilities?</p>
            </li>
            <li className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-slate-900 hover:bg-slate-100" onClick={() => handleQuickPrompt('List all dates, names, and action items mentioned in the document')}>
              <p className="font-semibold text-slate-900">Extract data</p>
              <p className="mt-1">List the dates and names mentioned in the document.</p>
            </li>
          </ul>
        </Card>
      </aside>
    </div>
  )
}
