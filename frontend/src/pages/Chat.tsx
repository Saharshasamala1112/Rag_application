import { useState } from 'react'
import { Card } from '../components/common/Card'
import { Loader } from '../components/common/Loader'
import { ChatBox } from '../components/chat/ChatBox'
import { ChatInput } from '../components/chat/ChatInput'
import { useChat } from '../hooks/useChat'

export const Chat = () => {
  const { messages, loading, error, ask } = useChat()
  const [status, setStatus] = useState('Ask a question about your uploaded PDF.')

  const handleSubmit = async (question: string) => {
    setStatus('Searching the uploaded document...')
    await ask(question)
    setStatus('Answer ready.')
  }

  return (
    <div className="space-y-6">
      <Card title="Chat with your document" description="Ask questions and receive concise answers with source snippets.">
        <ChatInput onSubmit={handleSubmit} disabled={loading} />
        <p className="mt-3 text-sm text-slate-600">{error ?? status}</p>
      </Card>

      <Card title="Conversation" description="Your latest questions and answers appear here.">
        {loading ? <Loader label="Generating an answer..." /> : null}
        <div className="mt-4">
          {messages.length ? <ChatBox messages={messages} /> : <p className="text-sm text-slate-600">No questions yet. Ask the first one.</p>}
        </div>
      </Card>
    </div>
  )
}
