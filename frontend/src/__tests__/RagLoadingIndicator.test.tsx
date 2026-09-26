import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QUERY_STREAM_STATUSES } from '../contracts/queryStream'
import { RagLoadingIndicator } from '../components/chat/RagLoadingIndicator'

const STAGE_LABELS: Record<string, string> = {
  retrieval: 'Searching knowledge base',
  reranking: 'Ranking relevant sources',
  context: 'Assembling context',
  generation: 'Generating answer',
}

afterEach(cleanup)

describe('RagLoadingIndicator backend status contract', () => {
  it.each(Object.values(QUERY_STREAM_STATUSES))(
    'activates the $stage stage for "$text"',
    ({ stage, text }) => {
      const { container } = render(<RagLoadingIndicator status={text} traceSteps={[]} />)

      expect(container.querySelector('[aria-current="step"]')?.textContent).toBe(
        STAGE_LABELS[stage],
      )
    },
  )

  it('warns rather than silently mapping unknown statuses', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(<RagLoadingIndicator status="Unexpected stage" traceSteps={[]} />)

    expect(warn).toHaveBeenCalledWith('Unknown RAG status: Unexpected stage')
    expect(container.querySelector('[aria-current="step"]')).toBeNull()
    warn.mockRestore()
  })
})
