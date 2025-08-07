// src/components/widgets/WidgetCard.tsx
import React, { ReactNode } from 'react';
import { FiMoreHorizontal, FiMaximize2, FiMinimize2, FiX } from 'react-icons/fi';
import GlowingCard from '../ui/GlowingCard';
import ShimmerLoading from '../ui/SkeletonLoader';
import FloatingFeedback from '../ui/FloatingFeedback';

export interface WidgetCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
  isExpandable?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onRemove?: () => void;
  isLoading?: boolean;
  error?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

const WidgetCard: React.FC<WidgetCardProps> = ({
  title,
  icon,
  children,
  className = '',
  actions,
  isExpandable = false,
  isExpanded = false,
  onToggleExpand,
  onRemove,
  isLoading = false,
  error,
  size = 'md',
  priority = 'medium'
}) => {
  const sizeClasses = {
    sm: 'col-span-1 row-span-1',
    md: 'col-span-1 md:col-span-2 row-span-1',
    lg: 'col-span-1 md:col-span-2 lg:col-span-3 row-span-2',
    xl: 'col-span-1 md:col-span-2 lg:col-span-4 row-span-2'
  };

  const getPriorityGlow = () => {
    switch (priority) {
      case 'critical': return 'purple';
      case 'high': return 'purple';
      case 'medium': return 'blue';
      default: return 'purple';
    }
  };

  const priorityColors = {
    low: 'border-nubank-gray-200',
    medium: 'border-nubank-blue-200',
    high: 'border-nubank-orange-200',
    critical: 'border-nubank-pink-200'
  };

  const expandedClasses = isExpanded ? 'fixed inset-4 z-50 shadow-2xl slide-in-up' : '';

  return (
    <GlowingCard
      glowColor={getPriorityGlow()}
      intensity={priority === 'critical' ? 'high' : priority === 'high' ? 'medium' : 'low'}
      className={`
        ${sizeClasses[size]} 
        ${priorityColors[priority]}
        ${expandedClasses}
        ${className}
        border rounded-lg flex flex-col overflow-hidden
        notion-hover scale-on-hover
        ${isExpanded ? 'bounce-in' : ''}
        ${priority === 'critical' ? 'status-indicator' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-nubank-gray-200 glass-card">
        <div className="flex items-center space-x-2 flex-1">
          {icon && (
            <div className="text-nubank-purple-600">
              {icon}
            </div>
          )}
          <h3 className="font-semibold text-nubank-gray-800 text-sm md:text-base">
            {title}
          </h3>
          {priority === 'critical' && (
            <div className="w-2 h-2 bg-nubank-pink-500 rounded-full pulse-slow"></div>
          )}
          {priority === 'high' && (
            <div className="w-2 h-2 bg-nubank-orange-500 rounded-full pulse-slow"></div>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          {actions}
          
          {isExpandable && (
            <FloatingFeedback
              trigger={
                <button
                  onClick={onToggleExpand}
                  className="p-1 text-nubank-gray-400 hover:text-nubank-gray-600 transition-colors ripple"
                  title={isExpanded ? 'Minimizar' : 'Expandir'}
                >
                  {isExpanded ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
                </button>
              }
              message={isExpanded ? 'Minimizado!' : 'Expandido!'}
              type="success"
            />
          )}
          
          {onRemove && (
            <FloatingFeedback
              trigger={
                <button
                  onClick={onRemove}
                  className="p-1 text-nubank-gray-400 hover:text-nubank-pink-600 transition-colors ripple"
                  title="Remover widget"
                >
                  <FiX size={16} />
                </button>
              }
              message="Widget removido!"
              type="warning"
            />
          )}
          
          <button className="p-1 text-nubank-gray-400 hover:text-nubank-gray-600 transition-colors">
            <FiMoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <ShimmerLoading variant="text" size="sm" />
            <ShimmerLoading variant="text" size="md" />
            <ShimmerLoading variant="card" size="md" />
            <ShimmerLoading variant="text" size="sm" />
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <div className="text-nubank-pink-600 text-sm wiggle">
              ⚠️ {error}
            </div>
          </div>
        ) : (
          <div className="p-4 theme-transition">
            {children}
          </div>
        )}
      </div>

      {/* Expanded backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 slide-in-up"
          onClick={onToggleExpand}
        />
      )}
    </GlowingCard>
  );
};

export default WidgetCard;