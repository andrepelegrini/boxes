import React from 'react';
import { FiGrid, FiPlus, FiUser, FiSettings, FiZap, FiTrendingUp } from 'react-icons/fi';
import MetricCard from './MetricCard';
import CapacityMeter from './CapacityMeter';
import StatusFlowIndicator from './StatusFlowIndicator';

interface DashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  completedThisWeek: number;
  averageProgress: number;
  capacity: {
    current: number;
    maximum: number;
    percentage: number;
    isOverCapacity: boolean;
  };
}

interface DashboardHeaderProps {
  user?: { name: string; avatar?: string };
  metrics: DashboardMetrics;
  onCreateProject: () => void;
  onOpenSettings: () => void;
  greeting?: string;
  className?: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  metrics,
  onCreateProject,
  onOpenSettings,
  greeting,
  className = ''
}) => {
  const getGreeting = () => {
    if (greeting) return greeting;
    
    const hour = new Date().getHours();
    const userName = user?.name?.split(' ')[0] || 'Criativo';
    
    if (hour < 12) return `Bom dia, ${userName}! ☀️`;
    if (hour < 18) return `Boa tarde, ${userName}! 🌤️`;
    return `Boa noite, ${userName}! 🌙`;
  };

  const getMotivationalMessage = () => {
    const { activeProjects, completedThisWeek, capacity } = metrics;
    
    if (capacity.isOverCapacity) {
      return "Hora de finalizar algo e celebrar! 🎯";
    }
    
    if (completedThisWeek > 0) {
      return `${completedThisWeek} conquista${completedThisWeek > 1 ? 's' : ''} esta semana! Continue assim! 🚀`;
    }
    
    if (activeProjects === 0) {
      return "Que tal dar vida a uma nova ideia? ✨";
    }
    
    return "Vamos transformar ideias em conquistas! 💪";
  };

  return (
    <div className={`bg-gradient-to-br from-white via-nubank-purple-50/30 to-nubank-pink-50/30 rounded-nubank-xl shadow-nubank-elevated border border-nubank-purple-100/50 ${className}`}>
      <div className="p-4 lg:p-5">
        {/* Header Superior */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
            <div className="p-3 bg-gradient-to-br from-nubank-purple-500 to-nubank-pink-500 rounded-nubank-lg shadow-nubank">
              <FiGrid className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-nubank-gray-800 leading-tight">
                {getGreeting()}
              </h1>
              <p className="text-nubank-gray-600 text-sm lg:text-base font-medium">
                {getMotivationalMessage()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {user && (
              <div className="hidden sm:flex items-center space-x-3 px-4 py-2 bg-white/70 rounded-nubank-lg border border-nubank-gray-200 shadow-sm">
                <div className="w-8 h-8 bg-gradient-to-br from-nubank-purple-500 to-nubank-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="text-sm font-medium text-nubank-gray-700">{user.name}</span>
              </div>
            )}
            
            <button
              onClick={onOpenSettings}
              className="p-3 text-nubank-gray-600 hover:text-nubank-purple-600 hover:bg-white/70 rounded-nubank-lg transition-all duration-200 hover:scale-105"
              title="Configurações"
            >
              <FiSettings className="w-5 h-5" />
            </button>
            
            <button
              onClick={onCreateProject}
              className="flex items-center bg-gradient-to-r from-nubank-purple-500 to-nubank-pink-500 text-white font-semibold hover:from-nubank-purple-600 hover:to-nubank-pink-600 hover:shadow-nubank-hover hover:scale-105 py-3 px-6 rounded-nubank-lg transition-all duration-300"
            >
              <FiPlus className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">Nova Ideia</span>
            </button>
          </div>
        </div>

        {/* Métricas em Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <MetricCard
            title="Total de Projetos"
            value={metrics.totalProjects.toString()}
            icon={FiGrid}
            color="gray"
            size="sm"
          />
          
          <MetricCard
            title="Ativos Agora"
            value={metrics.activeProjects.toString()}
            subtitle={`de ${metrics.capacity.maximum} possíveis`}
            icon={FiZap}
            color="purple"
            size="sm"
          />
          
          <MetricCard
            title="Finalizados"
            value={metrics.completedThisWeek.toString()}
            subtitle="esta semana"
            icon={FiTrendingUp}
            color="blue"
            size="sm"
            trend={metrics.completedThisWeek > 0 ? 'up' : 'neutral'}
          />
          
          <MetricCard
            title="Progresso Médio"
            value={`${metrics.averageProgress}%`}
            subtitle="dos projetos ativos"
            icon={FiUser}
            color="pink"
            size="sm"
            trend={metrics.averageProgress > 50 ? 'up' : metrics.averageProgress < 30 ? 'down' : 'neutral'}
          />
        </div>

        {/* Medidor de Capacidade */}
        <div className="mb-4">
          <CapacityMeter
            current={metrics.capacity.current}
            maximum={metrics.capacity.maximum}
            percentage={metrics.capacity.percentage}
            isOverCapacity={metrics.capacity.isOverCapacity}
            size="md"
            animated={true}
          />
        </div>

        {/* Indicador de Fluxo */}
        <StatusFlowIndicator
          size="md"
          showDescriptions={false}
        />
      </div>
    </div>
  );
};

export default DashboardHeader;