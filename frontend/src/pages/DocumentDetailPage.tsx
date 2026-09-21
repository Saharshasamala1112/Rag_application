import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, FileText } from 'lucide-react'
import { getDocumentChunks } from '../services/upload.service'
import type { DocumentChunk } from '../services/upload.service'
import { useDocumentStore } from '../store/document.store'
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog'
import { FileIconLarge } from '../components/ui/FileIcon'
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
    load()
    return () => { cancelled = true }
  }, [id])

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      await axiosInstance.delete(`/documents/${id}`)
      removeDocument(id)
      navigate('/documents')
    } catch {
      // handled by interceptor
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  if (!id) return null

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 h-14 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <button
          type="button"
          onClick={() => navigate('/documents')}
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft size={15} />
        </button>
        <FileIconLarge extension={doc?.filename.split('.').pop() || ''} />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {doc?.filename || 'Document'}
          </h1>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {total} chunks
            {doc?.file_size ? ` · ${(doc.file_size / 1024).toFixed(1)} KB` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="p-2 rounded-md text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Delete document"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          </div>
        ) : chunks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText size={24} className="text-zinc-300 dark:text-zinc-600 mb-3" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No chunks found</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-3">
            {chunks.map((chunk, i) => (
              <div
                key={chunk.chunk_id || i}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    Chunk #{i + 1}
                  </span>
                  {chunk.source && (
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      {chunk.source}
                      {chunk.page_number != null ? ` · p.${chunk.page_number}` : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {chunk.content}
                </p>
                {chunk.header && (
                  <p className="mt-2 text-[10px] text-zinc-400 dark:text-zinc-500 italic">
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
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
        loading={deleting}
      />
    </div>
  )
}
