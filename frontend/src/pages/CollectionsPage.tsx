import { useEffect, useState, useCallback, useRef } from 'react'
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
  const pendingMemberships = useRef(new Set<string>())

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
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const col = await collectionService.createCollection(
        newName.trim(),
        newDescription.trim(),
        selectedDocs,
      )
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
      toast.success(
        `Deleted ${selectedIds.length} collection${selectedIds.length !== 1 ? 's' : ''}`,
      )
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
      const field =
        editField === 'name' ? { name: editValue.trim() } : { description: editValue.trim() }
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

  const handleAddDocumentToCollection = useCallback(
    async (colId: string, docId: string) => {
      const collection = collections.find((item) => item.collection_id === colId)
      const membershipKey = `${colId}:${docId}`
      if (
        !collection ||
        collection.document_ids.includes(docId) ||
        pendingMemberships.current.has(membershipKey)
      )
        return

      pendingMemberships.current.add(membershipKey)
      const updatedIds = [...collection.document_ids, docId]
      try {
        const updated = await collectionService.updateCollection(colId, {
          document_ids: updatedIds,
        })
        setCollections((previous) =>
          previous.map((item) => (item.collection_id === colId ? updated : item)),
        )
        const document = documents.find((item) => item.document_id === docId)
        toast.success(`Added "${document?.filename ?? 'document'}" to "${collection.name}"`)
      } catch {
        toast.error('Failed to add document')
      } finally {
        pendingMemberships.current.delete(membershipKey)
      }
    },
    [collections, documents],
  )

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

  const handleDrop = useCallback(
    (e: React.DragEvent, colId: string) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOverId(null)
      const docId = e.dataTransfer.getData('text/doc-id')
      if (docId) {
        void handleAddDocumentToCollection(colId, docId)
      }
    },
    [handleAddDocumentToCollection],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-edge px-6 dark:border-edge-dark">
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
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              <Plus size={13} />
              New Collection
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl bg-surface-secondary dark:bg-surface-dark-elevated"
              />
            ))}
          </div>
        ) : collections.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-surface-secondary dark:bg-surface-dark-elevated">
              <FolderOpen size={24} className="text-fg-muted dark:text-fg-dark-tertiary" />
            </div>
            <p className="mb-1 text-sm font-medium text-fg-secondary dark:text-fg-dark-secondary">
              No collections yet
            </p>
            <p className="mb-4 text-xs text-fg-tertiary dark:text-fg-dark-tertiary">
              Create a collection to organize related documents
            </p>
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              <Plus size={13} />
              Create collection
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {collections.map((col) => {
              const isSelected = selectedIds.includes(col.collection_id)
              const isEditing = editingId === col.collection_id
              const isDragOverTarget = dragOverId === col.collection_id

              return (
                <div
                  key={col.collection_id}
                  role="region"
                  aria-label={`Collection ${col.name}`}
                  className={cn(
                    'group rounded-xl border bg-surface p-4 transition-all dark:bg-surface-dark',
                    isSelected
                      ? 'border-accent/50 ring-1 ring-accent/20 dark:border-accent-dark/50 dark:ring-accent-dark/20'
                      : isDragOverTarget
                        ? 'scale-[1.02] border-accent bg-accent-subtle/50 dark:border-accent-dark dark:bg-accent-dark-subtle/50'
                        : 'border-edge hover:border-edge-strong dark:border-edge-dark dark:hover:border-edge-dark-strong',
                  )}
                  onDragOver={(e) => handleDragOver(e, col.collection_id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.collection_id)}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex min-w-0 items-center gap-2">
                      <input
                        type="checkbox"
                        aria-label={`Select ${col.name}`}
                        checked={isSelected}
                        onChange={() => toggleSelect(col.collection_id)}
                        className="rounded border-edge text-accent focus:ring-accent/40 dark:border-edge-dark"
                      />
                      <FolderOpen
                        size={16}
                        className="shrink-0 text-warning dark:text-warning-dark"
                      />
                      {isEditing && editField === 'name' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void handleRename(col.collection_id)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            autoFocus
                            className="w-full min-w-0 rounded border border-accent bg-surface-secondary px-1.5 py-0.5 text-xs font-semibold text-fg focus:outline-none dark:border-accent-dark dark:bg-surface-dark-elevated dark:text-fg-dark"
                          />
                          <button
                            type="button"
                            onClick={() => void handleRename(col.collection_id)}
                            className="shrink-0 p-0.5 text-success dark:text-success-dark"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="shrink-0 p-0.5 text-fg-tertiary dark:text-fg-dark-tertiary"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="truncate text-left text-xs font-semibold text-fg transition-colors hover:text-accent dark:text-fg-dark dark:hover:text-accent-dark"
                          aria-label={`Rename ${col.name}`}
                          onClick={() => {
                            setEditingId(col.collection_id)
                            setEditField('name')
                            setEditValue(col.name)
                          }}
                          title="Click to rename"
                        >
                          {col.name}
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(col.collection_id)}
                      className="rounded p-1 text-fg-muted hover:text-danger dark:text-fg-dark-tertiary dark:hover:text-danger-dark"
                      title="Delete"
                      aria-label={`Delete ${col.name}`}
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
                          if (e.key === 'Enter') void handleRename(col.collection_id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        autoFocus
                        placeholder="Add description..."
                        className="w-full rounded border border-accent bg-surface-secondary px-1.5 py-0.5 text-2xs text-fg-secondary focus:outline-none dark:border-accent-dark dark:bg-surface-dark-elevated dark:text-fg-dark-secondary"
                      />
                    </div>
                  ) : col.description ? (
                    <button
                      type="button"
                      className="mb-2 line-clamp-2 block w-full text-left text-2xs text-fg-tertiary transition-colors hover:text-fg-secondary dark:text-fg-dark-tertiary dark:hover:text-fg-dark-secondary"
                      onClick={() => {
                        setEditingId(col.collection_id)
                        setEditField('description')
                        setEditValue(col.description)
                      }}
                      title="Click to edit description"
                    >
                      {col.description}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="mb-2 block w-full text-left text-2xs italic text-fg-muted transition-colors hover:text-fg-tertiary dark:text-fg-dark-tertiary dark:hover:text-fg-dark-tertiary"
                      onClick={() => {
                        setEditingId(col.collection_id)
                        setEditField('description')
                        setEditValue('')
                      }}
                    >
                      + Add description
                    </button>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
                      {col.document_ids.length} document{col.document_ids.length !== 1 ? 's' : ''} ·{' '}
                      {new Date(col.updated_at).toLocaleDateString()}
                    </p>
                    {isDragOverTarget && (
                      <span className="animate-pulse text-2xs font-medium text-accent dark:text-accent-dark">
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
            <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleCreate()}
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
            <label className="mb-1 block text-xs font-medium text-fg-secondary dark:text-fg-dark-secondary">
              Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Research Papers"
              className="w-full rounded-lg border border-edge bg-surface-secondary px-3 py-2 text-xs text-fg placeholder-fg-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40 dark:border-edge-dark dark:bg-surface-dark-elevated dark:text-fg-dark"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-secondary dark:text-fg-dark-secondary">
              Description
            </label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full rounded-lg border border-edge bg-surface-secondary px-3 py-2 text-xs text-fg placeholder-fg-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40 dark:border-edge-dark dark:bg-surface-dark-elevated dark:text-fg-dark"
            />
          </div>
          {documents.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-secondary dark:text-fg-dark-secondary">
                Add documents ({selectedDocs.length} selected)
              </label>
              <div className="max-h-32 overflow-y-auto rounded-lg border border-edge dark:border-edge-dark">
                {documents.map((doc) => (
                  <label
                    key={doc.document_id}
                    className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-surface-secondary dark:hover:bg-surface-dark-elevated"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocs.includes(doc.document_id)}
                      onChange={() => toggleDoc(doc.document_id)}
                      className="rounded border-edge text-accent focus:ring-accent/40 dark:border-edge-dark"
                    />
                    <FileText size={12} className="text-fg-tertiary dark:text-fg-dark-tertiary" />
                    <span className="truncate text-xs text-fg-secondary dark:text-fg-dark-secondary">
                      {doc.filename}
                    </span>
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
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <ConfirmationDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedIds.length} collections`}
        description={`This will permanently remove ${selectedIds.length} collections. Documents will not be deleted.`}
        confirmLabel={`Delete ${selectedIds.length} collections`}
        onConfirm={() => void handleBulkDelete()}
        onCancel={() => setBulkDeleteOpen(false)}
        loading={bulkDeleting}
      />
    </div>
  )
}
