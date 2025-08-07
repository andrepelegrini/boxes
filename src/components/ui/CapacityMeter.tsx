import React from 'react';
import { FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

interface CapacityMeterProps {
  current: number;
  maximum: number;
  percentage: number;
  isOverCapacity: boolean;
  warningThreshold?: number;
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  animated?: boolean;
  className?: string;
}

const CapacityMeter: React.FC<CapacityMeterProps> = ({
  current,
  maximum,
  percentage,
  isOverCapacity,
  warningThreshold = 80,
  title = "Energia Focada",
  subtitle,
  size = 'md',
  showIcon = true,
  animated = true,
  className = ''
}) => {
  const getStatus = () => {
    if (isOverCapacity) return 'danger';
    if (percentage > warningThreshold) return 'warning';
    return 'healthy';
  };

  const status = getStatus();

  const statusConfig = {
    healthy: {
      gradient: 'bg-gradient-to-r from-nubank-purple-500 to-nubank-pink-500',
      background: 'bg-gradient-to-br from-nubank-purple-50 to-nubank-pink-50',
      border: 'border-nubank-purple-200',
      icon: FiCheckCircle,
      iconColor: 'text-nubank-purple-600',
      textColor: 'text-nubank-purple-800',
      message: '🎯 Ritmo perfeito para grandes conquistas'
    },
    warning: {
      gradient: 'bg-gradient-to-r from-nubank-orange-500 to-nubank-orange-600',
      background: 'bg-gradient-to-br from-nubank-orange-50 to-nubank-orange-100',
      border: 'border-nubank-orange-200',
      icon: FiAlertTriangle,
      iconColor: 'text-nubank-orange-600',
      textColor: 'text-nubank-orange-800',
      message: '⚠️ Muita coisa ao mesmo tempo, considere finalizar algo'
    },
    danger: {
      gradient: 'bg-gradient-to-r from-nubank-pink-500 to-nubank-pink-600',
      background: 'bg-gradient-to-br from-nubank-pink-50 to-nubank-pink-100',
      border: 'border-nubank-pink-200',
      icon: FiAlertTriangle,
      iconColor: 'text-nubank-pink-600',
      textColor: 'text-nubank-pink-800',
      message: '🚨 Sobrecarga! Finalize projetos para retomar o foco'
    }
  };

  const sizeVariants = {
    sm: {
      container: 'p-4',
      title: 'text-sm font-semibold',
      subtitle: 'text-xs',
      value: 'text-lg font-bold',
      message: 'text-xs',
      meter: 'h-2',
      icon: 'w-5 h-5'
    },
    md: {
      container: 'p-5',
      title: 'text-base font-semibold',
      subtitle: 'text-sm',
      value: 'text-xl font-bold',
      message: 'text-sm',
      meter: 'h-3',
      icon: 'w-6 h-6'
    },
    lg: {
      container: 'p-6',
      title: 'text-lg font-semibold',
      subtitle: 'text-base',
      value: 'text-2xl font-bold',
      message: 'text-base',
      meter: 'h-4',
      icon: 'w-7 h-7'
    }
  };

  const config = statusConfig[status];
  const sizeClasses = sizeVariants[size];
  const Icon = config.icon;

  const displaySubtitle = subtitle || `${current} / ${maximum} pontos (${percentage}%)`;

  return (
    <div className={`
      ${config.background} 
      ${config.border} 
      border rounded-nubank-lg shadow-sm transition-all duration-300
      ${sizeClasses.container}
      ${className}
    `}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {showIcon && (
            <Icon className={`${config.iconColor} ${sizeClasses.icon}`} />
          )}
          <div>
            <h3 className={`${config.textColor} ${sizeClasses.title}`}>
              {title}
            </h3>
            <p className={`${config.textColor} ${sizeClasses.subtitle} opacity-70`}>
              {displaySubtitle}
            </p>
          </div>
        </div>
        <div className={`${config.textColor} ${sizeClasses.value}`}>
          {percentage}%
        </div>
      </div>

      <div className="space-y-3">
        <div className={`w-full bg-nubank-gray-200 rounded-full ${sizeClasses.meter} shadow-inner overflow-hidden`}>
          <div 
            className={`
              ${sizeClasses.meter} 
              ${config.gradient} 
              rounded-full shadow-sm transition-all duration-1000 ease-out
              ${animated ? 'animate-pulse' : ''}
            `}
            style={{ width: `${Math.min(percentage, 100)}%` }}
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Capacidade de energia: ${percentage}%`}
          />
        </div>
        
        <p className={`${config.textColor} ${sizeClasses.message} font-medium text-center`}>
          {config.message}
        </p>
      </div>
    </div>
  );
};

export default CapacityMeter;