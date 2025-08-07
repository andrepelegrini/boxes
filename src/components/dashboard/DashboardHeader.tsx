// src/components/dashboard/DashboardHeader.tsx
import React from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { Project } from '../../types/app';
import PulseButton from '../ui/PulseButton';
import FloatingFeedback from '../ui/FloatingFeedback';
import TypewriterText from '../ui/TypewriterText';

interface DashboardHeaderProps {
  project: Project;
  onClose?: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  project,
  onClose
}) => {
  return (
    <div className="glass-card border-b border-nubank-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="slide-in-right">
            <TypewriterText
              text={project.name}
              speed={80}
              className="text-xl font-bold text-nubank-gray-800 block"
            />
            <p className="text-sm text-nubank-gray-600">
              Dashboard Unificado • Atualizado {new Date().toLocaleTimeString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <FloatingFeedback
            trigger={
              <button
                onClick={() => window.location.reload()}
                className="p-2 text-nubank-gray-600 hover:text-nubank-gray-800 transition-colors ripple"
                title="Atualizar dashboard"
              >
                <FiRefreshCw size={16} />
              </button>
            }
            message="Dashboard atualizado!"
            type="success"
          />

          {onClose && (
            <PulseButton
              onClick={onClose}
              variant="secondary"
              size="sm"
            >
              Voltar
            </PulseButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
