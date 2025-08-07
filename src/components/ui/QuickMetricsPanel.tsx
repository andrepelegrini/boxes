import React from 'react';
import { IconType } from 'react-icons';
import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';

interface Metric {
  id: string;
  label: string;
  value: string | number;
  subtitle?: string;
  icon: IconType;
  color: 'purple' | 'blue' | 'green' | 'amber' | 'red' | 'gray';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

interface QuickMetricsPanelProps {
  metrics: Metric[];
  columns?: 1 | 2 | 3 | 4;
  size?: 'sm' | 'md' | 'lg';
  showTrends?: boolean;
  className?: string;
}

const QuickMetricsPanel: React.FC<QuickMetricsPanelProps> = ({
  metrics,
  columns = 2,
  size = 'md',
  showTrends = true,
  className = ''
}) => {
  const getColorClasses = (color: Metric['color']) => {
    switch (color) {
      case 'purple':
        return {
          bg: 'bg-nubank-purple-50',
          border: 'border-nubank-purple-200',
          icon: 'text-nubank-purple-600',
          value: 'text-nubank-purple-800',
          label: 'text-nubank-purple-700'
        };
      case 'blue':
        return {
          bg: 'bg-nubank-blue-50',
          border: 'border-nubank-blue-200',
          icon: 'text-nubank-blue-600',
          value: 'text-nubank-blue-800',
          label: 'text-nubank-blue-700'
        };
      case 'green':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-600',
          value: 'text-green-800',
          label: 'text-green-700'
        };
      case 'amber':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          icon: 'text-amber-600',
          value: 'text-amber-800',
          label: 'text-amber-700'
        };
      case 'red':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-600',
          value: 'text-red-800',
          label: 'text-red-700'
        };
      default:
        return {
          bg: 'bg-nubank-gray-50',
          border: 'border-nubank-gray-200',
          icon: 'text-nubank-gray-600',
          value: 'text-nubank-gray-800',
          label: 'text-nubank-gray-700'
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'p-3',
          icon: 'w-4 h-4 p-1.5',
          value: 'text-lg',
          label: 'text-xs',
          subtitle: 'text-xs',
          trend: 'text-xs'
        };
      case 'lg':
        return {
          container: 'p-6',
          icon: 'w-8 h-8 p-2',
          value: 'text-3xl',
          label: 'text-base',
          subtitle: 'text-sm',
          trend: 'text-sm'
        };
      default:
        return {
          container: 'p-4',
          icon: 'w-6 h-6 p-1.5',
          value: 'text-2xl',
          label: 'text-sm',
          subtitle: 'text-sm',
          trend: 'text-sm'
        };
    }
  };

  const getGridColumns = () => {
    switch (columns) {
      case 1:
        return 'grid-cols-1';
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
      default:
        return 'grid-cols-1 sm:grid-cols-2';
    }
  };

  const getTrendIcon = (trend: Metric['trend']) => {
    switch (trend) {
      case 'up':
        return FiTrendingUp;
      case 'down':
        return FiTrendingDown;
      default:
        return FiMinus;
    }
  };

  const getTrendColor = (trend: Metric['trend']) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-nubank-gray-500';
    }
  };

  const sizes = getSizeClasses();

  return (
    <div className={`grid ${getGridColumns()} gap-4 ${className}`}>
      {metrics.map((metric) => {
        const colors = getColorClasses(metric.color);
        const IconComponent = metric.icon;
        const TrendIcon = getTrendIcon(metric.trend);

        return (
          <div
            key={metric.id}
            className={`
              ${colors.bg} ${colors.border} border rounded-lg ${sizes.container}
              hover:shadow-md transition-all duration-200 hover:scale-[1.02]
            `}
            role="region"
            aria-label={`Métrica: ${metric.label}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className={`${colors.bg} rounded-lg ${sizes.icon} flex items-center justify-center border ${colors.border}`}>
                <IconComponent className={`${colors.icon} w-full h-full`} />
              </div>
              {showTrends && metric.trend && (
                <div className={`flex items-center space-x-1 ${getTrendColor(metric.trend)}`}>
                  <TrendIcon className="w-3 h-3" />
                  {metric.trendValue && (
                    <span className={sizes.trend}>{metric.trendValue}</span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className={`${sizes.value} font-bold ${colors.value}`}>
                {metric.value}
              </div>
              <div className={`${sizes.label} font-medium ${colors.label}`}>
                {metric.label}
              </div>
              {metric.subtitle && (
                <div className={`${sizes.subtitle} ${colors.label} opacity-75`}>
                  {metric.subtitle}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default QuickMetricsPanel;