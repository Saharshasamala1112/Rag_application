import { Outlet } from 'react-router-dom'
import { Navbar } from './components/common/Navbar'

export function App() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <Navbar />
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
