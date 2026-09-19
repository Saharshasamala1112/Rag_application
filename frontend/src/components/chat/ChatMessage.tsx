import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage as ChatMessageType } from '../../types/chat'

interface ChatMessageProps {
  message: ChatMessageType
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl p-5 shadow-sm border ${
          isUser
            ? 'rounded-br-md bg-slate-900 text-white border-slate-800'
            : 'rounded-bl-md bg-white text-slate-900 border-slate-200'
        }`}
      >
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500">
          <span
            className={`inline-flex h-2 w-2 rounded-full ${
              isUser ? 'bg-slate-400' : 'bg-emerald-400'
            }`}
          />
          <span>{isUser ? 'You' : 'Assistant'}</span>
          <span className="text-slate-400">·</span>
          <span>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {message.isStreaming ? (
            <>
              <span className="text-slate-400">·</span>
              <span className="text-emerald-500 animate-pulse">streaming</span>
            </>
          ) : null}
        </div>

        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
        ) : (
          <div className="prose prose-sm prose-slate max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 prose-code:text-slate-800 prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-strong:text-slate-900 prose-a:text-sky-600">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content || (message.isStreaming ? '' : 'No response generated.')}
            </ReactMarkdown>
            {message.isStreaming ? (
              <span className="inline-block h-4 w-0.5 bg-slate-900 animate-pulse ml-0.5" />
            ) : null}
          </div>
        )}

        {message.sources && message.sources.length > 0 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sources ({message.sources.length})
            </p>
            <div className="space-y-2">
              {message.sources.map((source, idx) => (
                <div
                  key={`${source.source}-${source.chunk_id}-${idx}`}
                  className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-slate-900 truncate">
                      {source.source}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {source.page_number ? (
                        <span className="text-xs text-slate-500">p.{source.page_number}</span>
                      ) : null}
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {(source.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  {source.header ? (
                    <p className="text-xs font-medium text-sky-600 mb-1">{source.header}</p>
                  ) : null}
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {source.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
