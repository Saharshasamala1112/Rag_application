export type DocumentSummary = {
  fileName: string
  textPreview: string
  fileSize?: number
  fileType?: string
  uploadedAt?: string
}

export type UploadDocumentResponse = {
  document: DocumentSummary
}

