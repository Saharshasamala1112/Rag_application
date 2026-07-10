import api from '../lib/axios'
import type { DocumentSummary, UploadDocumentResponse } from '../types/document'

export const uploadDocument = async (file: File): Promise<UploadDocumentResponse> => {
  const formData = new FormData()
  formData.append('file', file)

  const res = await api.post<UploadDocumentResponse>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return res.data
}

export type { DocumentSummary }

