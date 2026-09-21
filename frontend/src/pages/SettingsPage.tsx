import { Settings } from 'lucide-react'
import { ThemeToggle } from '../components/ui/ThemeToggle'

export function SettingsPage() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 h-14 border-b border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center">
        <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Settings</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
          {/* Appearance */}
          <section>
            <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
              Appearance
            </h2>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Theme</p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Choose light, dark, or system</p>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </section>

          {/* Model */}
          <section>
            <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
              Model
            </h2>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">LLM</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Configure via OLLAMA_MODEL env var</p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Embeddings</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">BAAI/bge-small-en-v1.5 (384 dimensions)</p>
              </div>
            </div>
          </section>

          {/* About */}
          <section>
            <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
              About
            </h2>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <div className="flex items-center gap-3 mb-2">
                <Settings size={16} className="text-zinc-400" />
                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">DocuChat</p>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                Local-first RAG document chat · v3.1.0
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
