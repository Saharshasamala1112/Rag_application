import { useRef, useState } from 'react'
import { Button } from '../common/Button'

interface UploadBoxProps {
  onFileSelect: (file: File) => void
  selectedFileName?: string
}

const acceptedTypes = '.pdf,.doc,.docx,.txt,.md'
const acceptedTypeLabels = ['PDF', 'DOCX', 'DOC', 'TXT', 'MD']

export const UploadBox = ({ onFileSelect, selectedFileName }: UploadBoxProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  return (
    <div
      className={`rounded-3xl border-2 border-dashed p-8 transition ${dragActive ? 'border-slate-900 bg-slate-50' : 'border-slate-300 bg-white'} shadow-sm`}
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
        accept={acceptedTypes}
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />

      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
            <path d="M12 3c1.657 0 3 1.343 3 3v5h4l-7 7-7-7h4V6c0-1.657 1.343-3 3-3z" />
            <path d="M5 18h14v2H5z" />
          </svg>
        </div>

        <div>
          <p className="text-xl font-semibold text-slate-900">Upload your document</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Drag & drop a file, or choose one from your device. We accept multiple document formats and upload them securely to the local backend.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {acceptedTypeLabels.map((label) => (
            <span key={label} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              {label}
            </span>
          ))}
        </div>

        {selectedFileName ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-left text-sm text-slate-700 shadow-sm w-full">
            <p className="font-semibold text-slate-900">Selected file</p>
            <p className="truncate">{selectedFileName}</p>
          </div>
        ) : null}

        <Button className="w-full max-w-xs" onClick={() => inputRef.current?.click()}>
          Browse files
        </Button>

        <p className="text-xs text-slate-500">Only one file can be uploaded at a time. File extraction begins after you click upload.</p>
      </div>
    </div>
  )
}
