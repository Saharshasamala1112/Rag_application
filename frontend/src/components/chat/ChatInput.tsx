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
    <div className="flex gap-3">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ask a question about your document"
        className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            submit()
          }
        }}
      />
      <Button onClick={submit} disabled={disabled}>
        Ask
      </Button>
    </div>
  )
}
