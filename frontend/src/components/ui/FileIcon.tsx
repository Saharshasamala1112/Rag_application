import { FileText } from 'lucide-react'

const TYPE_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  pdf:  { bg: 'bg-red-50', text: 'text-red-600', darkBg: 'dark:bg-red-950/40', darkText: 'dark:text-red-400' },
  doc:  { bg: 'bg-blue-50', text: 'text-blue-600', darkBg: 'dark:bg-blue-950/40', darkText: 'dark:text-blue-400' },
  docx: { bg: 'bg-blue-50', text: 'text-blue-600', darkBg: 'dark:bg-blue-950/40', darkText: 'dark:text-blue-400' },
  txt:  { bg: 'bg-zinc-100', text: 'text-zinc-600', darkBg: 'dark:bg-zinc-800', darkText: 'dark:text-zinc-400' },
  md:   { bg: 'bg-violet-50', text: 'text-violet-600', darkBg: 'dark:bg-violet-950/40', darkText: 'dark:text-violet-400' },
  csv:  { bg: 'bg-emerald-50', text: 'text-emerald-600', darkBg: 'dark:bg-emerald-950/40', darkText: 'dark:text-emerald-400' },
  json: { bg: 'bg-amber-50', text: 'text-amber-600', darkBg: 'dark:bg-amber-950/40', darkText: 'dark:text-amber-400' },
  html: { bg: 'bg-orange-50', text: 'text-orange-600', darkBg: 'dark:bg-orange-950/40', darkText: 'dark:text-orange-400' },
}

const DEFAULT_COLOR = { bg: 'bg-zinc-100', text: 'text-zinc-500', darkBg: 'dark:bg-zinc-800', darkText: 'dark:text-zinc-400' }

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
      className={`inline-flex items-center justify-center rounded font-bold uppercase ${sizeClasses} ${color.bg} ${color.text} ${color.darkBg} ${color.darkText}`}
    >
      {getExtLabel(type)}
    </span>
  )
}

export function FileIconLarge({ type }: { type: string }) {
  const color = getColor(type)

  return (
    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${color.bg} ${color.darkBg}`}>
      <FileText size={18} className={`${color.text} ${color.darkText}`} />
    </div>
  )
}
