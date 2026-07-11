import { useState } from 'react'
import { Button } from '../common/Button'

interface ChatInputProps {
  onSubmit: (value: string) => void
  disabled?: boolean
}

export const ChatInput = ({ onSubmit, disabled = false }: ChatInputProps) => {
  const [value, setValue] = useState('')

  const submit = () => {
    if (!value.trim() || disabled) {
      return
    }

    onSubmit(value.trim())
    setValue('')
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Type your question here…"
          rows={2}
          className="min-h-[80px] flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none shadow-sm transition focus:border-slate-900"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
        />

        <div className="flex items-center gap-3">
          <Button onClick={submit} disabled={disabled || !value.trim()}>
            Send
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>Press Enter to send</span>
        <span className="h-1 w-1 rounded-full bg-slate-400" />
        <span>Shift + Enter for a new line</span>
      </div>
    </div>
  )
}
