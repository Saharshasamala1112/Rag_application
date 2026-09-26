import type { components } from './api.generated'

export type ApiHealthData = components['schemas']['HealthResponse']
export type ApiQueryResponse = components['schemas']['QueryResponse']
export type ApiSourceChunk = components['schemas']['SourceChunk']
export type ApiSupportedTypesResponse = components['schemas']['SupportedTypesResponse']

type GeneratedQueryRequest = components['schemas']['QueryRequest']
export type ApiQueryRequest = Omit<GeneratedQueryRequest, 'top_k' | 'use_reranking'> &
  Partial<Pick<GeneratedQueryRequest, 'top_k' | 'use_reranking'>>
