import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'card' | 'text' | 'header' | 'metric' | 'button';
  size?: 'sm' | 'md' | 'lg';
  count?: number;
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'card',
  size = 'md',
  count = 1,
  className = ''
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          card: 'h-32',
          text: 'h-3',
          header: 'h-6',
          metric: 'h-16',
          button: 'h-8 w-20'
        };
      case 'lg':
        return {
          card: 'h-64',
          text: 'h-5',
          header: 'h-10',
          metric: 'h-24',
          button: 'h-12 w-32'
        };
      default:
        return {
          card: 'h-48',
          text: 'h-4',
          header: 'h-8',
          metric: 'h-20',
          button: 'h-10 w-24'
        };
    }
  };

  const sizes = getSizeClasses();

  const getSkeletonElement = () => {
    const baseClasses = 'bg-nubank-gray-200 animate-nubank-skeleton rounded';
    
    switch (variant) {
      case 'card':
        return (
          <div className={`${baseClasses} ${sizes.card} p-4 space-y-3`}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-nubank-gray-300 rounded-lg animate-nubank-skeleton" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-nubank-gray-300 rounded w-3/4 animate-nubank-skeleton" />
                <div className="h-3 bg-nubank-gray-300 rounded w-1/2 animate-nubank-skeleton" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-nubank-gray-300 rounded animate-nubank-skeleton" />
              <div className="h-3 bg-nubank-gray-300 rounded w-5/6 animate-nubank-skeleton" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-2 bg-nubank-gray-300 rounded w-1/3 animate-nubank-skeleton" />
              <div className="h-6 bg-nubank-gray-300 rounded w-16 animate-nubank-skeleton" />
            </div>
          </div>
        );
      
      case 'text':
        return (
          <div className={`${baseClasses} ${sizes.text} w-full`} />
        );
      
      case 'header':
        return (
          <div className={`${baseClasses} ${sizes.header} w-48`} />
        );
      
      case 'metric':
        return (
          <div className={`${baseClasses} ${sizes.metric} p-3 space-y-2`}>
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 bg-nubank-gray-300 rounded-lg animate-nubank-skeleton" />
              <div className="h-3 bg-nubank-gray-300 rounded w-8 animate-nubank-skeleton" />
            </div>
            <div className="h-6 bg-nubank-gray-300 rounded w-12 animate-nubank-skeleton" />
            <div className="h-3 bg-nubank-gray-300 rounded w-16 animate-nubank-skeleton" />
          </div>
        );
      
      case 'button':
        return (
          <div className={`${baseClasses} ${sizes.button}`} />
        );
      
      default:
        return (
          <div className={`${baseClasses} ${sizes.card}`} />
        );
    }
  };

  return (
    <div className={`space-y-4 ${className}`} role="status" aria-label="Carregando...">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          {getSkeletonElement()}
        </div>
      ))}
      <span className="sr-only">Carregando conteúdo...</span>
    </div>
  );
};

// Skeleton variants for specific use cases
export const ProjectCardSkeleton: React.FC<{ count?: number; className?: string }> = ({ 
  count = 1, 
  className = '' 
}) => (
  <SkeletonLoader variant="card" count={count} className={className} />
);

export const MetricCardSkeleton: React.FC<{ count?: number; className?: string }> = ({ 
  count = 4, 
  className = '' 
}) => (
  <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
    {Array.from({ length: count }, (_, index) => (
      <SkeletonLoader key={index} variant="metric" />
    ))}
  </div>
);

export const HeaderSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    <SkeletonLoader variant="header" />
    <div className="flex items-center space-x-4">
      <SkeletonLoader variant="text" className="w-32" />
      <SkeletonLoader variant="text" className="w-24" />
      <SkeletonLoader variant="button" />
    </div>
  </div>
);

export default SkeletonLoader;