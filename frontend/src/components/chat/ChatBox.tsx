import { useEffect, useRef } from 'react'
import type { ChatMessage as ChatMessageType } from '../../types/chat'
import { ChatMessage } from './ChatMessage'

interface ChatBoxProps {
  messages: ChatMessageType[]
  isTyping?: boolean
}

export const ChatBox = ({ messages, isTyping = false }: ChatBoxProps) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}

      {isTyping && !messages.some((m) => m.isStreaming) ? (
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white p-5 shadow-sm border border-slate-200">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Assistant is thinking...
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce [animation-delay:0ms]" />
              <span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce [animation-delay:150ms]" />
              <span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      ) : null}

      <div ref={bottomRef} />
    </div>
  )
}
