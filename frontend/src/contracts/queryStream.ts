import contract from '../../../contracts/query_stream.json'

const events = contract.events
if (
  events.status !== 'status' ||
  events.trace !== 'trace' ||
  events.sources !== 'sources' ||
  events.token !== 'token' ||
  events.error !== 'error' ||
  events.done !== 'done'
) {
  throw new Error('Invalid query stream event contract.')
}

export const QUERY_STREAM_EVENTS = events
export const QUERY_STREAM_STATUSES = contract.statuses
export const QUERY_STREAM_TRACE_STEPS = contract.trace_steps

export const QUERY_STREAM_STATUS_TO_STAGE: Record<string, string> = Object.fromEntries(
  Object.values(QUERY_STREAM_STATUSES).map(({ text, stage }) => [text, stage]),
)
