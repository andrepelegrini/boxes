// src/hooks/useDocumentState.ts
import { useState, useEffect, useCallback } from 'react';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/localStorage';
import { ActivityLogActions } from './useActivityLogState';

export interface DocumentItem {
  id: string;
  name: string;
  description?: string;
  url?: string;
  type: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentActions {
  addDocument: (docData: Omit<DocumentItem, 'id' | 'createdAt' | 'updatedAt'>) => DocumentItem;
  updateDocument: (doc: DocumentItem) => void;
  deleteDocument: (docId: string) => void;
  getDocumentsByProjectId: (projectId: string) => DocumentItem[];
}

export const useDocumentState = (
  addActivityLog: ActivityLogActions['addActivityLog']
): [DocumentItem[], DocumentActions] => {
  const [documents, setDocuments] = useState<DocumentItem[]>(() => loadFromLocalStorage<DocumentItem[]>('documents_v2', []));

  useEffect(() => saveToLocalStorage('documents_v2', documents), [documents]);

  const addDocument = useCallback((docData: Omit<DocumentItem, 'id' | 'createdAt'|'updatedAt'>): DocumentItem => {
    const now = new Date().toISOString();
    const newDoc: DocumentItem = { ...docData, id: Date.now().toString() + Math.random().toString(36).substring(2,7), createdAt: now, updatedAt: now };
    setDocuments(prev => [newDoc, ...prev]);
    addActivityLog({
      type: 'document',
      action: 'add',
      details: "Documento \"" + newDoc.name + "\" adicionado à Caixa.",
      projectId: docData.projectId
    });
    return newDoc;
  }, [addActivityLog, setDocuments]);

  const updateDocument = useCallback((updatedDoc: DocumentItem) => {
    const now = new Date().toISOString();
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? {...updatedDoc, updatedAt: now} : d));
    addActivityLog({
      type: 'document',
      action: 'update',
      details: "Documento \"" + updatedDoc.name + "\" atualizado na Caixa.",
      projectId: updatedDoc.projectId
    });
  }, [addActivityLog, setDocuments]);

  const deleteDocument = useCallback((docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (doc) {
      setDocuments(prev => prev.filter(d => d.id !== docId));
      addActivityLog({
        type: 'document',
        action: 'delete',
        details: "Documento \"" + doc.name + "\" excluído da Caixa.",
        projectId: doc.projectId
      });
    }
  }, [documents, addActivityLog, setDocuments]);

  const getDocumentsByProjectId = useCallback((projectId: string) => documents.filter(d => d.projectId === projectId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [documents]);

  return [documents, { addDocument, updateDocument, deleteDocument, getDocumentsByProjectId }];
};