import React, { useState } from 'react';
import { FiEye, FiEyeOff, FiCopy, FiAlertCircle } from 'react-icons/fi';

export interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'password' | 'email' | 'url' | 'textarea';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  help?: string;
  rows?: number; // for textarea
  maxLength?: number;
  showCharCount?: boolean;
  showCopyButton?: boolean;
  showPasswordToggle?: boolean;
  className?: string;
  inputClassName?: string;
}

/**
 * Reusable FormField component that provides:
 * - Consistent styling across all forms
 * - Built-in password visibility toggle
 * - Copy to clipboard functionality
 * - Character count display
 * - Error state styling
 * - Help text support
 * - Support for text, password, email, url, and textarea inputs
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  error,
  help,
  rows = 3,
  maxLength,
  showCharCount = false,
  showCopyButton = false,
  showPasswordToggle = false,
  className = '',
  inputClassName = '',
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const actualType = type === 'password' && showPassword ? 'text' : type;
  const hasError = !!error;
  const shouldShowPasswordToggle = type === 'password' && (showPasswordToggle || true); // Default true for password fields
  const shouldShowCopyButton = showCopyButton && value.length > 0;
  const hasActions = shouldShowPasswordToggle || shouldShowCopyButton;

  // Base input classes
  const inputBaseClasses = `
    w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 
    transition-colors disabled:opacity-50 disabled:cursor-not-allowed
    ${hasError 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
      : 'border-gray-300 focus:border-blue-500'
    }
    ${hasActions ? 'pr-16' : 'pr-3'}
    ${inputClassName}
  `.trim();

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {/* Input container */}
      <div className="relative">
        {type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            rows={rows}
            maxLength={maxLength}
            className={inputBaseClasses}
          />
        ) : (
          <input
            type={actualType}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            maxLength={maxLength}
            className={inputBaseClasses}
          />
        )}
        
        {/* Action buttons */}
        {hasActions && (
          <div className="absolute right-2 top-2 flex space-x-1">
            {shouldShowPasswordToggle && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            )}
            
            {shouldShowCopyButton && (
              <button
                type="button"
                onClick={handleCopy}
                disabled={!value}
                className={`p-1 focus:outline-none transition-colors ${
                  copySuccess 
                    ? 'text-green-600' 
                    : 'text-gray-400 hover:text-gray-600 disabled:opacity-50'
                }`}
                title={copySuccess ? 'Copiado!' : 'Copiar'}
                tabIndex={-1}
              >
                <FiCopy className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Character count */}
      {showCharCount && maxLength && (
        <div className="text-xs text-gray-500 text-right">
          {value.length}/{maxLength}
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="flex items-center space-x-1 text-red-600 text-sm">
          <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Help text */}
      {help && !error && (
        <p className="text-xs text-gray-500">{help}</p>
      )}
    </div>
  );
};

/**
 * Specialized form field components for common use cases
 */

export interface ClientIdFieldProps extends Omit<FormFieldProps, 'type' | 'label' | 'help'> {
  label?: string;
  help?: string;
}

export const ClientIdField: React.FC<ClientIdFieldProps> = ({
  label = 'Client ID',
  help = 'Encontre em: Basic Information → App Credentials → Client ID',
  ...props
}) => (
  <FormField
    {...props}
    type="text"
    label={label}
    help={help}
    showCopyButton
    placeholder="123456789.123456789"
  />
);

export interface ClientSecretFieldProps extends Omit<FormFieldProps, 'type' | 'label' | 'help'> {
  label?: string;
  help?: string;
}

export const ClientSecretField: React.FC<ClientSecretFieldProps> = ({
  label = 'Client Secret',
  help = 'Encontre em: Basic Information → App Credentials → Client Secret (clique em "Show")',
  ...props
}) => (
  <FormField
    {...props}
    type="password"
    label={label}
    help={help}
    showCopyButton
    showPasswordToggle
    placeholder="abc123def456..."
  />
);

export interface CodeFieldProps extends Omit<FormFieldProps, 'type' | 'label' | 'help'> {
  label?: string;
  help?: string;
}

export const CodeField: React.FC<CodeFieldProps> = ({
  label = 'URL ou Código de Autorização',
  help = 'Cole a URL completa ou apenas o código após "code="',
  ...props
}) => (
  <FormField
    {...props}
    type="textarea"
    label={label}
    help={help}
    rows={4}
    placeholder="Cole a URL completa ou apenas o código..."
  />
);