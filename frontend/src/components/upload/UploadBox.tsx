import { useRef, useState } from 'react'
import { Button } from '../common/Button'

interface UploadBoxProps {
  onUpload: (file: File) => void
}

export const UploadBox = ({ onUpload }: UploadBoxProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (file) {
      onUpload(file)
    }
  }

  return (
    <div
      className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${dragActive ? 'border-slate-900 bg-slate-50' : 'border-slate-300'}`}
      onDragOver={(event) => {
        event.preventDefault()
        setDragActive(true)
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragActive(false)
        handleFiles(event.dataTransfer.files)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
      <p className="text-lg font-semibold text-slate-900">Drop a PDF document here</p>
      <p className="mt-2 text-sm text-slate-600">We will extract the text locally for your questions.</p>
      <Button className="mt-5" onClick={() => inputRef.current?.click()}>
        Select PDF
      </Button>
    </div>
  )
}
