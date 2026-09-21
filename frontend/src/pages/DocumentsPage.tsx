import { useState, useRef, useCallback } from 'react'
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
  const { uploadBatch, loading: uploading, uploadQueue } = useUpload()
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) uploadBatch(files)
  }, [uploadBatch])

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
    if (files.length > 0) uploadBatch(files)
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
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-6 h-12 border-b border-edge dark:border-edge-dark shrink-0">
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
                className="px-2.5 py-1.5 text-xs text-fg-secondary dark:text-fg-dark-secondary hover:bg-surface-secondary dark:hover:bg-surface-dark-elevated rounded-md transition-colors"
              >
                Clear selection
              </button>
              <button
                type="button"
                onClick={() => setBulkDeleteOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger-subtle dark:text-danger-dark dark:hover:bg-danger-dark-subtle rounded-md transition-colors"
              >
                <Trash2 size={13} />
                Delete ({selectedIds.length})
              </button>
            </>
          ) : (
            <>
              <div className="flex rounded-md border border-edge dark:border-edge-dark overflow-hidden">
                <button
                  type="button"
                  onClick={() => setView('grid')}
                  className={cn(
                    'p-1.5 transition-colors',
                    view === 'grid'
                      ? 'bg-surface-secondary dark:bg-surface-dark-elevated text-fg dark:text-fg-dark'
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
                      ? 'bg-surface-secondary dark:bg-surface-dark-elevated text-fg dark:text-fg-dark'
                      : 'text-fg-tertiary hover:text-fg dark:text-fg-dark-tertiary dark:hover:text-fg-dark',
                  )}
                  aria-label="List view"
                >
                  <List size={14} />
                </button>
              </div>
              <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-hover dark:bg-accent-dark dark:text-app-dark dark:hover:bg-accent-dark-hover rounded-lg cursor-pointer transition-colors">
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
        <div className="px-6 py-2 border-b border-edge dark:border-edge-dark bg-surface-secondary/50 dark:bg-surface-dark-elevated/50">
          <div className="flex items-center gap-2 text-2xs text-fg-secondary dark:text-fg-dark-secondary">
            <Loader2 size={12} className={uploading ? 'animate-spin text-accent dark:text-accent-dark' : 'text-success dark:text-success-dark'} />
            <span>
              {uploading
                ? `Uploading ${uploadingCount} file${uploadingCount !== 1 ? 's' : ''}...`
                : `Uploaded ${doneCount} file${doneCount !== 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="mt-1.5 h-1 rounded-full bg-edge dark:bg-edge-dark overflow-hidden">
            <div
              className="h-full bg-accent dark:bg-accent-dark rounded-full transition-all duration-300"
              style={{
                width: uploadQueue.length > 0
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
          <div className="rounded-xl border-2 border-dashed border-accent bg-surface dark:bg-surface-dark px-12 py-10 text-center shadow-lg">
            <Upload size={36} className="mx-auto mb-3 text-accent dark:text-accent-dark" />
            <p className="text-sm font-medium text-fg dark:text-fg-dark">
              Drop files to upload
            </p>
            <p className="text-xs text-fg-secondary dark:text-fg-dark-secondary mt-1">
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
            {documents.map((doc) => {
              const isSelected = selectedIds.includes(doc.document_id)
              const isEditing = editingId === doc.document_id

              return (
                <Link
                  key={doc.document_id}
                  to={`/documents/${doc.document_id}`}
                  className={cn(
                    'group relative rounded-xl border bg-surface dark:bg-surface-dark p-4 transition-colors block',
                    isSelected
                      ? 'border-accent/50 dark:border-accent-dark/50 ring-1 ring-accent/20 dark:ring-accent-dark/20'
                      : 'border-edge dark:border-edge-dark hover:border-edge-strong dark:hover:border-edge-dark-strong',
                  )}
                  onClick={(e) => {
                    if (isEditing || e.defaultPrevented) return
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleSelect(doc.document_id)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-edge dark:border-edge-dark text-accent focus:ring-accent/40 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                      <FileIconLarge extension={doc.filename.split('.').pop() || ''} />
                    </div>
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

                  {isEditing ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(doc.document_id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        autoFocus
                        className="flex-1 min-w-0 px-1.5 py-0.5 text-xs bg-surface-secondary dark:bg-surface-dark-elevated border border-accent dark:border-accent-dark rounded text-fg dark:text-fg-dark focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          handleRename(doc.document_id)
                        }}
                        className="p-0.5 text-success dark:text-success-dark"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          setEditingId(null)
                        }}
                        className="p-0.5 text-fg-tertiary dark:text-fg-dark-tertiary"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-medium text-fg dark:text-fg-dark truncate flex-1" title={doc.filename}>
                        {doc.filename}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setEditingId(doc.document_id)
                          setEditName(doc.filename)
                        }}
                        className="p-0.5 rounded text-fg-muted hover:text-fg dark:text-fg-dark-tertiary dark:hover:text-fg-dark opacity-0 group-hover:opacity-100 transition-all"
                        title="Rename"
                      >
                        <Pencil size={10} />
                      </button>
                    </div>
                  )}

                  <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary mt-1">
                    {doc.chunk_count} chunks · {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="space-y-1">
            {documents.map((doc) => {
              const isSelected = selectedIds.includes(doc.document_id)
              const isEditing = editingId === doc.document_id

              return (
                <Link
                  key={doc.document_id}
                  to={`/documents/${doc.document_id}`}
                  className={cn(
                    'group flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isSelected
                      ? 'bg-accent-subtle dark:bg-accent-dark-subtle'
                      : 'hover:bg-surface-secondary dark:hover:bg-surface-dark-elevated',
                  )}
                  onClick={(e) => {
                    if (isEditing || e.defaultPrevented) return
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleSelect(doc.document_id)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border-edge dark:border-edge-dark text-accent focus:ring-accent/40"
                  />
                  <FileIconLarge extension={doc.filename.split('.').pop() || ''} />
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(doc.document_id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          autoFocus
                          className="flex-1 min-w-0 px-1.5 py-0.5 text-xs bg-surface-secondary dark:bg-surface-dark-elevated border border-accent dark:border-accent-dark rounded text-fg dark:text-fg-dark focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            handleRename(doc.document_id)
                          }}
                          className="p-0.5 text-success dark:text-success-dark"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            setEditingId(null)
                          }}
                          className="p-0.5 text-fg-tertiary dark:text-fg-dark-tertiary"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium text-fg dark:text-fg-dark truncate">
                          {doc.filename}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setEditingId(doc.document_id)
                            setEditName(doc.filename)
                          }}
                          className="p-0.5 rounded text-fg-muted hover:text-fg dark:text-fg-dark-tertiary dark:hover:text-fg-dark opacity-0 group-hover:opacity-100 transition-all"
                          title="Rename"
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
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <ConfirmationDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedIds.length} documents`}
        description={`This will permanently remove ${selectedIds.length} documents and all their chunks. This cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.length} documents`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
        loading={bulkDeleting}
      />
    </div>
  )
}
