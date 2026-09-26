import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsPage } from '../pages/SettingsPage'
import { ApiError } from '../lib/axios'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))
vi.mock('../lib/axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/axios')>()
  return { ...actual, default: { get: getMock } }
})

vi.mock('../components/ui/ThemeToggle', () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}))

describe('SettingsPage API contract', () => {
  beforeEach(() => {
    getMock.mockReset()
    getMock.mockImplementation((url: string) => {
      if (url === '/health') {
        return Promise.resolve({
          data: {
            status: 'healthy',
            model: 'llama3.2',
            embedding_model: 'bge-small',
            ollama_available: true,
            document_count: 2,
          },
        })
      }
      return Promise.resolve({
        data: {
          types: [{ extension: '.pdf', description: 'PDF document' }],
          total: 1,
        },
      })
    })
  })

  it('renders API health and supported types using the backend response schema', async () => {
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Available')).toBeInTheDocument()
      expect(screen.getByText('.pdf')).toBeInTheDocument()
      expect(screen.getByText('PDF document')).toBeInTheDocument()
      expect(screen.getByText('2 documents indexed')).toBeInTheDocument()
    })
  })

  it('renders health details returned with a degraded 503 response', async () => {
    getMock.mockImplementation((url: string) => {
      if (url === '/health') {
        return Promise.reject(new ApiError('Service unavailable', 503, {
          detail: {
            status: 'degraded',
            model: 'llama3.2',
            embedding_model: 'bge-small',
            ollama_available: false,
            document_count: 2,
          },
        }))
      }
      return Promise.resolve({ data: { types: [], total: 0 } })
    })

    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Unavailable')).toBeInTheDocument()
      expect(screen.getByText('2 documents indexed')).toBeInTheDocument()
    })
  })
})
