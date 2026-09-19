import type { ChatSource } from '../../types/chat'

interface SourceCardProps {
  source: ChatSource
  index: number
}

export const SourceCard = ({ source, index }: SourceCardProps) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-slate-900">
          {index + 1}. {source.source}
        </span>
        <div className="flex items-center gap-2">
          {source.page_number ? (
            <span className="text-xs text-slate-500">Page {source.page_number}</span>
          ) : null}
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            {(source.score * 100).toFixed(0)}%
          </span>
        </div>
      </div>
      {source.header ? (
        <p className="text-xs font-medium text-sky-600 mb-1">{source.header}</p>
      ) : null}
      <p className="text-xs text-slate-600 leading-relaxed">{source.content}</p>
    </div>
  )
}
