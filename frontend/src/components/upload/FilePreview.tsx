interface FilePreviewProps {
  fileName: string
  textPreview: string
}

export const FilePreview = ({ fileName, textPreview }: FilePreviewProps) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">{fileName}</p>
      <p className="mt-2 line-clamp-4 text-sm text-slate-600">{textPreview}</p>
    </div>
  )
}
