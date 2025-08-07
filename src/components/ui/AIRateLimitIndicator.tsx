/**
 * AI Rate Limit Indicator Component
 * 
 * Shows users the current rate limit status for AI features,
 * helping them understand when they can make requests and
 * providing helpful guidance for rate limit management.
 */

import React from 'react';
import { FiClock, FiAlertTriangle, FiCheck } from 'react-icons/fi';

interface AIRateLimitIndicatorProps {
  rateLimitStatus: {
    message: string;
    severity: 'info' | 'warning' | 'error';
    canMakeRequest: boolean;
    resetTime?: string;
  };
  className?: string;
  showDetails?: boolean;
}

const AIRateLimitIndicator: React.FC<AIRateLimitIndicatorProps> = ({
  rateLimitStatus,
  className = '',
  showDetails = true
}) => {
  const getStatusConfig = () => {
    switch (rateLimitStatus.severity) {
      case 'error':
        return {
          icon: FiAlertTriangle,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-500'
        };
      case 'warning':
        return {
          icon: FiClock,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-500'
        };
      default:
        return {
          icon: FiCheck,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-500'
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <IconComponent className={`${config.iconColor} flex-shrink-0`} size={16} />
        <div className="flex-1">
          <p className={`${config.textColor} text-sm font-medium`}>
            {rateLimitStatus.message}
          </p>
          
          {showDetails && rateLimitStatus.resetTime && (
            <p className={`${config.textColor} text-xs mt-1 opacity-75`}>
              Disponível novamente às {rateLimitStatus.resetTime}
            </p>
          )}
          
          {showDetails && rateLimitStatus.severity === 'warning' && (
            <div className={`${config.textColor} text-xs mt-2 space-y-1`}>
              <p>💡 <strong>Dicas para economizar requisições:</strong></p>
              <ul className="ml-4 space-y-0.5">
                <li>• Combine múltiplos arquivos em uma análise</li>
                <li>• Use análises menos frequentemente</li>
                <li>• Aguarde entre requisições</li>
              </ul>
            </div>
          )}
          
          {showDetails && rateLimitStatus.severity === 'error' && (
            <div className={`${config.textColor} text-xs mt-2 space-y-1`}>
              <p>🚫 <strong>Limite atingido:</strong></p>
              <ul className="ml-4 space-y-0.5">
                <li>• Aguarde o tempo de reset</li>
                <li>• Verifique seus limites no Google AI Studio</li>
                <li>• Considere upgradar sua conta API</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIRateLimitIndicator;