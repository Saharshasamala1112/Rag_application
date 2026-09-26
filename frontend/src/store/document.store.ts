import { create } from 'zustand'
import type { DocumentInfo } from '../types/document'

type DocumentState = {
  documents: DocumentInfo[]
  activeDocumentId: string | null
  setDocuments: (documents: DocumentInfo[]) => void
  addDocument: (document: DocumentInfo) => void
  removeDocument: (documentId: string) => void
  setActiveDocument: (documentId: string | null) => void
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  activeDocumentId: null,
  setDocuments: (documents) => set({ documents }),
  addDocument: (document) => set((state) => ({ documents: [document, ...state.documents] })),
  removeDocument: (documentId) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.document_id !== documentId),
      activeDocumentId: state.activeDocumentId === documentId ? null : state.activeDocumentId,
    })),
  setActiveDocument: (documentId) => set({ activeDocumentId: documentId }),
}))
