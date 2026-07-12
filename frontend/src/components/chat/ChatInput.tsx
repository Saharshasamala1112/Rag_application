import { useState } from 'react'
import { Button } from '../common/Button'

interface ChatInputProps {
  onSubmit: (value: string) => void
  disabled?: boolean
  onUploadClick?: () => void
  uploadDisabled?: boolean
}

export const ChatInput = ({ onSubmit, disabled = false, onUploadClick, uploadDisabled = false }: ChatInputProps) => {
  const [value, setValue] = useState('')

  const submit = () => {
    if (!value.trim() || disabled) {
      return
    }

    onSubmit(value.trim())
    setValue('')
  }

  return (
    <div className="rounded-[32px] border border-slate-200 bg-slate-100 p-4 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.3)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {onUploadClick ? (
          <Button
            type="button"
            onClick={onUploadClick}
            disabled={uploadDisabled}
            className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-4 text-base font-semibold"
          >
            + Upload
          </Button>
        ) : null}

        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Ask the assistant anything…"
          rows={3}
          className="min-h-[100px] flex-1 resize-none rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-900 outline-none shadow-sm transition duration-200 focus:border-slate-900 focus:ring-2 focus:ring-sky-500/20"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
        />

        <Button onClick={submit} disabled={disabled || !value.trim()} className="bg-sky-600 text-white hover:bg-sky-500 px-6 py-4">
          Send
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>Enter = Send</span>
        <span className="h-1 w-1 rounded-full bg-slate-400" />
        <span>Shift + Enter = New line</span>
      </div>
    </div>
  )
}
