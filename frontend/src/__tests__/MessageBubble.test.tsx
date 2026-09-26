import { memo } from 'react'
import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ChatMessage } from '../types/chat'

const { markdownRender } = vi.hoisted(() => ({
  markdownRender: vi.fn(),
}))

vi.mock('react-markdown', () => ({
  default: memo(
    ({
      children,
      components,
    }: {
      children: string
      components?: { p?: (props: { children: string }) => ReactNode }
    }) => {
      markdownRender()
      const Paragraph = components?.p
      return Paragraph ? <Paragraph>{children}</Paragraph> : <div>{children}</div>
    },
  ),
}))

import { MessageBubble } from '../components/chat/MessageBubble'

function assistantMessage(id: string, content: string): ChatMessage {
  return {
    id,
    role: 'assistant',
    content,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('MessageBubble render performance', () => {
  it('does not re-parse unchanged messages while one streamed message updates', () => {
    const messages = Array.from({ length: 30 }, (_, index) =>
      assistantMessage(`message-${index}`, `message content ${index}`),
    )
    const { rerender } = render(
      <>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </>,
    )
    expect(markdownRender).toHaveBeenCalledTimes(30)

    const updatedMessages = messages.map((message, index) =>
      index === messages.length - 1 ? { ...message, content: `${message.content} token` } : message,
    )
    rerender(
      <>
        {updatedMessages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </>,
    )

    expect(markdownRender).toHaveBeenCalledTimes(31)
  })

  it('opens and highlights the source referenced by an inline citation', () => {
    const source = {
      chunk_id: 7,
      content: 'Evidence from the source document.',
      source: 'manual.pdf',
      score: 0.9,
    }
    const message = {
      ...assistantMessage('answer-1', 'This claim is supported [Source 1].'),
      sources: [source],
    }
    const onSelectSource = vi.fn()

    render(<MessageBubble message={message} onSelectSource={onSelectSource} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open source 1: manual.pdf' }))

    expect(onSelectSource).toHaveBeenCalledWith(source, 'answer-1')
    expect(document.getElementById('source-answer-1-0')).toHaveAttribute('aria-current', 'location')
  })

  it('uses structured error state rather than sniffing answer text', () => {
    const { rerender } = render(
      <MessageBubble
        message={assistantMessage('answer-2', 'Error: that is the correct result.')}
      />,
    )

    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('Error: that is the correct result.')).toBeTruthy()

    rerender(
      <MessageBubble
        message={{
          ...assistantMessage('answer-2', 'The service timed out.'),
          error: true,
        }}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })

  it('labels a stopped answer and offers a retry for it', () => {
    const onRetry = vi.fn()
    render(
      <MessageBubble
        message={{
          ...assistantMessage('answer-4', 'Partial answer.'),
          interrupted: true,
        }}
        onRetry={onRetry}
      />,
    )

    expect(screen.getByText('Stopped')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledWith('answer-4')
  })

  it('offers regeneration for a completed assistant answer', () => {
    const onRegenerate = vi.fn()
    render(
      <MessageBubble
        message={assistantMessage('answer-3', 'Completed answer.')}
        onRegenerate={onRegenerate}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }))
    expect(onRegenerate).toHaveBeenCalledWith('answer-3')
  })
})
