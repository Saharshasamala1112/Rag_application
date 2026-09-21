import api from '../lib/axios'
import type { UploadResponse, DocumentListResponse } from '../types/document'

export const uploadDocument = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData()
  formData.append('file', file)

  const res = await api.post<UploadResponse>('/upload', formData, {
    headers: { 'Content-Type': undefined },
    timeout: 300000,
  })

  return res.data
}

export const uploadText = async (content: string, filename: string): Promise<UploadResponse> => {
  const res = await api.post<UploadResponse>('/upload/text', { content, filename })
  return res.data
}

export const listDocuments = async (): Promise<DocumentListResponse> => {
  const res = await api.get<DocumentListResponse>('/documents')
  return res.data
}

export const deleteDocument = async (documentId: string): Promise<void> => {
  await api.delete(`/documents/${documentId}`)
}

export interface DocumentChunk {
  content: string
  chunk_id?: string
  source?: string
  page_number?: number
  header?: string
  [key: string]: unknown
}

export const getDocumentChunks = async (documentId: string): Promise<{ chunks: DocumentChunk[]; total: number }> => {
  const res = await api.get<{ chunks: DocumentChunk[]; total: number }>(`/documents/${documentId}/chunks`)
  return res.data
}
