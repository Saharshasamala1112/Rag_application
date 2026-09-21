import { useRef } from 'react'
import { Send } from 'lucide-react'

interface ChatComposerProps {
  inputValue: string
  onInputChange: (value: string) => void
  onSubmit: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  loading: boolean
}

export function ChatComposer({
  inputValue,
  onInputChange,
  onSubmit,
  onKeyDown,
  loading,
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
        <div className="flex items-end gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 p-1.5 focus-within:border-zinc-400 dark:focus-within:border-zinc-500 focus-within:shadow-sm transition-all">
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
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
