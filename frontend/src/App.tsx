import { Outlet } from 'react-router-dom'

export function App() {
  return (
    <div className="min-h-screen bg-slate-50 p-2 text-slate-900">
      <div className="mx-auto h-[calc(100vh-1rem)]">
        <Outlet />
      </div>
    </div>
  )
}
