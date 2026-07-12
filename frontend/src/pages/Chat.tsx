import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { ChatBox } from '../components/chat/ChatBox'
import { ChatInput } from '../components/chat/ChatInput'
import { useChat } from '../hooks/useChat'
import { useUpload } from '../hooks/useUpload'
import { Button } from '../components/common/Button'

export const Chat = () => {
  const { messages, loading, error, ask, clearMessages } = useChat()
  const { upload, loading: uploading, error: uploadError, document } = useUpload()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [status, setStatus] = useState('Upload a document or ask a question right away.')
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSubmit = async (question: string) => {
    setStatus('Thinking...')
    await ask(question)
    setStatus('Ready to assist.')
  }

  const handleChooseFile = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setStatus('Uploading the document...')
    await upload(selectedFile)
    setSelectedFile(null)
    setStatus('Document ready. Ask your question.')
  }

  return (
    <div className="grid min-h-[calc(100vh-140px)] gap-6 lg:grid-cols-[2.1fr_1fr]">
      <main className="space-y-6">
        <section className="rounded-[36px] border border-slate-200 bg-white p-8 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.2)]">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Professional AI chat</p>
            <h1 className="text-4xl font-semibold text-slate-950 sm:text-5xl">A refined assistant for modern workflows</h1>
            <p className="max-w-3xl text-base leading-7 text-slate-600">
              Upload a document or ask a question, and receive reliable answers in a clean, focused chat experience.
            </p>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[36px] border border-slate-200 bg-slate-50 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
          <div className="max-h-[calc(100vh-380px)] overflow-y-auto px-5 py-6 sm:px-7">
            {messages.length ? (
              <ChatBox messages={messages} isTyping={loading} />
            ) : (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">
                <p className="text-lg font-semibold text-slate-900">Start your first conversation</p>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </section>

        <section className="rounded-[36px] border border-slate-200 bg-white p-5 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.16)]">
          <ChatInput onSubmit={handleSubmit} disabled={loading} onUploadClick={handleChooseFile} uploadDisabled={uploading} />
        </section>
      </main>

      <aside className="space-y-6">
        <section className="rounded-[36px] border border-slate-200 bg-slate-950 p-6 text-slate-100 shadow-sm">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Live status</p>
          <p className="mt-4 text-lg font-semibold text-white">{error ?? uploadError ?? status}</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Everything you need is available on one side. Ask a question to chat, or upload a doc to improve replies.
          </p>
        </section>

        <section className="rounded-[36px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Why this works</p>
          <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
            <div>
              <p className="font-semibold text-slate-900">Focused layout</p>
              <p>Chat stays front and center, while upload and status remain accessible.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Responsive design</p>
              <p>The interface adapts to smaller screens and keeps actions easy to reach.</p>
            </div>
          </div>
        </section>
      </aside>
    </div>
  )
}
