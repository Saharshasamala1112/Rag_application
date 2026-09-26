import { memo } from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ChatMessage } from '../types/chat'

const { markdownRender } = vi.hoisted(() => ({
  markdownRender: vi.fn(),
}))

vi.mock('react-markdown', () => ({
  default: memo(({ children }: { children: string }) => {
    markdownRender()
    return <div>{children}</div>
  }),
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
      index === messages.length - 1
        ? { ...message, content: `${message.content} token` }
        : message,
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
})
