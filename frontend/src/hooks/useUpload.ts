import { useState, useCallback } from 'react'
import { uploadDocument, uploadText, listDocuments } from '../services/upload.service'
import { useDocumentStore } from '../store/document.store'
import type { DocumentInfo } from '../types/document'
import { toast } from 'sonner'

export interface UploadProgress {
  fileName: string
  progress: 'pending' | 'uploading' | 'done' | 'error'
}

export const useUpload = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([])
  const addDocument = useDocumentStore((state) => state.addDocument)
  const setDocuments = useDocumentStore((state) => state.setDocuments)

  const upload = async (file: File) => {
    setLoading(true)
    setError(null)

    try {
      const response = await uploadDocument(file)
      const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '.bin'
      const docInfo: DocumentInfo = {
        document_id: response.document_id,
        filename: response.filename,
        file_type: ext,
        chunk_count: response.chunk_count,
        total_chars: 0,
        file_size: file.size,
        uploaded_at: new Date().toISOString(),
      }

      addDocument(docInfo)
      return docInfo
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }

  const uploadBatch = async (files: File[]) => {
    if (files.length === 0) return

    const queue: UploadProgress[] = files.map((f) => ({
      fileName: f.name,
      progress: 'pending' as const,
    }))
    setUploadQueue(queue)
    setLoading(true)

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setUploadQueue((prev) =>
        prev.map((item, idx) =>
          idx === i ? { ...item, progress: 'uploading' as const } : item,
        ),
      )

      try {
        const response = await uploadDocument(file)
        const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '.bin'
        const docInfo: DocumentInfo = {
          document_id: response.document_id,
          filename: response.filename,
          file_type: ext,
          chunk_count: response.chunk_count,
          total_chars: 0,
          file_size: file.size,
          uploaded_at: new Date().toISOString(),
        }
        addDocument(docInfo)
        successCount++
        setUploadQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, progress: 'done' as const } : item,
          ),
        )
      } catch {
        errorCount++
        setUploadQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, progress: 'error' as const } : item,
          ),
        )
      }
    }

    setLoading(false)
    if (successCount > 0) {
      toast.success(`Uploaded ${successCount} file${successCount !== 1 ? 's' : ''}`)
    }
    if (errorCount > 0) {
      toast.error(`Failed to upload ${errorCount} file${errorCount !== 1 ? 's' : ''}`)
    }

    setTimeout(() => setUploadQueue([]), 3000)
  }

  const uploadTextContent = async (content: string, filename: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await uploadText(content, filename)
      const docInfo: DocumentInfo = {
        document_id: response.document_id,
        filename: response.filename,
        file_type: '.txt',
        chunk_count: response.chunk_count,
        total_chars: content.length,
        file_size: new Blob([content]).size,
        uploaded_at: new Date().toISOString(),
      }

      addDocument(docInfo)
      return docInfo
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await listDocuments()
      setDocuments(response.documents)
    } catch (err) {
      console.error('Failed to fetch documents:', err)
    }
  }, [setDocuments])

  return { upload, uploadBatch, uploadTextContent, loading, error, uploadQueue, fetchDocuments }
}
