import React from 'react';
import { IconType } from 'react-icons';
import { FiTrendingUp, FiStar, FiLayers, FiAward } from 'react-icons/fi';

interface FlowStep {
  id: string;
  title: string;
  icon: IconType;
  color: string;
  description?: string;
}

interface StatusFlowIndicatorProps {
  steps?: FlowStep[];
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  showDescriptions?: boolean;
  className?: string;
}

const defaultSteps: FlowStep[] = [
  {
    id: 'shelf',
    title: 'Ideias',
    icon: FiTrendingUp,
    color: 'text-nubank-gray-600',
    description: 'Capture e explore'
  },
  {
    id: 'nextUp',
    title: 'Próximos',
    icon: FiStar,
    color: 'text-nubank-blue-600',
    description: 'Priorizados para começar'
  },
  {
    id: 'active',
    title: 'Ativos',
    icon: FiLayers,
    color: 'text-nubank-purple-600',
    description: 'Em desenvolvimento'
  },
  {
    id: 'archived',
    title: 'Conquistados',
    icon: FiAward,
    color: 'text-nubank-gray-500',
    description: 'Finalizados com sucesso'
  }
];

const StatusFlowIndicator: React.FC<StatusFlowIndicatorProps> = ({
  steps = defaultSteps,
  size = 'md',
  orientation = 'horizontal',
  showDescriptions = false,
  className = ''
}) => {
  const sizeVariants = {
    sm: {
      icon: 'w-4 h-4',
      title: 'text-xs font-medium',
      description: 'text-xs',
      spacing: orientation === 'horizontal' ? 'space-x-3' : 'space-y-2',
      stepSpacing: orientation === 'horizontal' ? 'space-x-2' : 'space-y-1'
    },
    md: {
      icon: 'w-5 h-5',
      title: 'text-sm font-semibold',
      description: 'text-sm',
      spacing: orientation === 'horizontal' ? 'space-x-4' : 'space-y-3',
      stepSpacing: orientation === 'horizontal' ? 'space-x-2' : 'space-y-1'
    },
    lg: {
      icon: 'w-6 h-6',
      title: 'text-base font-semibold',
      description: 'text-base',
      spacing: orientation === 'horizontal' ? 'space-x-6' : 'space-y-4',
      stepSpacing: orientation === 'horizontal' ? 'space-x-3' : 'space-y-2'
    }
  };

  const sizeClasses = sizeVariants[size];
  const isHorizontal = orientation === 'horizontal';

  return (
    <div className={`bg-gradient-to-r from-nubank-gray-50 to-white rounded-nubank-lg border border-nubank-gray-200 shadow-sm ${className}`}>
      <div className="p-4 lg:p-6">
        <div className={`flex ${isHorizontal ? 'items-center justify-center' : 'flex-col'} ${sizeClasses.spacing}`}>
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;
            
            return (
              <React.Fragment key={step.id}>
                <div className={`flex ${isHorizontal ? 'items-center' : 'flex-col'} ${sizeClasses.stepSpacing}`}>
                  <div className="flex items-center space-x-2">
                    <Icon className={`${step.color} ${sizeClasses.icon} flex-shrink-0`} />
                    <span className={`${step.color} ${sizeClasses.title}`}>
                      {step.title}
                    </span>
                  </div>
                  {showDescriptions && step.description && (
                    <p className={`text-nubank-gray-500 ${sizeClasses.description} ${isHorizontal ? 'ml-8' : 'mt-1'}`}>
                      {step.description}
                    </p>
                  )}
                </div>
                
                {!isLast && (
                  <div className={`${isHorizontal ? 'text-nubank-gray-400 font-bold' : 'text-nubank-gray-400 text-center'}`}>
                    {isHorizontal ? '→' : '↓'}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        
        <div className="mt-4 text-center">
          <p className={`text-nubank-gray-500 ${sizeClasses.description} font-medium`}>
            ✨ Jornada Natural: Suas ideias evoluem da esquerda para a direita
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatusFlowIndicator;