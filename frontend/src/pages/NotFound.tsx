import { Link } from 'react-router-dom'

export const NotFound = () => {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-slate-200">404</h1>
        <p className="mt-4 text-lg text-slate-600">Page not found</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-xl bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Go to Chat
        </Link>
      </div>
    </div>
  )
}
