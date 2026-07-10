export const Loader = ({ label = 'Loading...' }: { label?: string }) => {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600" aria-live="polite">
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-900" />
      <span>{label}</span>
    </div>
  )
}
