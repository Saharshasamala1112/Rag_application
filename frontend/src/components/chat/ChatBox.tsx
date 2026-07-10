import { ChatMessage } from './ChatMessage'
import type { ChatMessage as ChatMessageType } from '../../types/chat'

interface ChatBoxProps {
  messages: ChatMessageType[]
}

export const ChatBox = ({ messages }: ChatBoxProps) => {
  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <ChatMessage key={message.id} role={message.role} content={message.content} sources={message.sources} />
      ))}
    </div>
  )
}
