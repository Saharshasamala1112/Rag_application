import { Modal } from './Modal'

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], label: 'Open search' },
  { keys: ['Ctrl', 'N'], label: 'New chat' },
  { keys: ['Ctrl', '/'], label: 'Show shortcuts' },
  { keys: ['Enter'], label: 'Send message' },
  { keys: ['Shift', 'Enter'], label: 'New line in composer' },
  { keys: ['Esc'], label: 'Stop generation / Close modal' },
]

interface KeyboardShortcutsHelpProps {
  open: boolean
  onClose: () => void
}

export function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard Shortcuts" size="sm">
      <div className="space-y-2.5">
        {SHORTCUTS.map((shortcut) => (
          <div key={shortcut.label} className="flex items-center justify-between py-1">
            <span className="text-xs text-fg-secondary dark:text-fg-dark-secondary">
              {shortcut.label}
            </span>
            <div className="flex items-center gap-1">
              {shortcut.keys.map((key) => (
                <kbd
                  key={key}
                  className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-2xs font-medium text-fg-secondary dark:text-fg-dark-secondary bg-surface-secondary dark:bg-surface-dark-elevated border border-edge dark:border-edge-dark rounded"
                >
                  {key}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
