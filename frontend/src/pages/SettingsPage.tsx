import { useEffect, useState } from 'react'
import { Settings, Cpu, FileText, CheckCircle2, XCircle } from 'lucide-react'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import axiosInstance, { ApiError } from '../lib/axios'

interface HealthData {
  status: string
  model: string
  embedding_model: string
  ollama_available: boolean
  document_count: number
}

function isHealthData(value: unknown): value is HealthData {
  if (!value || typeof value !== 'object') return false
  const data = value as Partial<HealthData>
  return (
    typeof data.status === 'string'
    && typeof data.model === 'string'
    && typeof data.embedding_model === 'string'
    && typeof data.ollama_available === 'boolean'
    && typeof data.document_count === 'number'
  )
}

type SupportedType = {
  extension: string
  description: string
}

export function SettingsPage() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [supportedTypes, setSupportedTypes] = useState<SupportedType[] | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const [healthResult, typesResult] = await Promise.allSettled([
        axiosInstance.get<HealthData>('/health'),
        axiosInstance.get<{ types: SupportedType[] }>('/upload/supported-types'),
      ])
      if (cancelled) return

      if (healthResult.status === 'fulfilled') {
        if (isHealthData(healthResult.value.data)) setHealth(healthResult.value.data)
      } else {
        const error: unknown = healthResult.reason
        if (error instanceof ApiError) {
          const data = error.responseData
          const detail =
            data && typeof data === 'object' && 'detail' in data
              ? data.detail
              : undefined
          if (isHealthData(detail)) setHealth(detail)
        }
      }
      if (
        typesResult.status === 'fulfilled'
        && typesResult.value.data.types.every(
          (item) =>
            typeof item.extension === 'string'
            && typeof item.description === 'string',
        )
      ) {
        setSupportedTypes(typesResult.value.data.types)
      }
      setHealthLoading(false)
    }
    void load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 h-12 border-b border-edge dark:border-edge-dark shrink-0 flex items-center">
        <h1 className="text-sm font-semibold text-fg dark:text-fg-dark">Settings</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
          {/* Appearance */}
          <section>
            <h2 className="text-2xs font-semibold text-fg-tertiary dark:text-fg-dark-tertiary uppercase tracking-wider mb-3">
              Appearance
            </h2>
            <div className="rounded-xl border border-edge dark:border-edge-dark bg-surface dark:bg-surface-dark p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-fg dark:text-fg-dark">Theme</p>
                  <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">Choose light, dark, or system</p>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </section>

          {/* Model */}
          <section>
            <h2 className="text-2xs font-semibold text-fg-tertiary dark:text-fg-dark-tertiary uppercase tracking-wider mb-3">
              Model
            </h2>
            <div className="rounded-xl border border-edge dark:border-edge-dark bg-surface dark:bg-surface-dark p-4 space-y-4">
              {healthLoading ? (
                <div className="space-y-3">
                  <div className="h-4 w-48 rounded bg-surface-secondary dark:bg-surface-dark-elevated animate-pulse" />
                  <div className="h-4 w-32 rounded bg-surface-secondary dark:bg-surface-dark-elevated animate-pulse" />
                </div>
              ) : health ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu size={14} className="text-fg-tertiary dark:text-fg-dark-tertiary" />
                      <div>
                        <p className="text-xs font-medium text-fg dark:text-fg-dark">{health.model}</p>
                        <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">LLM model</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {health.ollama_available ? (
                        <CheckCircle2 size={12} className="text-success dark:text-success-dark" />
                      ) : (
                        <XCircle size={12} className="text-danger dark:text-danger-dark" />
                      )}
                      <span className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
                        {health.ollama_available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-fg dark:text-fg-dark">{health.embedding_model}</p>
                      <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">Embedding model (384d)</p>
                    </div>
                    <span className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">Active</span>
                  </div>
                  <div className="pt-2 border-t border-edge/50 dark:border-edge-dark/50">
                    <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
                      {health.document_count} document{health.document_count !== 1 ? 's' : ''} indexed
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-fg-tertiary dark:text-fg-dark-tertiary">Unable to load model info</p>
              )}
            </div>
          </section>

          {/* Supported File Types */}
          {supportedTypes && (
            <section>
              <h2 className="text-2xs font-semibold text-fg-tertiary dark:text-fg-dark-tertiary uppercase tracking-wider mb-3">
                Supported File Types
              </h2>
              <div className="rounded-xl border border-edge dark:border-edge-dark bg-surface dark:bg-surface-dark p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {supportedTypes.map(({ extension, description }) => (
                    <div key={extension} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-surface-secondary dark:bg-surface-dark-elevated">
                      <FileText size={11} className="text-fg-tertiary dark:text-fg-dark-tertiary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-2xs font-medium text-fg-secondary dark:text-fg-dark-secondary uppercase">
                          {extension}
                        </p>
                        <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary truncate">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* About */}
          <section>
            <h2 className="text-2xs font-semibold text-fg-tertiary dark:text-fg-dark-tertiary uppercase tracking-wider mb-3">
              About
            </h2>
            <div className="rounded-xl border border-edge dark:border-edge-dark bg-surface dark:bg-surface-dark p-4">
              <div className="flex items-center gap-3 mb-2">
                <Settings size={16} className="text-fg-tertiary dark:text-fg-dark-tertiary" />
                <p className="text-xs font-medium text-fg dark:text-fg-dark">RAG Workspace</p>
              </div>
              <p className="text-2xs text-fg-tertiary dark:text-fg-dark-tertiary">
                Local-first RAG document chat · v3.1.0
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
