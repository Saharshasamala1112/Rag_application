import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  title?: string
  description?: string
}

export const Card = ({ children, title, description }: CardProps) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {title ? <h2 className="mb-2 text-lg font-semibold text-slate-900">{title}</h2> : null}
      {description ? <p className="mb-4 text-sm text-slate-600">{description}</p> : null}
      {children}
    </div>
  )
}
