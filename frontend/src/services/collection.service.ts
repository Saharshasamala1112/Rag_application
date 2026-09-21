import api from '../lib/axios'

export interface Collection {
  collection_id: string
  name: string
  description: string
  document_ids: string[]
  created_at: string
  updated_at: string
}

export interface CollectionListResponse {
  collections: Collection[]
  total: number
}

export const listCollections = async (): Promise<CollectionListResponse> => {
  const res = await api.get<CollectionListResponse>('/collections')
  return res.data
}

export const createCollection = async (name: string, description?: string, documentIds?: string[]): Promise<Collection> => {
  const res = await api.post<Collection>('/collections', {
    name,
    description: description || '',
    document_ids: documentIds || [],
  })
  return res.data
}

export const updateCollection = async (id: string, data: { name?: string; description?: string; document_ids?: string[] }): Promise<Collection> => {
  const res = await api.patch<Collection>(`/collections/${id}`, data)
  return res.data
}

export const deleteCollection = async (id: string): Promise<void> => {
  await api.delete(`/collections/${id}`)
}
