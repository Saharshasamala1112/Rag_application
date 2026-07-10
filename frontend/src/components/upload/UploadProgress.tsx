interface UploadProgressProps {
  isUploading: boolean
  message?: string
}

export const UploadProgress = ({ isUploading, message }: UploadProgressProps) => {
  if (!isUploading && !message) {
    return null
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
      {isUploading ? 'Uploading and extracting your document…' : message}
    </div>
  )
}
