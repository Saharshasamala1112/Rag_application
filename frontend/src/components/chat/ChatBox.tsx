import { ChatMessage } from './ChatMessage'
import type { ChatMessage as ChatMessageType } from '../../types/chat'

interface ChatBoxProps {
  messages: ChatMessageType[]
  isTyping?: boolean
}

export const ChatBox = ({ messages, isTyping = false }: ChatBoxProps) => {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {isTyping ? (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-br-3xl rounded-tl-3xl rounded-tr-3xl bg-slate-100 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-400 animate-pulse" />
              <span>Assistant</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '120ms' }} />
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '240ms' }} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
