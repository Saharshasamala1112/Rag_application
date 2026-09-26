import { useState, useRef, useEffect, useCallback, useId, type ReactNode } from 'react'
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

export function Dropdown({ trigger, items, align = 'left', className }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

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
    const items = menuRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]:not(:disabled)',
    )
    items?.[0]?.focus()
  }, [open])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!open && event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      return
    }
    if (!open) return

    const menuItems = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ??
        [],
    )
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      triggerRef.current?.focus()
      return
    }
    if (!menuItems.length) return
    const currentIndex = menuItems.indexOf(document.activeElement as HTMLButtonElement)
    let nextIndex: number | null = null
    if (event.key === 'ArrowDown') {
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % menuItems.length
    }
    if (event.key === 'ArrowUp') {
      nextIndex =
        currentIndex < 0
          ? menuItems.length - 1
          : (currentIndex - 1 + menuItems.length) % menuItems.length
    }
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = menuItems.length - 1
    if (nextIndex !== null) {
      event.preventDefault()
      menuItems[nextIndex]?.focus()
    }
  }

  return (
    <div
      ref={ref}
      className={cn('relative inline-flex', className)}
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          close()
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center"
      >
        {trigger}
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          className={cn(
            'absolute z-50 mt-1 min-w-[160px] animate-scale-in rounded-lg border py-1 shadow-panel',
            'border-edge bg-surface dark:border-edge-dark dark:bg-surface-dark',
            align === 'right' ? 'right-0' : 'left-0',
          )}
          role="menu"
          aria-orientation="vertical"
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
                  triggerRef.current?.focus()
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors',
                  item.danger
                    ? 'text-danger hover:bg-danger-subtle dark:text-danger-dark dark:hover:bg-danger-dark-subtle'
                    : 'text-fg hover:bg-surface-secondary dark:text-fg-dark dark:hover:bg-surface-dark-elevated',
                  item.disabled && 'cursor-not-allowed opacity-50',
                )}
              >
                {item.icon && (
                  <span className="shrink-0 text-fg-tertiary dark:text-fg-dark-tertiary">
                    {item.icon}
                  </span>
                )}
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
