interface UploadProgressProps {
  isUploading: boolean
  message?: string
}

export const UploadProgress = ({ isUploading, message }: UploadProgressProps) => {
  if (!isUploading && !message) {
    return null
  }

  return (
    <div className={`rounded-3xl border p-4 text-sm ${isUploading ? 'border-sky-200 bg-sky-50 text-slate-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
      {isUploading ? 'Uploading and extracting your document…' : message}
    </div>
  )
}
