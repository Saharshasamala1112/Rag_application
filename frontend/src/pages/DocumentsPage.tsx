import { useState } from 'react'
import { FileText, Upload, Grid3X3, List, Trash2 } from 'lucide-react'
import { useDocumentStore } from '../store/document.store'
import { useUpload } from '../hooks/useUpload'
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog'
import { FileIconLarge } from '../components/ui/FileIcon'
import axiosInstance from '../lib/axios'

type ViewMode = 'grid' | 'list'

export function DocumentsPage() {
  const documents = useDocumentStore((s) => s.documents)
  const removeDocument = useDocumentStore((s) => s.removeDocument)
  const { upload } = useUpload()
  const [view, setView] = useState<ViewMode>('grid')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await axiosInstance.delete(`/documents/${deleteTarget}`)
      removeDocument(deleteTarget)
    } catch {
      // handled by interceptor
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    files.forEach((f) => upload(f))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach((f) => upload(f))
    e.target.value = ''
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Documents</h1>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setView('grid')}
              className={`p-1.5 ${view === 'grid' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
              aria-label="Grid view"
            >
              <Grid3X3 size={14} />
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={`p-1.5 ${view === 'list' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
              aria-label="List view"
            >
              <List size={14} />
            </button>
          </div>
          <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer transition-colors">
            <Upload size={13} />
            Upload
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.txt,.md,.csv,.json,.html,.xlsx,.xls,.pptx,.ppt,.odt,.rtf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto p-6"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <FileText size={24} className="text-zinc-300 dark:text-zinc-600" />
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">No documents yet</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
              Upload files or drag and drop to get started
            </p>
            <label className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer transition-colors">
              <Upload size={13} />
              Upload files
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.txt,.md,.csv,.json,.html,.xlsx,.xls,.pptx,.ppt,.odt,.rtf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {documents.map((doc) => (
              <div
                key={doc.document_id}
                className="group relative rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <FileIconLarge extension={doc.filename.split('.').pop() || ''} />
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(doc.document_id)}
                      className="p-1 rounded text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate mb-1" title={doc.filename}>
                  {doc.filename}
                </p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  {doc.chunk_count} chunks · {new Date(doc.uploaded_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {documents.map((doc) => (
              <div
                key={doc.document_id}
                className="group flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <FileIconLarge extension={doc.filename.split('.').pop() || ''} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {doc.filename}
                  </p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    {doc.chunk_count} chunks · {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(doc.document_id)}
                  className="p-1.5 rounded text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmationDialog
        open={!!deleteTarget}
        title="Delete document"
        description="This will permanently remove the document and all its chunks. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  )
}
