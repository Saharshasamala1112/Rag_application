import { FileText } from 'lucide-react'

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  pdf:  { bg: 'bg-danger-subtle dark:bg-danger-dark-subtle', text: 'text-danger dark:text-danger-dark' },
  doc:  { bg: 'bg-accent-subtle dark:bg-accent-dark-subtle', text: 'text-accent dark:text-accent-dark' },
  docx: { bg: 'bg-accent-subtle dark:bg-accent-dark-subtle', text: 'text-accent dark:text-accent-dark' },
  txt:  { bg: 'bg-surface-secondary dark:bg-surface-dark-elevated', text: 'text-fg-secondary dark:text-fg-dark-secondary' },
  md:   { bg: 'bg-surface-secondary dark:bg-surface-dark-elevated', text: 'text-accent dark:text-accent-dark' },
  csv:  { bg: 'bg-success-subtle dark:bg-success-dark-subtle', text: 'text-success dark:text-success-dark' },
  json: { bg: 'bg-warning-subtle dark:bg-warning-dark-subtle', text: 'text-warning dark:text-warning-dark' },
  html: { bg: 'bg-surface-secondary dark:bg-surface-dark-elevated', text: 'text-fg-secondary dark:text-fg-dark-secondary' },
}

const DEFAULT_COLOR = { bg: 'bg-surface-secondary dark:bg-surface-dark-elevated', text: 'text-fg-tertiary dark:text-fg-dark-tertiary' }

function getColor(type: string) {
  const ext = type.replace('.', '').toLowerCase()
  return TYPE_COLORS[ext] || DEFAULT_COLOR
}

function getExtLabel(type: string) {
  return type.replace('.', '').toLowerCase().slice(0, 3)
}

interface FileIconProps {
  type: string
  size?: 'sm' | 'md'
}

export function FileIcon({ type, size = 'sm' }: FileIconProps) {
  const color = getColor(type)
  const sizeClasses = size === 'sm' ? 'w-5 h-4 text-[9px]' : 'w-6 h-5 text-[10px]'

  return (
    <span
      className={`inline-flex items-center justify-center rounded font-bold uppercase ${sizeClasses} ${color.bg} ${color.text}`}
    >
      {getExtLabel(type)}
    </span>
  )
}

interface FileIconLargeProps {
  type?: string
  extension?: string
}

export function FileIconLarge({ type, extension }: FileIconLargeProps) {
  const ext = extension || type || ''
  const color = getColor(ext)

  return (
    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${color.bg}`}>
      <FileText size={18} className={color.text} />
    </div>
  )
}
