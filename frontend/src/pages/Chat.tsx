import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { ChatBox } from '../components/chat/ChatBox'
import { ChatInput } from '../components/chat/ChatInput'
import { useChat } from '../hooks/useChat'
import { useUpload } from '../hooks/useUpload'

export const Chat = () => {
  const { messages, loading, ask } = useChat()
  const { upload, loading: uploading } = useUpload()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [status, setStatus] = useState('Upload a document or ask a question right away.')
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const quickPrompts = ['Summarize this document', 'Extract key points', 'Answer from context']

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
    <div className="flex min-h-[calc(100vh-140px)] flex-col gap-6">
      <main className="space-y-6">
        <section className="rounded-[36px] border border-slate-200 bg-white p-8 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.2)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Professional AI chat</p>
              <h1 className="text-4xl font-semibold text-slate-950 sm:text-5xl">A refined assistant for modern workflows</h1>
              <p className="text-base leading-7 text-slate-600">
                Upload a document or ask a question, and receive reliable answers in a focused, distraction-free workspace.
              </p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700">
              {status}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void handleSubmit(prompt)}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[36px] border border-slate-200 bg-slate-50 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
          <div className="max-h-[calc(100vh-420px)] overflow-y-auto px-5 py-6 sm:px-7">
            {messages.length ? (
              <ChatBox messages={messages} isTyping={loading} />
            ) : (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">
                <p className="text-lg font-semibold text-slate-900">Start with a focused question</p>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                  Upload a document to ground the assistant in your context, or use one of the suggested prompts to begin.
                </p>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </section>

        <section className="rounded-[36px] border border-slate-200 bg-white p-5 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.16)]">
          {selectedFile ? (
            <div className="mb-4 flex flex-col gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-emerald-900">{selectedFile.name}</p>
                <p className="text-sm text-emerald-700">Ready to upload and improve future answers.</p>
              </div>
              <button
                type="button"
                onClick={() => void handleUpload()}
                disabled={uploading}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {uploading ? 'Uploading…' : 'Upload document'}
              </button>
            </div>
          ) : (
            <div className="mb-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Upload a PDF or text document to add grounding context before asking questions.
            </div>
          )}

          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
          <ChatInput onSubmit={handleSubmit} disabled={loading} onUploadClick={handleChooseFile} uploadDisabled={uploading} />
        </section>
      </main>
    </div>
  )
}
