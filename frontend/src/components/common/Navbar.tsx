import { Link } from 'react-router-dom'

export const Navbar = () => {
  return (
    <nav className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
      <Link to="/" className="text-lg font-semibold text-slate-900">
        Local-first RAG
      </Link>
      <div className="flex gap-4 text-sm text-slate-600">
        <Link to="/upload" className="hover:text-slate-900">
          Upload
        </Link>
        <Link to="/chat" className="hover:text-slate-900">
          Chat
        </Link>
      </div>
    </nav>
  )
}
