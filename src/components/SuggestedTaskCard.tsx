import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Task } from '../../types';
import { FiCheck, FiX, FiEdit3, FiUser } from 'react-icons/fi';
import { useAppContext } from '../contexts/SimplifiedRootProvider';
import { useAIFeedback } from '../hooks/useAIFeedback';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface SuggestedTaskCardProps {
  task: Task;
  onAccept?: (task: Task) => void;
  onReject?: (task: Task) => void;
  onChange?: (updatedTask: Task) => void;
}

interface EditTaskModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTask: Partial<Task>) => void;
  onDelete: () => void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ task, isOpen, onClose, onSave, onDelete }) => {
  const [title, setTitle] = useState(task.title || task.name || '');
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(task.priority || 'medium');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      title,
      name: title,
      description,
      priority
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <FiUser className="text-purple-600" />
          <h3 className="text-lg font-semibold">Editar Sugestão AI</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título da Tarefa
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Nome da tarefa..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Detalhes da tarefa..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prioridade
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={onDelete}
            className="px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
          >
            Rejeitar Sugestão
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Criar Tarefa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SuggestedTaskCard: React.FC<SuggestedTaskCardProps> = ({ 
  task, 
  onAccept, 
  onReject,
  onChange 
}) => {
  const { updateTask, deleteTask } = useAppContext();
  const { submitFeedback } = useAIFeedback();
  const { projectId: _projectId } = useParams<{ projectId: string }>();
  const [showEditModal, setShowEditModal] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
  });
  
  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Submit positive feedback
    await submitFeedback(
      'approve',
      'button_click',
      task.id,
      'task_suggestion',
      1,
      'User approved suggestion via button click',
      {
        domain: 'project_management',
        acceptedViaButton: true,
        communicationStyle: 'direct_action'
      }
    ).catch(error => console.error('Failed to submit feedback:', error));

    // Move task to "descobrindo" column
    updateTask(task, 'descobrindo');
    onAccept?.(task);
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Submit negative feedback
    await submitFeedback(
      'reject',
      'button_click',
      task.id,
      'task_suggestion',
      -1,
      'User rejected suggestion via button click',
      {
        domain: 'project_management',
        rejectedViaButton: true,
        communicationStyle: 'direct_action'
      }
    ).catch(error => console.error('Failed to submit feedback:', error));

    // Delete the suggested task
    deleteTask(task.id);
    onReject?.(task);
  };

  const handleEditSave = async (updatedTask: Partial<Task>) => {
    // Submit feedback for edited suggestion
    await submitFeedback(
      'approve_with_modification',
      'inline_edit',
      task.id,
      'task_suggestion',
      0.5,
      'User approved suggestion with modifications',
      {
        domain: 'project_management',
        editedAndAccepted: true,
        originalTitle: task.name,
        editedTitle: updatedTask.name,
        communicationStyle: 'edited_action'
      }
    ).catch(error => console.error('Failed to submit feedback:', error));

    // Update task with new details and move to descobrindo
    const finalTask = { ...task, ...updatedTask };
    updateTask(finalTask, 'descobrindo');
    onChange?.(finalTask);
  };

  const handleEditDelete = async () => {
    await handleReject({ stopPropagation: () => {}, preventDefault: () => {} } as React.MouseEvent);
    setShowEditModal(false);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`p-3 group bg-gradient-to-br from-purple-50 to-pink-50 rounded-md border-2 border-purple-200 hover:border-purple-300 hover:shadow-md transition-all duration-150 cursor-grab active:cursor-grabbing relative ${isDragging ? 'opacity-50' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`Sugestão AI: ${task.name}. Use os botões para aceitar, rejeitar ou editar.`}
      >
        {/* AI Badge */}
        <div className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full p-1 shadow-lg">
          <FiUser size={12} />
        </div>

        <div className="mb-2">
          <h5 className="font-medium text-sm text-gray-900 pr-6">
            {task.title || task.name}
          </h5>
        </div>

        {task.description && (
          <p className="text-xs text-gray-600 mb-3 break-words line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center gap-1">
          <button
            onClick={handleAccept}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
            title="Aceitar sugestão"
            aria-label="Aceitar esta sugestão"
          >
            <FiCheck size={12} />
            Aceitar
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowEditModal(true);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            title="Editar sugestão"
            aria-label="Editar esta sugestão"
          >
            <FiEdit3 size={12} />
            Editar
          </button>

          <button
            onClick={handleReject}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            title="Rejeitar sugestão"
            aria-label="Rejeitar esta sugestão"
          >
            <FiX size={12} />
            Rejeitar
          </button>
        </div>

        {/* Task ID */}
        <div className="flex justify-end mt-2 pt-2 border-t border-purple-200">
          <span className="text-xs text-purple-600/70">
            #{task.id.substring(0, 4)}
          </span>
        </div>
      </div>

      <EditTaskModal
        task={task}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleEditSave}
        onDelete={handleEditDelete}
      />
    </>
  );
};

export default SuggestedTaskCard;