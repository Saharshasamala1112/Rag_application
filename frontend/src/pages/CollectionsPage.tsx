import { FolderOpen, Plus } from 'lucide-react'

export function CollectionsPage() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-6 h-14 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Collections</h1>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Group related documents</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
        >
          <Plus size={13} />
          New Collection
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 mx-auto">
            <FolderOpen size={24} className="text-zinc-300 dark:text-zinc-600" />
          </div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">No collections yet</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Create a collection to organize related documents
          </p>
        </div>
      </div>
    </div>
  )
}
