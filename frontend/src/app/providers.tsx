import type { ReactNode } from 'react'
import { Toaster } from 'sonner'

interface ProvidersProps {
  children: ReactNode
}

export const AppProviders = ({ children }: ProvidersProps) => {
  return (
    <>
      {children}
      <Toaster position="top-right" />
    </>
  )
}
