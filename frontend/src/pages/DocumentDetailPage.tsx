import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Trash2, FileText } from 'lucide-react'
import { getDocumentChunks } from '../services/upload.service'
import type { DocumentChunk } from '../services/upload.service'
import { useDocumentStore } from '../store/document.store'
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog'
import { FileIconLarge } from '../components/ui/FileIcon'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import axiosInstance from '../lib/axios'

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const removeDocument = useDocumentStore((s) => s.removeDocument)
  const documents = useDocumentStore((s) => s.documents)

  const [chunks, setChunks] = useState<DocumentChunk[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const doc = documents.find((d) => d.document_id === id)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getDocumentChunks(id)
        if (!cancelled) {
          setChunks(res.chunks)
          setTotal(res.total)
        }
      } catch {
        if (!cancelled) setError('Failed to load chunks')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      await axiosInstance.delete(`/documents/${id}`)
      removeDocument(id)
      void navigate('/documents')
    } catch {
      // handled by interceptor
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  if (!id) return null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 flex-col justify-center gap-1 border-b border-edge px-6 dark:border-edge-dark">
        <Breadcrumbs
          items={[{ label: 'Documents', to: '/documents' }, { label: doc?.filename || 'Document' }]}
        />
        <div className="flex items-center gap-3">
          <FileIconLarge extension={doc?.filename.split('.').pop() || ''} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-fg dark:text-fg-dark">
              {doc?.filename || 'Document'}
            </h1>
            <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
              {total} chunks
              {doc?.file_size ? ` · ${(doc.file_size / 1024).toFixed(1)} KB` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="rounded-md p-2 text-fg-tertiary transition-colors hover:bg-surface-secondary hover:text-danger dark:text-fg-dark-tertiary dark:hover:bg-surface-dark-elevated dark:hover:text-danger-dark"
            title="Delete document"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-surface-secondary dark:bg-surface-dark-elevated"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-danger dark:text-danger-dark">{error}</p>
          </div>
        ) : chunks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <FileText size={24} className="mb-3 text-fg-muted dark:text-fg-dark-tertiary" />
            <p className="text-sm text-fg-secondary dark:text-fg-dark-secondary">No chunks found</p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-3">
            {chunks.map((chunk, i) => (
              <div
                key={chunk.chunk_id || i}
                className="rounded-xl border border-edge bg-surface p-4 dark:border-edge-dark dark:bg-surface-dark"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-2xs font-medium text-accent dark:text-accent-dark">
                    Chunk #{i + 1}
                  </span>
                  {chunk.source && (
                    <span className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
                      {chunk.source}
                      {chunk.page_number != null ? ` · p.${chunk.page_number}` : ''}
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-fg-secondary dark:text-fg-dark-secondary">
                  {chunk.content}
                </p>
                {chunk.header && (
                  <p className="mt-2 text-2xs italic text-fg-tertiary dark:text-fg-dark-tertiary">
                    {chunk.header}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmationDialog
        open={deleteOpen}
        title="Delete document"
        description={`Permanently delete "${doc?.filename}" and all ${total} chunks? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteOpen(false)}
        loading={deleting}
      />
    </div>
  )
}
