import React from 'react';
import { FiTrendingUp, FiCheckCircle, FiClock } from 'react-icons/fi';

interface ProgressIndicatorProps {
  percentage: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'linear' | 'circular' | 'minimal';
  color?: 'purple' | 'blue' | 'green' | 'amber' | 'red';
  showPercentage?: boolean;
  showIcon?: boolean;
  animated?: boolean;
  label?: string;
  className?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  percentage,
  size = 'md',
  variant = 'linear',
  color = 'purple',
  showPercentage = true,
  showIcon = false,
  animated = true,
  label,
  className = ''
}) => {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  const getColorClasses = () => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-nubank-blue-500',
          bgLight: 'bg-nubank-blue-100',
          text: 'text-nubank-blue-700'
        };
      case 'green':
        return {
          bg: 'bg-green-500',
          bgLight: 'bg-green-100',
          text: 'text-green-700'
        };
      case 'amber':
        return {
          bg: 'bg-amber-500',
          bgLight: 'bg-amber-100',
          text: 'text-amber-700'
        };
      case 'red':
        return {
          bg: 'bg-red-500',
          bgLight: 'bg-red-100',
          text: 'text-red-700'
        };
      default:
        return {
          bg: 'bg-nubank-purple-500',
          bgLight: 'bg-nubank-purple-100',
          text: 'text-nubank-purple-700'
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          height: 'h-1',
          text: 'text-xs',
          icon: 'w-3 h-3',
          circular: 'w-8 h-8'
        };
      case 'lg':
        return {
          height: 'h-3',
          text: 'text-base',
          icon: 'w-5 h-5',
          circular: 'w-16 h-16'
        };
      default:
        return {
          height: 'h-2',
          text: 'text-sm',
          icon: 'w-4 h-4',
          circular: 'w-12 h-12'
        };
    }
  };

  const colors = getColorClasses();
  const sizes = getSizeClasses();

  const getStatusIcon = () => {
    if (clampedPercentage === 100) return FiCheckCircle;
    if (clampedPercentage > 50) return FiTrendingUp;
    return FiClock;
  };

  const StatusIcon = getStatusIcon();

  if (variant === 'circular') {
    const circumference = 2 * Math.PI * 16; // radius = 16
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <div className={`relative ${sizes.circular}`}>
          <svg
            className="transform -rotate-90"
            width="100%"
            height="100%"
            viewBox="0 0 40 40"
          >
            <circle
              cx="20"
              cy="20"
              r="16"
              stroke={colors.bgLight}
              strokeWidth="3"
              fill="transparent"
              className="opacity-30"
            />
            <circle
              cx="20"
              cy="20"
              r="16"
              stroke="currentColor"
              strokeWidth="3"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`${colors.text} ${animated ? 'transition-all duration-500 ease-out' : ''}`}
            />
          </svg>
          {showIcon && (
            <div className="absolute inset-0 flex items-center justify-center">
              <StatusIcon className={`${sizes.icon} ${colors.text}`} />
            </div>
          )}
        </div>
        {showPercentage && (
          <span className={`font-medium ${sizes.text} ${colors.text}`}>
            {clampedPercentage}%
          </span>
        )}
        {label && (
          <span className={`${sizes.text} text-nubank-gray-600`}>
            {label}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        {showIcon && <StatusIcon className={`${sizes.icon} ${colors.text}`} />}
        {showPercentage && (
          <span className={`font-medium ${sizes.text} ${colors.text}`}>
            {clampedPercentage}%
          </span>
        )}
        {label && (
          <span className={`${sizes.text} text-nubank-gray-600`}>
            {label}
          </span>
        )}
      </div>
    );
  }

  // Linear variant (default)
  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1">
          {label && (
            <span className={`${sizes.text} font-medium text-nubank-gray-700`}>
              {label}
            </span>
          )}
          {showPercentage && (
            <span className={`${sizes.text} font-medium ${colors.text}`}>
              {clampedPercentage}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-nubank-gray-200 rounded-full ${sizes.height} overflow-hidden`}>
        <div
          className={`${sizes.height} ${colors.bg} rounded-full ${
            animated ? 'transition-all duration-500 ease-out' : ''
          }`}
          style={{ width: `${clampedPercentage}%` }}
          role="progressbar"
          aria-valuenow={clampedPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label ? `${label}: ${clampedPercentage}%` : `${clampedPercentage}%`}
        />
      </div>
    </div>
  );
};

export default ProgressIndicator;