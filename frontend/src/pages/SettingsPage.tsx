import { useEffect, useState } from 'react'
import { Settings, Cpu, FileText, CheckCircle2, XCircle } from 'lucide-react'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import axiosInstance from '../lib/axios'

interface HealthData {
  status: string
  model: string
  embedding_model: string
  ollama_status: string
  document_count: number
}

export function SettingsPage() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [supportedTypes, setSupportedTypes] = useState<Record<string, string> | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [healthRes, typesRes] = await Promise.all([
          axiosInstance.get('/health'),
          axiosInstance.get('/upload/supported-types'),
        ])
        if (!cancelled) {
          setHealth(healthRes.data)
          setSupportedTypes(typesRes.data.supported_types)
        }
      } catch {
        // handled by interceptor
      } finally {
        if (!cancelled) setHealthLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 h-14 border-b border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center">
        <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Settings</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
          {/* Appearance */}
          <section>
            <h2 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
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
            <h2 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
              Model
            </h2>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
              {healthLoading ? (
                <div className="space-y-3">
                  <div className="h-4 w-48 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                  <div className="h-4 w-32 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                </div>
              ) : health ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu size={14} className="text-zinc-400" />
                      <div>
                        <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{health.model}</p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">LLM model</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {health.ollama_status === 'available' ? (
                        <CheckCircle2 size={12} className="text-emerald-500" />
                      ) : (
                        <XCircle size={12} className="text-red-500" />
                      )}
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {health.ollama_status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{health.embedding_model}</p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Embedding model (384d)</p>
                    </div>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Active</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      {health.document_count} document{health.document_count !== 1 ? 's' : ''} indexed
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Unable to load model info</p>
              )}
            </div>
          </section>

          {/* Supported File Types */}
          {supportedTypes && (
            <section>
              <h2 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
                Supported File Types
              </h2>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(supportedTypes).map(([ext, desc]) => (
                    <div key={ext} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-zinc-50 dark:bg-zinc-800/50">
                      <FileText size={11} className="text-zinc-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300 uppercase">
                          {ext}
                        </p>
                        <p className="text-[9px] text-zinc-400 dark:text-zinc-500 truncate">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* About */}
          <section>
            <h2 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
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
