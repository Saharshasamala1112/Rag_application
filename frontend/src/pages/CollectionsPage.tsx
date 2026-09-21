import { useEffect, useState, useCallback } from 'react'
import { FolderOpen, Plus, Trash2, FileText, Check, X } from 'lucide-react'
import { useDocumentStore } from '../store/document.store'
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog'
import * as collectionService from '../services/collection.service'
import type { Collection } from '../services/collection.service'
import { toast } from 'sonner'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { cn } from '../lib/utils'

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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editField, setEditField] = useState<'name' | 'description'>('name')
  const [editValue, setEditValue] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

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

  const handleBulkDelete = async () => {
    setBulkDeleting(true)
    try {
      for (const id of selectedIds) {
        await collectionService.deleteCollection(id)
      }
      setCollections((prev) => prev.filter((c) => !selectedIds.includes(c.collection_id)))
      setSelectedIds([])
      setBulkDeleteOpen(false)
      toast.success(`Deleted ${selectedIds.length} collection${selectedIds.length !== 1 ? 's' : ''}`)
    } catch {
      toast.error('Failed to delete some collections')
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleRename = async (colId: string) => {
    if (!editValue.trim()) {
      setEditingId(null)
      return
    }
    try {
      const field = editField === 'name' ? { name: editValue.trim() } : { description: editValue.trim() }
      await collectionService.updateCollection(colId, field)
      setCollections((prev) =>
        prev.map((c) =>
          c.collection_id === colId ? { ...c, ...field, updated_at: new Date().toISOString() } : c,
        ),
      )
      toast.success(editField === 'name' ? 'Collection renamed' : 'Description updated')
    } catch {
      toast.error('Failed to update collection')
    } finally {
      setEditingId(null)
    }
  }

  const handleAddDocumentToCollection = useCallback(async (colId: string, docId: string) => {
    setCollections((prev) => {
      const col = prev.find((c) => c.collection_id === colId)
      if (!col || col.document_ids.includes(docId)) return prev
      const updatedIds = [...col.document_ids, docId]
      collectionService.updateCollection(colId, { document_ids: updatedIds }).then((updated) => {
        setCollections((p) => p.map((c) => (c.collection_id === colId ? updated : c)))
        const doc = documents.find((d) => d.document_id === docId)
        toast.success(`Added "${doc?.filename}" to "${col.name}"`)
      }).catch(() => {
        toast.error('Failed to add document')
      })
      return prev.map((c) => (c.collection_id === colId ? { ...c, document_ids: updatedIds } : c))
    })
  }, [documents])

  const toggleDoc = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId],
    )
  }

  const toggleSelect = (colId: string) => {
    setSelectedIds((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId],
    )
  }

  const handleDragOver = useCallback((e: React.DragEvent, colId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverId(colId)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverId(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, colId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverId(null)
    const docId = e.dataTransfer.getData('text/doc-id')
    if (docId) {
      handleAddDocumentToCollection(colId, docId)
    }
  }, [handleAddDocumentToCollection])

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-6 h-12 border-b border-edge dark:border-edge-dark shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-fg dark:text-fg-dark">Collections</h1>
          <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
            {collections.length} collection{collections.length !== 1 ? 's' : ''}
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
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              <Plus size={13} />
              New Collection
            </Button>
          )}
        </div>
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
            {collections.map((col) => {
              const isSelected = selectedIds.includes(col.collection_id)
              const isEditing = editingId === col.collection_id
              const isDragOverTarget = dragOverId === col.collection_id

              return (
                <div
                  key={col.collection_id}
                  className={cn(
                    'group rounded-xl border bg-surface dark:bg-surface-dark p-4 transition-all',
                    isSelected
                      ? 'border-accent/50 dark:border-accent-dark/50 ring-1 ring-accent/20 dark:ring-accent-dark/20'
                      : isDragOverTarget
                        ? 'border-accent dark:border-accent-dark bg-accent-subtle/50 dark:bg-accent-dark-subtle/50 scale-[1.02]'
                        : 'border-edge dark:border-edge-dark hover:border-edge-strong dark:hover:border-edge-dark-strong',
                  )}
                  onDragOver={(e) => handleDragOver(e, col.collection_id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.collection_id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(col.collection_id)}
                        className="rounded border-edge dark:border-edge-dark text-accent focus:ring-accent/40 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                      <FolderOpen size={16} className="text-warning dark:text-warning-dark shrink-0" />
                      {isEditing && editField === 'name' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(col.collection_id)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            autoFocus
                            className="w-full min-w-0 px-1.5 py-0.5 text-xs font-semibold bg-surface-secondary dark:bg-surface-dark-elevated border border-accent dark:border-accent-dark rounded text-fg dark:text-fg-dark focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleRename(col.collection_id)}
                            className="p-0.5 text-success dark:text-success-dark shrink-0"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-0.5 text-fg-tertiary dark:text-fg-dark-tertiary shrink-0"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <h3
                          className="text-xs font-semibold text-fg dark:text-fg-dark truncate cursor-pointer hover:text-accent dark:hover:text-accent-dark transition-colors"
                          onClick={() => {
                            setEditingId(col.collection_id)
                            setEditField('name')
                            setEditValue(col.name)
                          }}
                          title="Click to rename"
                        >
                          {col.name}
                        </h3>
                      )}
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

                  {isEditing && editField === 'description' ? (
                    <div className="mb-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(col.collection_id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        autoFocus
                        placeholder="Add description..."
                        className="w-full px-1.5 py-0.5 text-2xs bg-surface-secondary dark:bg-surface-dark-elevated border border-accent dark:border-accent-dark rounded text-fg-secondary dark:text-fg-dark-secondary focus:outline-none"
                      />
                    </div>
                  ) : col.description ? (
                    <p
                      className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary mb-2 line-clamp-2 cursor-pointer hover:text-fg-secondary dark:hover:text-fg-dark-secondary transition-colors"
                      onClick={() => {
                        setEditingId(col.collection_id)
                        setEditField('description')
                        setEditValue(col.description)
                      }}
                      title="Click to edit description"
                    >
                      {col.description}
                    </p>
                  ) : (
                    <p
                      className="text-2xs text-fg-muted dark:text-fg-dark-tertiary mb-2 italic cursor-pointer hover:text-fg-tertiary dark:hover:text-fg-dark-tertiary transition-colors"
                      onClick={() => {
                        setEditingId(col.collection_id)
                        setEditField('description')
                        setEditValue('')
                      }}
                    >
                      + Add description
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
                      {col.document_ids.length} document{col.document_ids.length !== 1 ? 's' : ''} · {new Date(col.updated_at).toLocaleDateString()}
                    </p>
                    {isDragOverTarget && (
                      <span className="text-2xs text-accent dark:text-accent-dark font-medium animate-pulse">
                        Drop to add
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
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

      <ConfirmationDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedIds.length} collections`}
        description={`This will permanently remove ${selectedIds.length} collections. Documents will not be deleted.`}
        confirmLabel={`Delete ${selectedIds.length} collections`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
        loading={bulkDeleting}
      />
    </div>
  )
}
