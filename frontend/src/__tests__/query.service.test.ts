import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryDocumentsStream } from '../services/query.service'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('queryDocumentsStream', () => {
  it('passes the caller AbortSignal to fetch', async () => {
    const controller = new AbortController()
    let requestSignal: AbortSignal | null | undefined
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      requestSignal = init?.signal
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('The operation was aborted.', 'AbortError')),
          { once: true },
        )
      })
    }))

    const stream = queryDocumentsStream(
      { question: 'cancel this query' },
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      controller.signal,
    )
    controller.abort()

    await expect(stream).rejects.toMatchObject({ name: 'AbortError' })
    expect(requestSignal).toBe(controller.signal)
    expect(requestSignal?.aborted).toBe(true)
  })
})
