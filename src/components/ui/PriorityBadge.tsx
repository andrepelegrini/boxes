import React from 'react';
import { FiAlertTriangle, FiClock, FiTarget, FiStar } from 'react-icons/fi';

interface PriorityBadgeProps {
  priority: 'urgent' | 'high' | 'medium' | 'low';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  size = 'md',
  showIcon = true,
  className = ''
}) => {
  const getPriorityConfig = () => {
    switch (priority) {
      case 'urgent':
        return {
          bg: 'bg-red-100',
          text: 'text-red-700',
          border: 'border-red-200',
          icon: FiAlertTriangle,
          label: 'Urgente',
          pulse: 'animate-pulse'
        };
      case 'high':
        return {
          bg: 'bg-amber-100',
          text: 'text-amber-700',
          border: 'border-amber-200',
          icon: FiClock,
          label: 'Alta',
          pulse: ''
        };
      case 'medium':
        return {
          bg: 'bg-nubank-blue-100',
          text: 'text-nubank-blue-700',
          border: 'border-nubank-blue-200',
          icon: FiTarget,
          label: 'Média',
          pulse: ''
        };
      case 'low':
        return {
          bg: 'bg-nubank-gray-100',
          text: 'text-nubank-gray-700',
          border: 'border-nubank-gray-200',
          icon: FiStar,
          label: 'Baixa',
          pulse: ''
        };
      default:
        return {
          bg: 'bg-nubank-gray-100',
          text: 'text-nubank-gray-700',
          border: 'border-nubank-gray-200',
          icon: FiTarget,
          label: 'Normal',
          pulse: ''
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-0.5 text-xs',
          icon: 'w-3 h-3'
        };
      case 'lg':
        return {
          container: 'px-4 py-2 text-base',
          icon: 'w-5 h-5'
        };
      default:
        return {
          container: 'px-3 py-1 text-sm',
          icon: 'w-4 h-4'
        };
    }
  };

  const config = getPriorityConfig();
  const sizeClasses = getSizeClasses();
  const IconComponent = config.icon;

  return (
    <span
      className={`
        inline-flex items-center space-x-1 font-medium rounded-full border
        ${config.bg} ${config.text} ${config.border} ${config.pulse}
        ${sizeClasses.container}
        ${className}
      `}
      role="status"
      aria-label={`Prioridade: ${config.label}`}
    >
      {showIcon && (
        <IconComponent className={sizeClasses.icon} aria-hidden="true" />
      )}
      <span>{config.label}</span>
    </span>
  );
};

export default PriorityBadge;