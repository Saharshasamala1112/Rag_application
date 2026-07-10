import { Link } from 'react-router-dom'

export const NotFound = () => {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-3 text-slate-600">The page you requested does not exist.</p>
      <Link to="/" className="mt-6 inline-block text-sm font-semibold text-slate-900">
        Return home
      </Link>
    </div>
  )
}
