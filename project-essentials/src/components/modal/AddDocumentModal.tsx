import React, { useState } from 'react';
import { FiX, FiFileText, FiLink } from 'react-icons/fi';
import { useAppProjects } from '../../contexts/SimplifiedRootProvider';
import { DocumentItem } from '../../types/app';

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

type DocumentType = 'doc' | 'link';

const AddDocumentModal: React.FC<AddDocumentModalProps> = ({ isOpen, onClose, projectId }) => {
  const { addDocument } = useAppProjects();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    type: 'link' as DocumentType
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.url.trim()) {
      console.error('Validation failed: missing name or URL');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const newDocument: Omit<DocumentItem, 'id'> = {
        name: formData.name.trim(),
        url: formData.url.trim(),
        type: formData.type,
        projectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDocument(newDocument);
      
      // Reset form and close modal
      setFormData({
        name: '',
        description: '',
        url: '',
        type: 'link'
      });
      onClose();
    } catch (error) {
      console.error('Failed to add document:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getTypeIcon = (type: DocumentType) => {
    switch (type) {
      case 'doc':
        return <FiFileText className="w-4 h-4" />;
      case 'link':
        return <FiLink className="w-4 h-4" />;
      default:
        return <FiFileText className="w-4 h-4" />;
    }
  };

  const getTypePlaceholder = (type: DocumentType) => {
    switch (type) {
      case 'doc':
        return 'URL do arquivo...';
      case 'link':
        return 'https://exemplo.com';
      default:
        return 'URL do documento...';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-nubank-gray-200">
          <h2 className="text-lg font-semibold text-nubank-gray-800">Adicionar Documento</h2>
          <button 
            onClick={onClose}
            className="text-nubank-gray-400 hover:text-nubank-gray-600"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-nubank-gray-700 mb-1">
              Tipo
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-nubank-gray-300 rounded-md focus:ring-nubank-purple-500 focus:border-nubank-purple-500"
            >
              <option value="link">Link</option>
              <option value="doc">Documento</option>
            </select>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-nubank-gray-700 mb-1">
              Nome *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-nubank-gray-300 rounded-md focus:ring-nubank-purple-500 focus:border-nubank-purple-500"
              placeholder="Nome do documento"
              required
            />
          </div>

          <div>
            <label htmlFor="url" className="block text-sm font-medium text-nubank-gray-700 mb-1">
              URL *
            </label>
            <div className="relative">
              <input
                type="url"
                id="url"
                name="url"
                value={formData.url}
                onChange={handleInputChange}
                className="w-full px-3 py-2 pl-10 border border-nubank-gray-300 rounded-md focus:ring-nubank-purple-500 focus:border-nubank-purple-500"
                placeholder={getTypePlaceholder(formData.type)}
                required
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-nubank-gray-400">
                {getTypeIcon(formData.type)}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-nubank-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-nubank-gray-300 rounded-md focus:ring-nubank-purple-500 focus:border-nubank-purple-500"
              placeholder="Descrição do documento (opcional)..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim() || !formData.url.trim()}
              className="flex-1 bg-nubank-purple-600 text-white py-2 px-4 rounded-md hover:bg-nubank-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adicionando...' : 'Adicionar Documento'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-nubank-gray-600 border border-nubank-gray-300 rounded-md hover:bg-nubank-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDocumentModal;