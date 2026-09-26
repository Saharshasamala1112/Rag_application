import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Upload, Grid3X3, List, Trash2, Pencil, Check, X, Loader2 } from 'lucide-react'
import { useDocumentStore } from '../store/document.store'
import { useUpload } from '../hooks/useUpload'
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog'
import { FileIconLarge } from '../components/ui/FileIcon'
import { EmptyState } from '../components/ui/EmptyState'
import axiosInstance from '../lib/axios'
import { cn } from '../lib/utils'

type ViewMode = 'grid' | 'list'

export function DocumentsPage() {
  const documents = useDocumentStore((s) => s.documents)
  const removeDocument = useDocumentStore((s) => s.removeDocument)
  const { uploadBatch, loading: uploading, uploadQueue, fetchDocuments } = useUpload()
  const [view, setView] = useState<ViewMode>('grid')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void fetchDocuments()
  }, [fetchDocuments])

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

  const handleBulkDelete = async () => {
    setBulkDeleting(true)
    try {
      for (const id of selectedIds) {
        await axiosInstance.delete(`/documents/${id}`)
        removeDocument(id)
      }
      setSelectedIds([])
      setBulkDeleteOpen(false)
    } catch {
      // handled by interceptor
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleRename = async (docId: string) => {
    if (!editName.trim()) {
      setEditingId(null)
      return
    }
    try {
      await axiosInstance.patch(`/documents/${docId}`, { filename: editName.trim() })
      const { setDocuments } = useDocumentStore.getState()
      const updated = documents.map((d) =>
        d.document_id === docId ? { ...d, filename: editName.trim() } : d,
      )
      setDocuments(updated)
    } catch {
      // handled by interceptor
    } finally {
      setEditingId(null)
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) void uploadBatch(files)
    },
    [uploadBatch],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) void uploadBatch(files)
    e.target.value = ''
  }

  const toggleSelect = (docId: string) => {
    setSelectedIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId],
    )
  }

  const uploadingCount = uploadQueue.filter((q) => q.progress === 'uploading').length
  const doneCount = uploadQueue.filter((q) => q.progress === 'done').length

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-edge px-6 dark:border-edge-dark">
        <div>
          <h1 className="text-sm font-semibold text-fg dark:text-fg-dark">Documents</h1>
          <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
            {selectedIds.length > 0 && ` · ${selectedIds.length} selected`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="rounded-md px-2.5 py-1.5 text-xs text-fg-secondary transition-colors hover:bg-surface-secondary dark:text-fg-dark-secondary dark:hover:bg-surface-dark-elevated"
              >
                Clear selection
              </button>
              <button
                type="button"
                onClick={() => setBulkDeleteOpen(true)}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger-subtle dark:text-danger-dark dark:hover:bg-danger-dark-subtle"
              >
                <Trash2 size={13} />
                Delete ({selectedIds.length})
              </button>
            </>
          ) : (
            <>
              <div className="flex overflow-hidden rounded-md border border-edge dark:border-edge-dark">
                <button
                  type="button"
                  onClick={() => setView('grid')}
                  className={cn(
                    'p-1.5 transition-colors',
                    view === 'grid'
                      ? 'bg-surface-secondary text-fg dark:bg-surface-dark-elevated dark:text-fg-dark'
                      : 'text-fg-tertiary hover:text-fg dark:text-fg-dark-tertiary dark:hover:text-fg-dark',
                  )}
                  aria-label="Grid view"
                >
                  <Grid3X3 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className={cn(
                    'p-1.5 transition-colors',
                    view === 'list'
                      ? 'bg-surface-secondary text-fg dark:bg-surface-dark-elevated dark:text-fg-dark'
                      : 'text-fg-tertiary hover:text-fg dark:text-fg-dark-tertiary dark:hover:text-fg-dark',
                  )}
                  aria-label="List view"
                >
                  <List size={14} />
                </button>
              </div>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover dark:bg-accent-dark dark:text-app-dark dark:hover:bg-accent-dark-hover">
                <Upload size={13} />
                Upload
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.txt,.md,.csv,.json,.html,.xlsx,.xls,.pptx,.ppt,.odt,.rtf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </>
          )}
        </div>
      </div>

      {/* Upload progress bar */}
      {uploadQueue.length > 0 && (
        <div className="border-b border-edge bg-surface-secondary/50 px-6 py-2 dark:border-edge-dark dark:bg-surface-dark-elevated/50">
          <div className="flex items-center gap-2 text-2xs text-fg-secondary dark:text-fg-dark-secondary">
            <Loader2
              size={12}
              className={
                uploading
                  ? 'animate-spin text-accent dark:text-accent-dark'
                  : 'text-success dark:text-success-dark'
              }
            />
            <span>
              {uploading
                ? `Uploading ${uploadingCount} file${uploadingCount !== 1 ? 's' : ''}...`
                : `Uploaded ${doneCount} file${doneCount !== 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-edge dark:bg-edge-dark">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300 dark:bg-accent-dark"
              style={{
                width:
                  uploadQueue.length > 0
                    ? `${(uploadQueue.filter((q) => q.progress === 'done' || q.progress === 'error').length / uploadQueue.length) * 100}%`
                    : '0%',
              }}
            />
          </div>
        </div>
      )}

      {/* Drag overlay */}
      {isDragOver && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/10 backdrop-blur-[1px]"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="rounded-xl border-2 border-dashed border-accent bg-surface px-12 py-10 text-center shadow-lg dark:bg-surface-dark">
            <Upload size={36} className="mx-auto mb-3 text-accent dark:text-accent-dark" />
            <p className="text-sm font-medium text-fg dark:text-fg-dark">Drop files to upload</p>
            <p className="mt-1 text-xs text-fg-secondary dark:text-fg-dark-secondary">
              Multiple files supported
            </p>
          </div>
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto p-6"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {documents.length === 0 ? (
          <EmptyState
            icon={<FileText size={24} />}
            title="No documents yet"
            description="Upload files or drag and drop to get started"
            action={
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-hover dark:bg-accent-dark dark:text-app-dark">
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {documents.map((doc) => {
              const isSelected = selectedIds.includes(doc.document_id)
              const isEditing = editingId === doc.document_id

              return (
                <div
                  key={doc.document_id}
                  className={cn(
                    'group relative rounded-xl border bg-surface p-4 transition-colors dark:bg-surface-dark',
                    isSelected
                      ? 'border-accent/50 ring-1 ring-accent/20 dark:border-accent-dark/50 dark:ring-accent-dark/20'
                      : 'border-edge hover:border-edge-strong dark:border-edge-dark dark:hover:border-edge-dark-strong',
                  )}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        aria-label={`Select ${doc.filename}`}
                        checked={isSelected}
                        onChange={() => toggleSelect(doc.document_id)}
                        className="rounded border-edge text-accent focus:ring-accent/40 dark:border-edge-dark"
                      />
                      <FileIconLarge extension={doc.filename.split('.').pop() || ''} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(doc.document_id)}
                      className="rounded p-1 text-fg-muted transition-colors hover:text-danger dark:text-fg-dark-tertiary dark:hover:text-danger-dark"
                      title="Delete"
                      aria-label={`Delete ${doc.filename}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleRename(doc.document_id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        autoFocus
                        className="min-w-0 flex-1 rounded border border-accent bg-surface-secondary px-1.5 py-0.5 text-xs text-fg focus:outline-none dark:border-accent-dark dark:bg-surface-dark-elevated dark:text-fg-dark"
                      />
                      <button
                        type="button"
                        onClick={() => void handleRename(doc.document_id)}
                        className="p-0.5 text-success dark:text-success-dark"
                        aria-label={`Save name for ${doc.filename}`}
                      >
                        <Check size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-0.5 text-fg-tertiary dark:text-fg-dark-tertiary"
                        aria-label="Cancel rename"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/documents/${doc.document_id}`}
                        className="flex-1 truncate text-xs font-medium text-fg dark:text-fg-dark"
                        title={doc.filename}
                      >
                        {doc.filename}
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(doc.document_id)
                          setEditName(doc.filename)
                        }}
                        className="rounded p-0.5 text-fg-muted hover:text-fg dark:text-fg-dark-tertiary dark:hover:text-fg-dark"
                        title="Rename"
                        aria-label={`Rename ${doc.filename}`}
                      >
                        <Pencil size={10} />
                      </button>
                    </div>
                  )}

                  <p className="mt-1 text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
                    {doc.chunk_count} chunks · {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-1">
            {documents.map((doc) => {
              const isSelected = selectedIds.includes(doc.document_id)
              const isEditing = editingId === doc.document_id

              return (
                <div
                  key={doc.document_id}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-4 py-3 transition-colors',
                    isSelected
                      ? 'bg-accent-subtle dark:bg-accent-dark-subtle'
                      : 'hover:bg-surface-secondary dark:hover:bg-surface-dark-elevated',
                  )}
                >
                  <input
                    type="checkbox"
                    aria-label={`Select ${doc.filename}`}
                    checked={isSelected}
                    onChange={() => toggleSelect(doc.document_id)}
                    className="rounded border-edge text-accent focus:ring-accent/40 dark:border-edge-dark"
                  />
                  <FileIconLarge extension={doc.filename.split('.').pop() || ''} />
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void handleRename(doc.document_id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          autoFocus
                          className="min-w-0 flex-1 rounded border border-accent bg-surface-secondary px-1.5 py-0.5 text-xs text-fg focus:outline-none dark:border-accent-dark dark:bg-surface-dark-elevated dark:text-fg-dark"
                        />
                        <button
                          type="button"
                          onClick={() => void handleRename(doc.document_id)}
                          className="p-0.5 text-success dark:text-success-dark"
                          aria-label={`Save name for ${doc.filename}`}
                        >
                          <Check size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-0.5 text-fg-tertiary dark:text-fg-dark-tertiary"
                          aria-label="Cancel rename"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/documents/${doc.document_id}`}
                          className="truncate text-xs font-medium text-fg dark:text-fg-dark"
                        >
                          {doc.filename}
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(doc.document_id)
                            setEditName(doc.filename)
                          }}
                          className="rounded p-0.5 text-fg-muted hover:text-fg dark:text-fg-dark-tertiary dark:hover:text-fg-dark"
                          title="Rename"
                          aria-label={`Rename ${doc.filename}`}
                        >
                          <Pencil size={10} />
                        </button>
                      </div>
                    )}
                    <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
                      {doc.chunk_count} chunks · {new Date(doc.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(doc.document_id)}
                    className="rounded p-1.5 text-fg-muted hover:text-danger dark:text-fg-dark-tertiary dark:hover:text-danger-dark"
                    title="Delete"
                    aria-label={`Delete ${doc.filename}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmationDialog
        open={!!deleteTarget}
        title="Delete document"
        description="This will permanently remove the document and all its chunks. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <ConfirmationDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedIds.length} documents`}
        description={`This will permanently remove ${selectedIds.length} documents and all their chunks. This cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.length} documents`}
        onConfirm={() => void handleBulkDelete()}
        onCancel={() => setBulkDeleteOpen(false)}
        loading={bulkDeleting}
      />
    </div>
  )
}
