import { useRef, useEffect } from 'react'
import { Paperclip, X, Loader2, ArrowUp } from 'lucide-react'
import { FileIcon } from '../ui/FileIcon'
import { Tooltip } from '../ui/Tooltip'

interface ChatComposerProps {
  inputValue: string
  onInputChange: (value: string) => void
  onSubmit: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  loading: boolean
  selectedFile: File | null
  onFileSelect: (file: File | null) => void
  uploading: boolean
  onUpload: () => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
}

export function ChatComposer({
  inputValue,
  onInputChange,
  onSubmit,
  onKeyDown,
  loading,
  selectedFile,
  onFileSelect,
  uploading,
  onUpload,
  fileInputRef,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value)
    // auto-grow
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  useEffect(() => {
    if (!loading && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [loading])

  // Reset textarea height when value is cleared
  useEffect(() => {
    if (inputValue === '' && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [inputValue])

  const canSend = inputValue.trim().length > 0 && !loading

  return (
    <div className="shrink-0 px-4 pb-4 pt-2">
      <div className="mx-auto max-w-[800px]">
        {/* Attachment preview */}
        {selectedFile && (
          <div className="mb-2.5 flex animate-scale-in items-center gap-2.5 rounded-xl border border-edge bg-surface px-3.5 py-2.5 dark:border-edge-dark dark:bg-surface-dark">
            <FileIcon type={selectedFile.name.split('.').pop() || ''} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-fg-secondary dark:text-fg-dark-secondary">
                {selectedFile.name}
              </p>
              <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              type="button"
              aria-label="Remove file"
              onClick={() => {
                onFileSelect(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              className="rounded-lg p-1 text-fg-tertiary transition-colors hover:bg-surface-secondary hover:text-fg dark:hover:bg-surface-dark-elevated"
            >
              <X size={14} />
            </button>
            <button
              type="button"
              aria-label="Upload document"
              onClick={onUpload}
              disabled={uploading}
              className="rounded-lg bg-fg px-3 py-1.5 text-[11px] font-medium text-app transition-opacity hover:opacity-90 disabled:opacity-40 dark:bg-fg-dark dark:text-app-dark"
            >
              {uploading ? <Loader2 size={11} className="animate-spin" /> : 'Upload'}
            </button>
          </div>
        )}

        {/* Composer container */}
        <div className="relative rounded-2xl border border-edge bg-surface shadow-xs transition-all duration-150 focus-within:border-fg-muted focus-within:shadow-sm dark:border-edge-dark dark:bg-surface-dark dark:focus-within:border-fg-dark-tertiary">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInput}
            onKeyDown={onKeyDown}
            placeholder={
              loading
                ? 'Waiting for response... Press Escape to stop'
                : 'Ask anything about your documents...'
            }
            rows={1}
            readOnly={loading}
            className="max-h-[200px] min-h-[44px] w-full resize-none rounded-t-2xl border-0 bg-transparent pb-2 pl-4 pr-4 pt-3.5 text-sm text-fg outline-none placeholder:text-fg-tertiary dark:text-fg-dark dark:placeholder:text-fg-dark-tertiary"
            aria-label="Message input"
          />

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-2 pb-2 pt-0.5">
            <div className="flex items-center gap-1">
              {/* Attach */}
              <Tooltip content="Attach a document" side="top">
                <button
                  type="button"
                  aria-label="Attach file"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="rounded-xl p-2 text-fg-tertiary transition-colors hover:bg-surface-secondary hover:text-fg disabled:opacity-40 dark:text-fg-dark-tertiary dark:hover:bg-surface-dark-elevated dark:hover:text-fg-dark"
                >
                  <Paperclip size={16} />
                </button>
              </Tooltip>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Keyboard hint */}
              <span className="mr-1 hidden text-2xs text-fg-muted dark:text-fg-dark-tertiary sm:inline">
                ↵ send
              </span>

              {/* Send / Stop button */}
              {loading ? (
                <Tooltip content="Stop generating (Esc)" side="top">
                  <button
                    type="button"
                    aria-label="Stop generating"
                    onClick={onSubmit}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-danger text-white transition-colors hover:opacity-90 active:scale-95 dark:bg-danger-dark"
                  >
                    <X size={15} />
                  </button>
                </Tooltip>
              ) : (
                <button
                  type="button"
                  aria-label="Send message"
                  onClick={onSubmit}
                  disabled={!canSend}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-150 ${
                    canSend
                      ? 'bg-fg text-app shadow-xs hover:opacity-90 active:scale-95 dark:bg-fg-dark dark:text-app-dark'
                      : 'cursor-not-allowed bg-surface-secondary text-fg-muted dark:bg-surface-dark-elevated dark:text-fg-dark-tertiary'
                  }`}
                >
                  <ArrowUp size={16} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
