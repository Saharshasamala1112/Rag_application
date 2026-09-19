export const Loader = ({ label = 'Loading...' }: { label?: string }) => {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-600" aria-live="polite">
      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
      <span>{label}</span>
    </div>
  )
}
