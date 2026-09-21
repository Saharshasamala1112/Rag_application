import { cn } from '../../lib/utils'

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-surface-secondary dark:bg-surface-dark-elevated', className)}
      aria-hidden="true"
    />
  )
}

export function DocumentRowSkeleton() {
  return (
    <div className="flex items-center gap-2 px-2.5 py-2">
      <Skeleton className="w-5 h-4 rounded" />
      <Skeleton className="h-3.5 flex-1" />
    </div>
  )
}

export function MessageSkeleton() {
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[80%] space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
          <Skeleton className="h-3.5 w-3/4" />
        </div>
      </div>
    </div>
  )
}

export function SourceCardSkeleton() {
  return (
    <div className="rounded-lg border border-edge dark:border-edge-dark p-3 space-y-2">
      <Skeleton className="h-3.5 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  )
}
