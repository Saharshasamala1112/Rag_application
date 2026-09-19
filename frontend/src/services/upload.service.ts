import api from '../lib/axios'
import type { UploadResponse, DocumentListResponse, DocumentInfo } from '../types/document'

export const uploadDocument = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData()
  formData.append('file', file)

  const res = await api.post<UploadResponse>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,
  })

  return res.data
}

export const listDocuments = async (): Promise<DocumentListResponse> => {
  const res = await api.get<DocumentListResponse>('/documents')
  return res.data
}

export const getDocument = async (documentId: string): Promise<DocumentInfo> => {
  const res = await api.get<DocumentInfo>(`/documents/${documentId}`)
  return res.data
}

export const deleteDocument = async (documentId: string): Promise<void> => {
  await api.delete(`/documents/${documentId}`)
}
