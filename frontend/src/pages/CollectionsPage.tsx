import { useEffect, useState } from 'react'
import { FolderOpen, Plus, Trash2, FileText, X } from 'lucide-react'
import { useDocumentStore } from '../store/document.store'
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog'
import * as collectionService from '../services/collection.service'
import type { Collection } from '../services/collection.service'
import { toast } from 'sonner'

export function CollectionsPage() {
  const documents = useDocumentStore((s) => s.documents)
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const res = await collectionService.listCollections()
        if (!cancelled) setCollections(res.collections)
      } catch {
        // handled by interceptor
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const col = await collectionService.createCollection(newName.trim(), newDescription.trim(), selectedDocs)
      setCollections((prev) => [col, ...prev])
      setCreateOpen(false)
      setNewName('')
      setNewDescription('')
      setSelectedDocs([])
      toast.success(`Collection "${col.name}" created`)
    } catch {
      toast.error('Failed to create collection')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await collectionService.deleteCollection(deleteTarget)
      setCollections((prev) => prev.filter((c) => c.collection_id !== deleteTarget))
      toast.success('Collection deleted')
    } catch {
      toast.error('Failed to delete collection')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const toggleDoc = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Collections</h1>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {collections.length} collection{collections.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
        >
          <Plus size={13} />
          New Collection
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 mx-auto">
              <FolderOpen size={24} className="text-zinc-300 dark:text-zinc-600" />
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">No collections yet</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
              Create a collection to organize related documents
            </p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
            >
              <Plus size={13} />
              Create collection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {collections.map((col) => (
              <div
                key={col.collection_id}
                className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen size={16} className="text-amber-500 dark:text-amber-400" />
                    <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {col.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(col.collection_id)}
                    className="p-1 rounded text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                {col.description && (
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-2 line-clamp-2">
                    {col.description}
                  </p>
                )}
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  {col.document_ids.length} document{col.document_ids.length !== 1 ? 's' : ''} · {new Date(col.updated_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">New Collection</h3>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Research Papers"
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>
              {documents.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Add documents ({selectedDocs.length} selected)
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg">
                    {documents.map((doc) => (
                      <label
                        key={doc.document_id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDocs.includes(doc.document_id)}
                          onChange={() => toggleDoc(doc.document_id)}
                          className="rounded border-zinc-300 dark:border-zinc-600 text-emerald-600 focus:ring-emerald-500"
                        />
                        <FileText size={12} className="text-zinc-400" />
                        <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate">{doc.filename}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-zinc-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={!!deleteTarget}
        title="Delete collection"
        description="This will permanently remove the collection. Documents will not be deleted."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  )
}
