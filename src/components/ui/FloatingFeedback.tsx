import React from 'react';

interface FloatingFeedbackProps {
  trigger: React.ReactElement;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  children?: React.ReactNode;
}

const FloatingFeedback: React.FC<FloatingFeedbackProps> = ({
  trigger,
  message,
  children
}) => {
  return (
    <div className="relative group">
      {trigger}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
        {message}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
      </div>
      {children}
    </div>
  );
};

export default FloatingFeedback;