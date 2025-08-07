import React from 'react';
import { IconType } from 'react-icons';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: IconType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'purple' | 'blue' | 'pink' | 'orange' | 'gray' | 'red' | 'green';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend = 'neutral',
  trendValue,
  color = 'purple',
  size = 'md',
  onClick,
  className = ''
}) => {
  const colorVariants = {
    purple: {
      background: 'bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900',
      border: 'border-purple-500/30',
      icon: 'from-purple-400 to-pink-500',
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500',
      title: 'text-purple-200',
      value: 'text-white',
      hover: 'hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25',
      glow: 'shadow-lg shadow-purple-500/20'
    },
    blue: {
      background: 'bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900',
      border: 'border-blue-500/30',
      icon: 'from-blue-400 to-cyan-500',
      iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
      title: 'text-blue-200',
      value: 'text-white',
      hover: 'hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25',
      glow: 'shadow-lg shadow-blue-500/20'
    },
    pink: {
      background: 'bg-gradient-to-br from-pink-900 via-pink-800 to-rose-900',
      border: 'border-pink-500/30',
      icon: 'from-pink-400 to-rose-500',
      iconBg: 'bg-gradient-to-br from-pink-500 to-rose-500',
      title: 'text-pink-200',
      value: 'text-white',
      hover: 'hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/25',
      glow: 'shadow-lg shadow-pink-500/20'
    },
    orange: {
      background: 'bg-gradient-to-br from-orange-900 via-orange-800 to-yellow-900',
      border: 'border-orange-500/30',
      icon: 'from-orange-400 to-yellow-500',
      iconBg: 'bg-gradient-to-br from-orange-500 to-yellow-500',
      title: 'text-orange-200',
      value: 'text-white',
      hover: 'hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/25',
      glow: 'shadow-lg shadow-orange-500/20'
    },
    gray: {
      background: 'bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900',
      border: 'border-gray-500/30',
      icon: 'from-gray-400 to-slate-500',
      iconBg: 'bg-gradient-to-br from-gray-500 to-slate-500',
      title: 'text-gray-200',
      value: 'text-white',
      hover: 'hover:scale-105 hover:shadow-2xl hover:shadow-gray-500/25',
      glow: 'shadow-lg shadow-gray-500/20'
    },
    red: {
      background: 'bg-gradient-to-br from-red-900 via-red-800 to-orange-900',
      border: 'border-red-500/30',
      icon: 'from-red-400 to-orange-500',
      iconBg: 'bg-gradient-to-br from-red-500 to-orange-500',
      title: 'text-red-200',
      value: 'text-white',
      hover: 'hover:scale-105 hover:shadow-2xl hover:shadow-red-500/25',
      glow: 'shadow-lg shadow-red-500/20'
    },
    green: {
      background: 'bg-gradient-to-br from-green-900 via-green-800 to-emerald-900',
      border: 'border-green-500/30',
      icon: 'from-green-400 to-emerald-500',
      iconBg: 'bg-gradient-to-br from-green-500 to-emerald-500',
      title: 'text-green-200',
      value: 'text-white',
      hover: 'hover:scale-105 hover:shadow-2xl hover:shadow-green-500/25',
      glow: 'shadow-lg shadow-green-500/20'
    }
  };

  const sizeVariants = {
    sm: {
      container: 'p-5',
      icon: 'w-8 h-8',
      iconContainer: 'w-10 h-10',
      title: 'text-sm font-bold',
      value: 'text-2xl font-black',
      subtitle: 'text-xs'
    },
    md: {
      container: 'p-6',
      icon: 'w-6 h-6',
      iconContainer: 'w-12 h-12',
      title: 'text-base font-bold',
      value: 'text-3xl font-black',
      subtitle: 'text-sm'
    },
    lg: {
      container: 'p-8',
      icon: 'w-7 h-7',
      iconContainer: 'w-14 h-14',
      title: 'text-lg font-bold',
      value: 'text-4xl font-black',
      subtitle: 'text-base'
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'down': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      default: return '→';
    }
  };

  const colorClasses = colorVariants[color];
  const sizeClasses = sizeVariants[size];

  return (
    <div
      className={`
        relative overflow-hidden
        ${colorClasses.background} 
        ${colorClasses.border} 
        ${colorClasses.glow}
        ${sizeClasses.container}
        border rounded-2xl backdrop-blur-sm transition-all duration-300
        ${onClick ? `cursor-pointer ${colorClasses.hover}` : ''}
        ${className}
      `}
      onClick={onClick}
      role={onClick ? 'button' : 'presentation'}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-y-1 transform" />
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-radial from-white/10 to-transparent rounded-full blur-xl" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`${colorClasses.iconBg} ${sizeClasses.iconContainer} rounded-xl flex items-center justify-center shadow-lg`}>
            <Icon className={`${sizeClasses.icon} text-white`} />
          </div>
          {trendValue && (
            <div className={`${getTrendColor()} ${sizeClasses.subtitle} font-bold flex items-center gap-1 px-2 py-1 rounded-lg border backdrop-blur-sm`}>
              {getTrendIcon()} {trendValue}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className={`${colorClasses.title} ${sizeClasses.title} leading-tight uppercase tracking-wide`}>
            {title}
          </h3>
          <div className={`${colorClasses.value} ${sizeClasses.value} leading-none tracking-tight`}>
            {value}
          </div>
          {subtitle && (
            <p className={`${colorClasses.title} ${sizeClasses.subtitle} opacity-80 leading-tight font-medium`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;