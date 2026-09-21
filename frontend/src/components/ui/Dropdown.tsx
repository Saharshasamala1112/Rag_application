import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface DropdownItem {
  label: string
  icon?: ReactNode
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
  divider?: boolean
}

interface DropdownProps {
  trigger: ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
  className?: string
}

export function Dropdown({ trigger, items, align = 'left' }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, close])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, close])

  return (
    <div ref={ref} className="relative inline-flex">
      <div onClick={() => setOpen((o) => !o)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-1 min-w-[160px] py-1 rounded-lg border shadow-panel animate-scale-in',
            'bg-surface border-edge dark:bg-surface-dark dark:border-edge-dark',
            align === 'right' ? 'right-0' : 'left-0',
          )}
          role="menu"
        >
          {items.map((item, i) => {
            if (item.divider) {
              return <div key={i} className="my-1 border-t border-edge dark:border-edge-dark" />
            }
            return (
              <button
                key={i}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.()
                  close()
                }}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left transition-colors',
                  item.danger
                    ? 'text-danger hover:bg-danger-subtle dark:text-danger-dark dark:hover:bg-danger-dark-subtle'
                    : 'text-fg hover:bg-surface-secondary dark:text-fg-dark dark:hover:bg-surface-dark-elevated',
                  item.disabled && 'opacity-50 cursor-not-allowed',
                )}
              >
                {item.icon && <span className="shrink-0 text-fg-tertiary dark:text-fg-dark-tertiary">{item.icon}</span>}
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface TabsProps {
  tabs: { id: string; label: string; icon?: ReactNode; count?: number }[]
  activeTab: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 border-b border-edge dark:border-edge-dark',
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px',
              isActive
                ? 'text-accent border-accent dark:text-accent-dark dark:border-accent-dark'
                : 'text-fg-secondary border-transparent hover:text-fg hover:border-edge dark:text-fg-dark-secondary dark:hover:text-fg-dark dark:hover:border-edge-dark',
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-2xs font-medium',
                isActive
                  ? 'bg-accent/10 text-accent dark:bg-accent-dark/10 dark:text-accent-dark'
                  : 'bg-surface-secondary text-fg-tertiary dark:bg-surface-dark-elevated dark:text-fg-dark-tertiary',
              )}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
