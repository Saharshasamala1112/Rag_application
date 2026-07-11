import { create } from 'zustand'
import type { DocumentSummary } from '../types/document'

type DocumentState = {
  document: DocumentSummary | null
  setDocument: (document: DocumentSummary) => void
  clearDocument: () => void
}

export const useDocumentStore = create<DocumentState>((set) => ({
  document: null,
  setDocument: (document) => set({ document }),
  clearDocument: () => set({ document: null }),
}))
