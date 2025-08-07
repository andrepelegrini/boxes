import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { FiLoader } from 'react-icons/fi';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'nubank' | 'nubank-outline' | 'nubank-secondary' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses = {
  // Variantes Nubank (novas)
  nubank: 'bg-gradient-to-r from-nubank-purple-500 to-nubank-pink-500 text-white hover:from-nubank-purple-600 hover:to-nubank-pink-600 hover:shadow-nubank-hover hover:scale-[1.02] focus:ring-nubank-purple-500 focus:ring-opacity-50 active:scale-[0.98]',
  'nubank-outline': 'border-2 border-nubank-purple-500 text-nubank-purple-500 hover:bg-nubank-purple-500 hover:text-white hover:shadow-nubank focus:ring-nubank-purple-500 focus:ring-opacity-50 active:scale-[0.98]',
  'nubank-secondary': 'bg-nubank-gray-100 text-nubank-gray-800 hover:bg-nubank-gray-200 hover:shadow-sm focus:ring-nubank-purple-500 focus:ring-opacity-30 active:scale-[0.98]',
  
  // Variantes legadas (mantidas para compatibilidade)
  primary: 'bg-nubank-purple-500 text-white hover:bg-nubank-purple-600 hover:shadow-nubank focus:ring-nubank-purple-500 focus:ring-opacity-50',
  secondary: 'bg-nubank-gray-100 text-nubank-gray-800 hover:bg-nubank-gray-200 focus:ring-nubank-gray-300 focus:ring-opacity-50',
  outline: 'border border-nubank-gray-300 text-nubank-gray-700 hover:bg-nubank-gray-100 focus:ring-nubank-purple-500 focus:ring-opacity-50',
  ghost: 'text-nubank-gray-600 hover:text-nubank-gray-800 hover:bg-nubank-gray-100 focus:ring-nubank-purple-500 focus:ring-opacity-50',
  danger: 'bg-nubank-pink-500 text-white hover:bg-nubank-pink-600 hover:shadow-nubank-pink focus:ring-nubank-pink-500 focus:ring-opacity-50',
};

const sizeClasses = {
  sm: 'px-4 py-2 text-sm h-8',
  md: 'px-6 py-3 text-base h-11',
  lg: 'px-8 py-4 text-lg h-14',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'nubank',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-nubank transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden relative';
    
    const classes = [
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      fullWidth ? 'w-full' : '',
      className,
    ].join(' ');

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <FiLoader className="w-4 h-4 mr-2 animate-spin" />}
        {!loading && leftIcon && <span className="mr-2 flex items-center">{leftIcon}</span>}
        <span className="relative z-10">{children}</span>
        {!loading && rightIcon && <span className="ml-2 flex items-center">{rightIcon}</span>}
      </button>
    );
  }
);