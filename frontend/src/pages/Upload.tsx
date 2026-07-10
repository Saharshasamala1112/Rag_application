import { useState } from 'react'
import { Card } from '../components/common/Card'
import { Loader } from '../components/common/Loader'
import { FilePreview } from '../components/upload/FilePreview'
import { UploadBox } from '../components/upload/UploadBox'
import { UploadProgress } from '../components/upload/UploadProgress'
import { useUpload } from '../hooks/useUpload'

export const Upload = () => {
  const { upload, loading, error, document } = useUpload()
  const [selectedFileName, setSelectedFileName] = useState('')

  const handleUpload = async (file: File) => {
    setSelectedFileName(file.name)
    await upload(file)
  }

  return (
    <div className="space-y-6">
      <Card title="Upload a document" description="Prefer a short PDF so the extraction is quick and the preview stays readable.">
        <UploadBox onUpload={handleUpload} />
        <div className="mt-6 space-y-3">
          <UploadProgress isUploading={loading} message={error ?? undefined} />
          {document ? <FilePreview fileName={document.fileName} textPreview={document.textPreview} /> : null}
          {selectedFileName && !document ? <p className="text-sm text-slate-600">Preparing {selectedFileName}…</p> : null}
        </div>
      </Card>

      {loading ? <Loader label="Extracting text from the document..." /> : null}
    </div>
  )
}
