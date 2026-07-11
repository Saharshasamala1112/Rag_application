import { useState } from 'react'
import { Card } from '../components/common/Card'
import { Loader } from '../components/common/Loader'
import { FilePreview } from '../components/upload/FilePreview'
import { UploadBox } from '../components/upload/UploadBox'
import { UploadProgress } from '../components/upload/UploadProgress'
import { useUpload } from '../hooks/useUpload'
import { Button } from '../components/common/Button'

export const Upload = () => {
  const { upload, loading, error, document } = useUpload()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    await upload(selectedFile)
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card title="Upload a document" description="Upload one file and let the backend extract it locally for fast, private retrieval.">
          <UploadBox onFileSelect={handleFileSelect} selectedFileName={selectedFile?.name} />

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
            <div className="space-y-4">
              <UploadProgress isUploading={loading} message={error ?? undefined} />

              {selectedFile ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">Selected file</p>
                  <p className="mt-2 text-base text-slate-700">{selectedFile.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Unknown type'}
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">Why upload here?</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li>• Local extraction without sending raw text to third parties.</li>
                    <li>• Supports PDFs, Word docs, text files, and markdown.</li>
                    <li>• One-click upload and automatic preview.</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-end">
              <Button onClick={handleUpload} disabled={!selectedFile || loading}>
                {loading ? 'Uploading…' : 'Upload file'}
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Upload best practices" description="A few tips to make your extraction smoother.">
            <div className="space-y-4 text-sm text-slate-600">
              <div>
                <p className="font-semibold text-slate-900">Keep files concise</p>
                <p>Shorter documents extract faster and are easier to preview on the app.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Use supported file types</p>
                <p>PDF, DOCX, DOC, TXT, and MD files are accepted and processed seamlessly.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Upload one file at a time</p>
                <p>This keeps extraction predictable and lets you review each document before asking questions.</p>
              </div>
            </div>
          </Card>

          <Card title="Next steps" description="After upload, you can move to chat or review the extracted content.">
            <div className="space-y-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Improved workflow</p>
              <p>Once your content is extracted, use the Chat page to ask questions and see source citations.</p>
              <p>Uploaded documents will be available in the app until the session ends.</p>
            </div>
          </Card>
        </div>
      </div>

      {document ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Document preview</h2>
          <FilePreview
            fileName={document.fileName}
            fileType={selectedFile?.type}
            fileSize={selectedFile?.size}
            textPreview={document.textPreview}
          />
        </div>
      ) : null}

      {loading ? <Loader label="Extracting text from the document..." /> : null}
    </div>
  )
}
