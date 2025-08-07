import React from 'react';
import { IconType } from 'react-icons';

interface ActionButton {
  id: string;
  label: string;
  icon: IconType;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
}

interface ActionButtonGroupProps {
  actions: ActionButton[];
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  variant?: 'contained' | 'outlined' | 'minimal';
  className?: string;
}

const ActionButtonGroup: React.FC<ActionButtonGroupProps> = ({
  actions,
  size = 'md',
  orientation = 'horizontal',
  variant = 'contained',
  className = ''
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          button: 'px-2 py-1 text-xs',
          icon: 'w-3 h-3'
        };
      case 'lg':
        return {
          button: 'px-6 py-3 text-base',
          icon: 'w-5 h-5'
        };
      default:
        return {
          button: 'px-4 py-2 text-sm',
          icon: 'w-4 h-4'
        };
    }
  };

  const getVariantClasses = (action: ActionButton) => {
    const baseClasses = 'font-medium rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    if (variant === 'outlined') {
      switch (action.variant) {
        case 'primary':
          return `${baseClasses} border-2 border-nubank-purple-500 text-nubank-purple-700 hover:bg-nubank-purple-50 focus:ring-nubank-purple-500`;
        case 'danger':
          return `${baseClasses} border-2 border-red-500 text-red-700 hover:bg-red-50 focus:ring-red-500`;
        case 'success':
          return `${baseClasses} border-2 border-green-500 text-green-700 hover:bg-green-50 focus:ring-green-500`;
        default:
          return `${baseClasses} border-2 border-nubank-gray-300 text-nubank-gray-700 hover:bg-nubank-gray-50 focus:ring-nubank-gray-500`;
      }
    }

    if (variant === 'minimal') {
      switch (action.variant) {
        case 'primary':
          return `${baseClasses} text-nubank-purple-700 hover:bg-nubank-purple-100 focus:ring-nubank-purple-500`;
        case 'danger':
          return `${baseClasses} text-red-700 hover:bg-red-100 focus:ring-red-500`;
        case 'success':
          return `${baseClasses} text-green-700 hover:bg-green-100 focus:ring-green-500`;
        default:
          return `${baseClasses} text-nubank-gray-700 hover:bg-nubank-gray-100 focus:ring-nubank-gray-500`;
      }
    }

    // Contained variant (default)
    switch (action.variant) {
      case 'primary':
        return `${baseClasses} bg-nubank-purple-600 text-white hover:bg-nubank-purple-700 focus:ring-nubank-purple-500 shadow-nubank`;
      case 'danger':
        return `${baseClasses} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm`;
      case 'success':
        return `${baseClasses} bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm`;
      default:
        return `${baseClasses} bg-nubank-gray-600 text-white hover:bg-nubank-gray-700 focus:ring-nubank-gray-500 shadow-sm`;
    }
  };

  const sizes = getSizeClasses();
  const containerClasses = orientation === 'horizontal' 
    ? 'flex items-center space-x-2' 
    : 'flex flex-col space-y-2';

  return (
    <div className={`${containerClasses} ${className}`} role="group">
      {actions.map((action) => {
        const IconComponent = action.icon;
        const buttonClasses = getVariantClasses(action);
        const isDisabled = action.disabled || action.loading;

        return (
          <button
            key={action.id}
            onClick={() => {
              console.log(`🔲 [ACTION_BUTTON] User clicked action: ${action.label} (${action.id})`);
              action.onClick();
            }}
            disabled={isDisabled}
            title={action.tooltip || action.label}
            className={`
              ${buttonClasses}
              ${sizes.button}
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              flex items-center space-x-2
            `}
            aria-label={action.label}
          >
            {action.loading ? (
              <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${sizes.icon}`} />
            ) : (
              <IconComponent className={sizes.icon} aria-hidden="true" />
            )}
            <span>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ActionButtonGroup;