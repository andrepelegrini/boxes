import React, { useState } from 'react';
import { FiX, FiCalendar, FiClock } from 'react-icons/fi';
import { useAppProjects } from '../../contexts/SimplifiedRootProvider';
import { EventItem } from '../../hooks/useEventState';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose, projectId }) => {
  const { addEvent } = useAppProjects();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    time: '',
    location: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.date) {
      console.error('Validation failed: missing name or date');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const eventDateTime = formData.time 
        ? `${formData.date}T${formData.time}:00`
        : `${formData.date}T09:00:00`;

      const newEvent: Omit<EventItem, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        date: eventDateTime,
        projectId,
        type: 'event',
      };

      await addEvent(newEvent);
      
      // Reset form and close modal
      setFormData({
        name: '',
        description: '',
        date: '',
        time: '',
        location: ''
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-nubank-gray-200">
          <h2 className="text-lg font-semibold text-nubank-gray-800">Novo Evento</h2>
          <button 
            onClick={onClose}
            className="text-nubank-gray-400 hover:text-nubank-gray-600"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
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
              placeholder="Nome do evento"
              required
            />
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
              placeholder="Detalhes do evento..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-nubank-gray-700 mb-1">
                Data *
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-nubank-gray-300 rounded-md focus:ring-nubank-purple-500 focus:border-nubank-purple-500"
                  required
                />
                <FiCalendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-nubank-gray-400 w-4 h-4 pointer-events-none" />
              </div>
            </div>

            <div>
              <label htmlFor="time" className="block text-sm font-medium text-nubank-gray-700 mb-1">
                Horário
              </label>
              <div className="relative">
                <input
                  type="time"
                  id="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-nubank-gray-300 rounded-md focus:ring-nubank-purple-500 focus:border-nubank-purple-500"
                />
                <FiClock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-nubank-gray-400 w-4 h-4 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-nubank-gray-700 mb-1">
              Local
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-nubank-gray-300 rounded-md focus:ring-nubank-purple-500 focus:border-nubank-purple-500"
              placeholder="Local do evento (opcional)"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim() || !formData.date}
              className="flex-1 bg-nubank-purple-600 text-white py-2 px-4 rounded-md hover:bg-nubank-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Criando...' : 'Criar Evento'}
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

export default CreateEventModal;