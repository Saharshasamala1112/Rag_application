import { useRef, useEffect } from 'react'
import { Send, Paperclip, X, Loader2 } from 'lucide-react'
import { FileIcon } from '../ui/FileIcon'

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
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }

  useEffect(() => {
    if (!loading && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [loading])

  const canSend = inputValue.trim().length > 0 && !loading

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="max-w-[800px] mx-auto">
        {selectedFile && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-edge dark:border-edge-dark bg-surface-secondary dark:bg-surface-dark-elevated px-3 py-2 animate-scale-in">
            <FileIcon type={selectedFile.name.split('.').pop() || ''} />
            <span className="text-xs text-fg-secondary dark:text-fg-dark-secondary truncate flex-1">
              {selectedFile.name}
            </span>
            <span className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary shrink-0">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </span>
            <button
              type="button"
              aria-label="Remove file"
              onClick={() => {
                onFileSelect(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              className="p-0.5 rounded text-fg-tertiary hover:text-fg dark:hover:text-fg-dark-secondary transition-colors"
            >
              <X size={12} />
            </button>
            <button
              type="button"
              aria-label="Upload document"
              onClick={onUpload}
              disabled={uploading}
              className="rounded-md bg-fg dark:bg-fg-dark px-2.5 py-1 text-[11px] font-medium text-app dark:text-app-dark hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {uploading ? <Loader2 size={11} className="animate-spin" /> : 'Upload'}
            </button>
          </div>
        )}

        <div className="flex items-end gap-1.5 rounded-xl border border-edge dark:border-edge-dark bg-surface dark:bg-surface-dark p-1.5 focus-within:border-fg-muted dark:focus-within:border-fg-dark-tertiary focus-within:shadow-sm transition-all">
          <button
            type="button"
            aria-label="Attach file"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="shrink-0 p-2 rounded-lg text-fg-tertiary hover:text-fg hover:bg-surface-secondary dark:text-fg-dark-tertiary dark:hover:text-fg-dark dark:hover:bg-surface-dark-elevated disabled:opacity-40 transition-colors"
          >
            <Paperclip size={16} />
          </button>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInput}
            onKeyDown={onKeyDown}
            placeholder={loading ? 'Waiting for response... (Esc to stop)' : 'Type your message...'}
            rows={1}
            className="flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm text-fg dark:text-fg-dark outline-none placeholder:text-fg-tertiary dark:placeholder:text-fg-dark-tertiary min-h-[36px] max-h-[200px]"
            aria-label="Message input"
          />
          <button
            type="button"
            aria-label="Send message"
            onClick={onSubmit}
            disabled={!canSend}
            className={`shrink-0 p-2 rounded-lg transition-all ${
              canSend
                ? 'bg-fg dark:bg-fg-dark text-app dark:text-app-dark hover:opacity-90 active:scale-95'
                : 'text-fg-muted dark:text-fg-dark-tertiary cursor-not-allowed'
            }`}
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-center text-2xs text-fg-muted dark:text-fg-dark-tertiary mt-1.5">
          Enter to send · Shift+Enter for new line{loading ? ' · Esc to stop' : ''}
        </p>
      </div>
    </div>
  )
}
