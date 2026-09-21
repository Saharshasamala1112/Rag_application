import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChatStore } from '../../store/chat.store'

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
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [navigate, createSession, setActiveSession])
}
