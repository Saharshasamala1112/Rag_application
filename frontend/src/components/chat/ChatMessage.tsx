interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{
    id: string
    title: string
    snippet: string
  }>
}

export const ChatMessage = ({ role, content, sources }: ChatMessageProps) => {
  return (
    <div className={`rounded-2xl p-4 ${role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700'}`}>
      <p className="whitespace-pre-wrap text-sm">{content}</p>
      {sources?.length ? (
        <div className="mt-3 space-y-2">
          {sources.map((source) => (
            <div key={source.id} className="rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-600">
              <p className="font-semibold text-slate-900">{source.title}</p>
              <p>{source.snippet}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
