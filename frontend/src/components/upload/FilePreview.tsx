interface FilePreviewProps {
  fileName: string
  textPreview: string
  fileSize?: number
  fileType?: string
}

export const FilePreview = ({ fileName, textPreview, fileSize, fileType }: FilePreviewProps) => {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-semibold text-slate-900">{fileName}</p>
          <p className="mt-1 text-sm text-slate-500">
            {fileType ?? 'Unknown type'} {fileSize ? `• ${(fileSize / 1024).toFixed(1)} KB` : ''}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
          Uploaded
        </span>
      </div>

      <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        {textPreview}
      </div>
    </div>
  )
}
