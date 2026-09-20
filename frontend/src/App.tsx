import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Outlet } from 'react-router-dom'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-900">
          <div className="max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40">
              <svg className="h-5 w-5 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="mb-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Something went wrong</h2>
            <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-zinc-900 dark:bg-zinc-200 px-4 py-2 text-xs font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-300 transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <div className="h-screen bg-white dark:bg-zinc-900">
        <Outlet />
      </div>
    </ErrorBoundary>
  )
}
