import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Upload, Grid3X3, List, Trash2 } from 'lucide-react'
import { useDocumentStore } from '../store/document.store'
import { useUpload } from '../hooks/useUpload'
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog'
import { FileIconLarge } from '../components/ui/FileIcon'
import { EmptyState } from '../components/ui/EmptyState'
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
      <div className="flex items-center justify-between px-6 h-12 border-b border-edge dark:border-edge-dark shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-fg dark:text-fg-dark">Documents</h1>
          <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-edge dark:border-edge-dark overflow-hidden">
            <button
              type="button"
              onClick={() => setView('grid')}
              className={`p-1.5 transition-colors ${view === 'grid' ? 'bg-surface-secondary dark:bg-surface-dark-elevated text-fg dark:text-fg-dark' : 'text-fg-tertiary hover:text-fg dark:text-fg-dark-tertiary dark:hover:text-fg-dark'}`}
              aria-label="Grid view"
            >
              <Grid3X3 size={14} />
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={`p-1.5 transition-colors ${view === 'list' ? 'bg-surface-secondary dark:bg-surface-dark-elevated text-fg dark:text-fg-dark' : 'text-fg-tertiary hover:text-fg dark:text-fg-dark-tertiary dark:hover:text-fg-dark'}`}
              aria-label="List view"
            >
              <List size={14} />
            </button>
          </div>
          <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-hover dark:bg-accent-dark dark:text-app-dark dark:hover:bg-accent-dark-hover rounded-lg cursor-pointer transition-colors">
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

      <div
        className="flex-1 overflow-y-auto p-6"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {documents.length === 0 ? (
          <EmptyState
            icon={<FileText size={24} />}
            title="No documents yet"
            description="Upload files or drag and drop to get started"
            action={
              <label className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-accent hover:bg-accent-hover dark:bg-accent-dark dark:text-app-dark rounded-lg cursor-pointer transition-colors">
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
            }
          />
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {documents.map((doc) => (
              <Link
                key={doc.document_id}
                to={`/documents/${doc.document_id}`}
                className="group relative rounded-xl border border-edge dark:border-edge-dark bg-surface dark:bg-surface-dark p-4 hover:border-edge-strong dark:hover:border-edge-dark-strong transition-colors block"
              >
                <div className="flex items-start justify-between mb-3">
                  <FileIconLarge extension={doc.filename.split('.').pop() || ''} />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setDeleteTarget(doc.document_id)
                    }}
                    className="p-1 rounded text-fg-muted hover:text-danger dark:text-fg-dark-tertiary dark:hover:text-danger-dark transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <p className="text-xs font-medium text-fg dark:text-fg-dark truncate mb-1" title={doc.filename}>
                  {doc.filename}
                </p>
                <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
                  {doc.chunk_count} chunks · {new Date(doc.uploaded_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {documents.map((doc) => (
              <Link
                key={doc.document_id}
                to={`/documents/${doc.document_id}`}
                className="group flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-surface-secondary dark:hover:bg-surface-dark-elevated transition-colors"
              >
                <FileIconLarge extension={doc.filename.split('.').pop() || ''} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-fg dark:text-fg-dark truncate">
                    {doc.filename}
                  </p>
                  <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
                    {doc.chunk_count} chunks · {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setDeleteTarget(doc.document_id)
                  }}
                  className="p-1.5 rounded text-fg-muted hover:text-danger dark:text-fg-dark-tertiary dark:hover:text-danger-dark opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </Link>
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
