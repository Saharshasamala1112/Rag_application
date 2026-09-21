import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChatStore } from '../../store/chat.store'

let helpOpenSetter: ((v: boolean) => void) | null = null

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const createSession = useChatStore((s) => s.createSession)
  const setActiveSession = useChatStore((s) => s.setActiveSession)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey

      // Ctrl+K → Search
      if (mod && e.key === 'k') {
        e.preventDefault()
        navigate('/search')
      }

      // Ctrl+N → New chat
      if (mod && e.key === 'n') {
        e.preventDefault()
        const id = createSession()
        setActiveSession(id)
        navigate('/')
      }

      // Ctrl+/ → Keyboard shortcuts help
      if (mod && e.key === '/') {
        e.preventDefault()
        helpOpenSetter?.(true)
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [navigate, createSession, setActiveSession])
}

export function useHelpDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    helpOpenSetter = setOpen
    return () => { helpOpenSetter = null }
  }, [])

  return { open, setOpen }
}
