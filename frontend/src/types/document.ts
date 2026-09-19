export type DocumentInfo = {
  document_id: string
  filename: string
  file_type: string
  chunk_count: number
  total_chars: number
  file_size: number
  uploaded_at: string
}

export type DocumentListResponse = {
  documents: DocumentInfo[]
  total: number
}

export type UploadResponse = {
  message: string
  document_id: string
  filename: string
  chunk_count: number
}
