import { useRef } from 'react'
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

  const canSend = inputValue.trim().length > 0 && !loading

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="max-w-[800px] mx-auto">
        {/* File preview chip */}
        {selectedFile && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 animate-scale-in">
            <FileIcon type={selectedFile.name.split('.').pop() || ''} />
            <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate flex-1">
              {selectedFile.name}
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </span>
            <button
              type="button"
              aria-label="Remove file"
              onClick={() => {
                onFileSelect(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              className="p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              <X size={12} />
            </button>
            <button
              type="button"
              aria-label="Upload document"
              onClick={onUpload}
              disabled={uploading}
              className="rounded-md bg-zinc-900 dark:bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-40 transition-colors"
            >
              {uploading ? <Loader2 size={11} className="animate-spin" /> : 'Upload'}
            </button>
          </div>
        )}

        {/* Composer input */}
        <div className="flex items-end gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 p-1.5 focus-within:border-zinc-400 dark:focus-within:border-zinc-500 focus-within:shadow-sm transition-all">
          <button
            type="button"
            aria-label="Attach file"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="shrink-0 p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 transition-colors"
          >
            <Paperclip size={16} />
          </button>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInput}
            onKeyDown={onKeyDown}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500 min-h-[36px] max-h-[200px]"
            aria-label="Message input"
          />
          <button
            type="button"
            aria-label="Send message"
            onClick={onSubmit}
            disabled={!canSend}
            className={`shrink-0 p-2 rounded-lg transition-all ${
              canSend
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95'
                : 'text-zinc-300 dark:text-zinc-600 cursor-not-allowed'
            }`}
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-center text-[10px] text-zinc-300 dark:text-zinc-600 mt-1.5">
          Enter to send · Shift+Enter for new line · Attach files with paperclip
        </p>
      </div>
    </div>
  )
}
