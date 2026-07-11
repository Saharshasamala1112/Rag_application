import type { ChatMessage as ChatMessageType } from '../../types/chat'

interface ChatMessageProps {
  message: ChatMessageType
}

const roleStyles = {
  user: 'ml-auto rounded-bl-3xl rounded-tl-3xl rounded-tr-3xl bg-slate-900 text-white shadow-sm',
  assistant: 'rounded-br-3xl rounded-tl-3xl rounded-tr-3xl bg-slate-50 text-slate-900 shadow-sm',
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[92%] ${roleStyles[message.role]} p-5`}> 
        <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
          <span className={`inline-flex h-2.5 w-2.5 rounded-full ${isUser ? 'bg-slate-300' : 'bg-sky-400'}`} />
          <span>{isUser ? 'You' : 'Assistant'}</span>
          <span>•</span>
          <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>

        {message.sources?.length ? (
          <div className="mt-4 space-y-3 rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-slate-500">Sources</p>
            {message.sources.map((source) => (
              <div key={source.id} className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">{source.title}</p>
                <p className="text-sm text-slate-600">{source.snippet}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
