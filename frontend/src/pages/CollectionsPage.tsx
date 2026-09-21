import { useEffect, useState } from 'react'
import { FolderOpen, Plus, Trash2, FileText } from 'lucide-react'
import { useDocumentStore } from '../store/document.store'
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog'
import * as collectionService from '../services/collection.service'
import type { Collection } from '../services/collection.service'
import { toast } from 'sonner'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'

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
      <div className="flex items-center justify-between px-6 h-12 border-b border-edge dark:border-edge-dark shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-fg dark:text-fg-dark">Collections</h1>
          <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
            {collections.length} collection{collections.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
          <Plus size={13} />
          New Collection
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-surface-secondary dark:bg-surface-dark-elevated animate-pulse" />
            ))}
          </div>
        ) : collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-surface-secondary dark:bg-surface-dark-elevated mx-auto">
              <FolderOpen size={24} className="text-fg-muted dark:text-fg-dark-tertiary" />
            </div>
            <p className="text-sm font-medium text-fg-secondary dark:text-fg-dark-secondary mb-1">No collections yet</p>
            <p className="text-xs text-fg-tertiary dark:text-fg-dark-tertiary mb-4">
              Create a collection to organize related documents
            </p>
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              <Plus size={13} />
              Create collection
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {collections.map((col) => (
              <div
                key={col.collection_id}
                className="group rounded-xl border border-edge dark:border-edge-dark bg-surface dark:bg-surface-dark p-4 hover:border-edge-strong dark:hover:border-edge-dark-strong transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen size={16} className="text-warning dark:text-warning-dark" />
                    <h3 className="text-xs font-semibold text-fg dark:text-fg-dark truncate">
                      {col.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(col.collection_id)}
                    className="p-1 rounded text-fg-muted hover:text-danger dark:text-fg-dark-tertiary dark:hover:text-danger-dark opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                {col.description && (
                  <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary mb-2 line-clamp-2">
                    {col.description}
                  </p>
                )}
                <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
                  {col.document_ids.length} document{col.document_ids.length !== 1 ? 's' : ''} · {new Date(col.updated_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Collection"
        size="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
              loading={creating}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-fg-secondary dark:text-fg-dark-secondary mb-1">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Research Papers"
              className="w-full px-3 py-2 text-xs bg-surface-secondary dark:bg-surface-dark-elevated border border-edge dark:border-edge-dark rounded-lg text-fg dark:text-fg-dark placeholder-fg-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-secondary dark:text-fg-dark-secondary mb-1">Description</label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-2 text-xs bg-surface-secondary dark:bg-surface-dark-elevated border border-edge dark:border-edge-dark rounded-lg text-fg dark:text-fg-dark placeholder-fg-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          {documents.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-fg-secondary dark:text-fg-dark-secondary mb-1">
                Add documents ({selectedDocs.length} selected)
              </label>
              <div className="max-h-32 overflow-y-auto border border-edge dark:border-edge-dark rounded-lg">
                {documents.map((doc) => (
                  <label
                    key={doc.document_id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-surface-secondary dark:hover:bg-surface-dark-elevated cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocs.includes(doc.document_id)}
                      onChange={() => toggleDoc(doc.document_id)}
                      className="rounded border-edge dark:border-edge-dark text-accent focus:ring-accent/40"
                    />
                    <FileText size={12} className="text-fg-tertiary dark:text-fg-dark-tertiary" />
                    <span className="text-xs text-fg-secondary dark:text-fg-dark-secondary truncate">{doc.filename}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

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
