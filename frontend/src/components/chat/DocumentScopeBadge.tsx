import { X } from 'lucide-react'
import { Badge } from '../ui/Badge'

interface DocumentScopeBadgeProps {
  documentName: string | null
  onClear: () => void
}

export function DocumentScopeBadge({ documentName, onClear }: DocumentScopeBadgeProps) {
  if (!documentName) return <Badge variant="default">All documents</Badge>

  return (
    <Badge variant="accent" className="max-w-[240px]">
      <span className="truncate">{documentName}</span>
      <button
        type="button"
        aria-label="Search all documents"
        title="Clear document focus"
        onClick={onClear}
        className="rounded-full hover:bg-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <X size={12} />
      </button>
    </Badge>
  )
}
