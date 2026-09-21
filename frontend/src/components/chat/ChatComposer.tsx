import { useRef, useEffect, useState } from 'react'
import { Paperclip, X, Loader2, Search, ArrowUp } from 'lucide-react'
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
  const [searchMode, setSearchMode] = useState(false)

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
    <div className="px-4 pb-4 pt-2 shrink-0">
      <div className="max-w-[800px] mx-auto">
        {/* Attachment preview */}
        {selectedFile && (
          <div className="mb-2.5 flex items-center gap-2.5 rounded-xl border border-edge dark:border-edge-dark bg-surface dark:bg-surface-dark px-3.5 py-2.5 animate-scale-in">
            <FileIcon type={selectedFile.name.split('.').pop() || ''} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-fg-secondary dark:text-fg-dark-secondary truncate">
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
              className="p-1 rounded-lg text-fg-tertiary hover:text-fg hover:bg-surface-secondary dark:hover:bg-surface-dark-elevated transition-colors"
            >
              <X size={14} />
            </button>
            <button
              type="button"
              aria-label="Upload document"
              onClick={onUpload}
              disabled={uploading}
              className="rounded-lg bg-fg dark:bg-fg-dark px-3 py-1.5 text-[11px] font-medium text-app dark:text-app-dark hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {uploading ? <Loader2 size={11} className="animate-spin" /> : 'Upload'}
            </button>
          </div>
        )}

        {/* Composer container */}
        <div className="relative rounded-2xl border border-edge dark:border-edge-dark bg-surface dark:bg-surface-dark shadow-xs focus-within:border-fg-muted dark:focus-within:border-fg-dark-tertiary focus-within:shadow-sm transition-all duration-150">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInput}
            onKeyDown={onKeyDown}
            placeholder={
              loading
                ? 'Waiting for response... (Esc to stop)'
                : 'Ask anything about your documents...'
            }
            rows={1}
            disabled={loading}
            className="w-full resize-none border-0 bg-transparent pl-4 pr-4 pt-3.5 pb-2 text-sm text-fg dark:text-fg-dark outline-none placeholder:text-fg-tertiary dark:placeholder:text-fg-dark-tertiary min-h-[44px] max-h-[200px] rounded-t-2xl disabled:opacity-50"
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
                  className="p-2 rounded-xl text-fg-tertiary hover:text-fg hover:bg-surface-secondary dark:text-fg-dark-tertiary dark:hover:text-fg-dark dark:hover:bg-surface-dark-elevated disabled:opacity-40 transition-colors"
                >
                  <Paperclip size={16} />
                </button>
              </Tooltip>

              {/* Search mode toggle */}
              <Tooltip content={searchMode ? 'Search mode on — queries all documents' : 'Focus mode — active document only'} side="top">
                <button
                  type="button"
                  aria-label={searchMode ? 'Search mode' : 'Focus mode'}
                  onClick={() => setSearchMode((p) => !p)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-2xs font-medium transition-colors ${
                    searchMode
                      ? 'bg-accent/10 dark:bg-accent-dark/10 text-accent dark:text-accent-dark'
                      : 'text-fg-tertiary hover:text-fg hover:bg-surface-secondary dark:text-fg-dark-tertiary dark:hover:text-fg-dark dark:hover:bg-surface-dark-elevated'
                  }`}
                >
                  <Search size={12} />
                  <span className="hidden sm:inline">{searchMode ? 'All docs' : 'Active doc'}</span>
                </button>
              </Tooltip>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Keyboard hint */}
              <span className="text-2xs text-fg-muted dark:text-fg-dark-tertiary mr-1 hidden sm:inline">
                ↵ send
              </span>

              {/* Send / Stop button */}
              {loading ? (
                <Tooltip content="Stop generating (Esc)" side="top">
                  <button
                    type="button"
                    aria-label="Stop generating"
                    onClick={onSubmit}
                    className="flex items-center justify-center w-8 h-8 rounded-xl bg-danger dark:bg-danger-dark text-white transition-colors hover:opacity-90 active:scale-95"
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
                  className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-150 ${
                    canSend
                      ? 'bg-fg dark:bg-fg-dark text-app dark:text-app-dark hover:opacity-90 active:scale-95 shadow-xs'
                      : 'bg-surface-secondary dark:bg-surface-dark-elevated text-fg-muted dark:text-fg-dark-tertiary cursor-not-allowed'
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
