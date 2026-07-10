interface SourceCardProps {
  title: string
  snippet: string
}

export const SourceCard = ({ title, snippet }: SourceCardProps) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-600">{snippet}</p>
    </div>
  )
}
