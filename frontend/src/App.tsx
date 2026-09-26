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
        <div className="flex h-screen items-center justify-center bg-app dark:bg-app-dark">
          <div className="max-w-sm rounded-xl border border-edge bg-surface p-6 text-center shadow-sm dark:border-edge-dark dark:bg-surface-dark">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-danger-subtle dark:bg-danger-dark-subtle">
              <svg
                className="h-5 w-5 text-danger dark:text-danger-dark"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <h2 className="mb-1.5 text-sm font-semibold text-fg dark:text-fg-dark">
              Something went wrong
            </h2>
            <p className="mb-4 text-xs text-fg-secondary dark:text-fg-dark-secondary">
              {this.state.error?.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-fg px-4 py-2 text-xs font-medium text-app transition-opacity hover:opacity-90 dark:bg-fg-dark dark:text-app-dark"
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
      <div className="h-screen bg-app dark:bg-app-dark">
        <Outlet />
      </div>
    </ErrorBoundary>
  )
}
