import React, { useState, useCallback } from 'react';
import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

export interface ValidationRule<T = any> {
  field: keyof T;
  message: string;
  validator: (value: any, data: T) => boolean;
}

export interface FormProps<T> {
  initialData: T;
  onSubmit: (data: T) => Promise<void>;
  validationRules?: ValidationRule<T>[];
  submitButtonText?: string;
  submitButtonLoadingText?: string;
  cancelButtonText?: string;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
  children: (formState: FormState<T>) => React.ReactNode;
}

export interface FormState<T> {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
  submitError: string | null;
  submitSuccess: string | null;
  hasErrors: boolean;
  isValid: boolean;
  updateField: (field: keyof T, value: any) => void;
  updateData: (updates: Partial<T>) => void;
  clearErrors: () => void;
  clearMessages: () => void;
  validate: () => boolean;
}

/**
 * Generic Form component that provides:
 * - Form state management
 * - Validation with custom rules
 * - Loading states during submission
 * - Error and success message display
 * - Consistent form styling and behavior
 */
export function Form<T extends Record<string, any>>({
  initialData,
  onSubmit,
  validationRules = [],
  submitButtonText = 'Submit',
  submitButtonLoadingText = 'Submitting...',
  cancelButtonText = 'Cancel',
  onCancel,
  disabled = false,
  className = '',
  children,
}: FormProps<T>) {
  const [data, setData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const updateField = useCallback((field: keyof T, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const updateData = useCallback((updates: Partial<T>) => {
    setData(prev => ({ ...prev, ...updates }));
    
    // Clear errors for updated fields
    Object.keys(updates).forEach(key => {
      if (errors[key as keyof T]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[key as keyof T];
          return newErrors;
        });
      }
    });
  }, [errors]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearMessages = useCallback(() => {
    setSubmitError(null);
    setSubmitSuccess(null);
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    
    validationRules.forEach(rule => {
      if (!rule.validator(data[rule.field], data)) {
        newErrors[rule.field] = rule.message;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [data, validationRules]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (disabled || isSubmitting) return;
    
    // Clear previous messages
    setSubmitError(null);
    setSubmitSuccess(null);
    
    // Validate form
    if (!validate()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSubmit(data);
      setSubmitSuccess('Operação realizada com sucesso!');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erro inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formState: FormState<T> = {
    data,
    errors,
    isSubmitting,
    submitError,
    submitSuccess,
    hasErrors: Object.keys(errors).length > 0,
    isValid: validationRules.length === 0 || Object.keys(errors).length === 0,
    updateField,
    updateData,
    clearErrors,
    clearMessages,
    validate,
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {children(formState)}
      
      {/* Global form messages */}
      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
          <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{submitError}</span>
        </div>
      )}
      
      {submitSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center space-x-2">
          <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <span className="text-sm text-green-700">{submitSuccess}</span>
        </div>
      )}
      
      {/* Form actions */}
      <div className="flex space-x-3 pt-2">
        <button
          type="submit"
          disabled={disabled || isSubmitting || formState.hasErrors}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md font-medium 
                   disabled:opacity-50 disabled:cursor-not-allowed 
                   hover:bg-blue-700 transition-colors"
        >
          {isSubmitting ? submitButtonLoadingText : submitButtonText}
        </button>
        
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md 
                     hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {cancelButtonText}
          </button>
        )}
      </div>
    </form>
  );
}

/**
 * Simple validation helpers for common use cases
 */
export const validators = {
  required<T>(field: keyof T, message?: string): ValidationRule<T> {
    return {
      field,
      message: message || `${String(field)} é obrigatório`,
      validator: (value) => value != null && value !== '' && value !== undefined,
    };
  },
  
  minLength<T>(field: keyof T, min: number, message?: string): ValidationRule<T> {
    return {
      field,
      message: message || `${String(field)} deve ter pelo menos ${min} caracteres`,
      validator: (value) => typeof value === 'string' && value.length >= min,
    };
  },
  
  maxLength<T>(field: keyof T, max: number, message?: string): ValidationRule<T> {
    return {
      field,
      message: message || `${String(field)} deve ter no máximo ${max} caracteres`,
      validator: (value) => typeof value === 'string' && value.length <= max,
    };
  },
  
  pattern<T>(field: keyof T, regex: RegExp, message?: string): ValidationRule<T> {
    return {
      field,
      message: message || `${String(field)} tem formato inválido`,
      validator: (value) => typeof value === 'string' && regex.test(value),
    };
  },
  
  custom<T>(field: keyof T, validator: (value: any, data: T) => boolean, message: string): ValidationRule<T> {
    return {
      field,
      message,
      validator,
    };
  },
};