import { useState, useRef, useCallback, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface TooltipProps {
  children: ReactNode
  content: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  delayMs?: number
}

export function Tooltip({ children, content, side = 'top', delayMs = 400 }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => setVisible(true), delayMs)
  }, [delayMs])

  const hide = useCallback(() => {
    clearTimeout(timeoutRef.current)
    setVisible(false)
  }, [])

  const positionStyles: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 px-2 py-1 text-2xs font-medium rounded-md whitespace-nowrap pointer-events-none',
            'bg-fg text-app shadow-sm dark:bg-fg-dark dark:text-app-dark',
            'animate-fade-in',
            positionStyles[side],
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}
