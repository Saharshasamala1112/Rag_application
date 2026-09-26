import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryDocumentsStream } from '../services/query.service'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('queryDocumentsStream', () => {
  function stubEventStream(...chunks: string[]) {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder()
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
        controller.close()
      },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 200 })))
  }

  it('combines the caller AbortSignal with a request timeout', async () => {
    const controller = new AbortController()
    let requestSignal: AbortSignal | null | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        requestSignal = init?.signal
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('The operation was aborted.', 'AbortError')),
            { once: true },
          )
        })
      }),
    )

    const stream = queryDocumentsStream(
      { question: 'cancel this query' },
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      controller.signal,
      1000,
    )
    controller.abort()

    await expect(stream).rejects.toMatchObject({ name: 'AbortError' })
    expect(requestSignal).not.toBe(controller.signal)
    expect(requestSignal?.aborted).toBe(true)
  })

  it('aborts a stalled stream when its per-request deadline expires', async () => {
    let requestSignal: AbortSignal | null | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        requestSignal = init?.signal
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('The operation was aborted.', 'AbortError')),
            { once: true },
          )
        })
      }),
    )

    const stream = queryDocumentsStream(
      { question: 'deadline test' },
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      undefined,
      10,
    )

    await expect(stream).rejects.toMatchObject({ name: 'AbortError' })
    expect(requestSignal?.aborted).toBe(true)
  })

  it('parses events split across reads and skips malformed JSON', async () => {
    stubEventStream(
      'data: {"type":"token","content":"hel',
      'lo"}\n\ndata: {malformed}\n\n',
      'data: {"type":"done","content":"","total_time_ms":5}\n\n',
    )
    const onToken = vi.fn()
    const onDone = vi.fn()
    const onError = vi.fn()

    await queryDocumentsStream(
      { question: 'split event' },
      onToken,
      vi.fn(),
      vi.fn(),
      vi.fn(),
      onDone,
      onError,
    )

    expect(onToken).toHaveBeenCalledOnce()
    expect(onToken).toHaveBeenCalledWith('hello')
    expect(onDone).toHaveBeenCalledWith(5)
    expect(onError).not.toHaveBeenCalled()
  })

  it('surfaces terminal error events without reporting success', async () => {
    stubEventStream('data: {"type":"error","content":"model unavailable"}\n\n')
    const onDone = vi.fn()
    const onError = vi.fn()

    await queryDocumentsStream(
      { question: 'failed event' },
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      onDone,
      onError,
    )

    expect(onError).toHaveBeenCalledWith('model unavailable')
    expect(onDone).not.toHaveBeenCalled()
  })

  it('reports EOF before the terminal done event as an incomplete stream', async () => {
    stubEventStream('data: {"type":"token","content":"partial"}\n\n')
    const onDone = vi.fn()
    const onError = vi.fn()

    await queryDocumentsStream(
      { question: 'truncated stream' },
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      onDone,
      onError,
    )

    expect(onDone).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith('The response stream ended before completion.')
  })
})
