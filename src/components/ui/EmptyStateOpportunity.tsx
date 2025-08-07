import React, { memo } from 'react';
import { FiTrendingUp, FiStar, FiLayers, FiAward, FiPlus, FiArrowRight, FiBox, FiHeart, FiTarget, FiZap } from 'react-icons/fi';
import { useAppContext } from '../../contexts/SimplifiedRootProvider';

interface EmptyStateOpportunityProps {
  zone: 'shelf' | 'nextUp' | 'active' | 'archived';
  onCreateProject?: () => void;
}

const EmptyStateOpportunity: React.FC<EmptyStateOpportunityProps> = memo(({ zone, onCreateProject }) => {
  const { projects, toggleNextUp, promoteProjectToActive } = useAppContext();

  const handleMoveProjectFromShelf = () => {
    const shelfProjectNotNextUp = projects.projects.find((p: any) => p.status === 'shelf' && !p.isNextUp);
    if (shelfProjectNotNextUp) {
      toggleNextUp(shelfProjectNotNextUp.id);
    }
  };

  const handleStartNextProject = () => {
    const nextUpProject = projects.projects.find((p: any) => p.status === 'shelf' && p.isNextUp);
    if (nextUpProject) {
      promoteProjectToActive(nextUpProject.id);
    }
  };

  const getEmptyStateConfig = () => {
    const totalProjects = projects.projects.length;
    const completedProjects = projects.projects.filter((p: any) => p.status === 'archived').length;
    const isFirstTime = totalProjects === 0;
    const hasCompletedProjects = completedProjects > 0;

    switch (zone) {
      case 'shelf':
        return {
          icon: <FiTrendingUp size={48} className="text-nubank-gray-500" />,
          title: isFirstTime ? '🌟 Bem-vindo ao seu espaço criativo!' : '💡 Espaço para novas ideias',
          subtitle: isFirstTime 
            ? 'Este é o lugar onde suas ideias ganham forma' 
            : 'Todas as grandes conquistas começam com uma ideia',
          description: isFirstTime
            ? 'Crie sua primeira caixa de projeto e comece a organizar seus sonhos. É mais simples do que parece!'
            : 'Que tal capturar aquela ideia que está na sua cabeça? Transforme pensamentos em projetos organizados.',
          illustration: (
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-nubank-purple-100 to-nubank-pink-100 rounded-nubank-lg flex items-center justify-center mb-4 mx-auto shadow-nubank">
                <FiStar size={32} className="text-nubank-purple-600" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-nubank-pink-500 rounded-full flex items-center justify-center animate-nubank-float">
                <span className="text-white text-sm">✨</span>
              </div>
            </div>
          ),
          primaryAction: {
            text: isFirstTime ? '🚀 Criar minha primeira caixa' : '💭 Capturar nova ideia',
            onClick: onCreateProject,
            icon: <FiPlus size={16} />
          },
          tips: isFirstTime 
            ? ['Dica: Comece com algo simples, como "Organizar escritório" ou "Aprender algo novo"']
            : ['Dica: Não se preocupe com detalhes agora, apenas capture a ideia!'],
          bgGradient: 'from-nubank-gray-50 to-white'
        };

      case 'nextUp':
        return {
          icon: <FiStar size={48} className="text-nubank-blue-500" />,
          title: '🎯 Fila de entrada vazia',
          subtitle: 'Projetos prontos para serem trabalhados',
          description: 'Quando você estiver pronto para pegar um novo projeto, mova-o da prateleira para cá. Assim você mantém o foco!',
          illustration: (
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-nubank-blue-100 to-nubank-purple-100 rounded-nubank-lg flex items-center justify-center mb-4 mx-auto shadow-nubank">
                <FiTarget size={32} className="text-nubank-blue-600" />
              </div>
              <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-nubank-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">📋</span>
              </div>
            </div>
          ),
          primaryAction: projects.projects.filter((p: any) => p.status === 'shelf' && !p.isNextUp).length > 0 ? {
            text: '👆 Mover projeto da prateleira',
            onClick: handleMoveProjectFromShelf,
            icon: <FiArrowRight size={16} />
          } : undefined,
          tips: ['Dica: Mantenha apenas 2-3 projetos aqui para não se sobrecarregar'],
          bgGradient: 'from-nubank-blue-50 to-nubank-purple-50'
        };

      case 'active':
        return {
          icon: <FiLayers size={48} className="text-nubank-purple-500" />,
          title: '⚡ Modo foco ativado',
          subtitle: 'Nenhum projeto em execução no momento',
          description: 'Perfeito! Ter zero projetos ativos significa que você pode se dedicar 100% ao próximo. Escolha sabiamente.',
          illustration: (
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-nubank-purple-100 to-nubank-pink-100 rounded-nubank-lg flex items-center justify-center mb-4 mx-auto shadow-nubank">
                <FiZap size={32} className="text-nubank-purple-600" />
              </div>
              <div className="absolute -top-2 -left-2 w-8 h-8 bg-nubank-purple-500 rounded-full flex items-center justify-center animate-nubank-float">
                <span className="text-white text-sm">🔥</span>
              </div>
            </div>
          ),
          primaryAction: projects.projects.filter((p: any) => p.status === 'shelf' && p.isNextUp).length > 0 ? {
            text: '🚀 Começar próximo projeto',
            onClick: handleStartNextProject,
            icon: <FiArrowRight size={16} />
          } : undefined,
          tips: ['Dica: Foque em 1-2 projetos por vez para maximizar resultados'],
          bgGradient: 'from-nubank-purple-50 to-nubank-pink-50'
        };

      case 'archived':
        return {
          icon: <FiAward size={48} className="text-nubank-gray-500" />,
          title: hasCompletedProjects ? '🏆 Suas conquistas aparecerão aqui' : '🎖️ Galeria de conquistas',
          subtitle: hasCompletedProjects ? 'Complete projetos para vê-los aqui' : 'Seus projetos finalizados ficarão aqui',
          description: hasCompletedProjects 
            ? 'Cada projeto concluído é uma vitória! Continue trabalhando nos seus projetos ativos.'
            : 'Este será seu museu pessoal de conquistas. Que tal finalizar seu primeiro projeto?',
          illustration: (
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-nubank-gray-100 to-nubank-gray-50 rounded-nubank-lg flex items-center justify-center mb-4 mx-auto shadow-nubank">
                <FiHeart size={32} className="text-nubank-gray-600" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-nubank-gray-400 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">🏅</span>
              </div>
            </div>
          ),
          tips: hasCompletedProjects 
            ? ['Lembra: Projetos arquivados podem ser reabertos se necessário']
            : ['Dica: A sensação de finalizar um projeto é incrível!'],
          bgGradient: 'from-nubank-gray-50 to-white'
        };

      default:
        return {
          icon: <FiBox size={48} className="text-nubank-gray-400" />,
          title: 'Estado vazio',
          subtitle: '',
          description: '',
          illustration: null,
          bgGradient: 'from-nubank-gray-50 to-white'
        };
    }
  };

  const config = getEmptyStateConfig();

  return (
    <div className={`text-center py-16 px-8 rounded-nubank-lg min-h-[320px] flex flex-col justify-center items-center bg-gradient-to-br ${config.bgGradient} border-2 border-dashed border-nubank-gray-300/60 transition-all duration-300 hover:border-nubank-gray-400/80 hover:shadow-nubank-hover group`}>
      {/* Illustration */}
      {config.illustration && (
        <div className="mb-6 group-hover:scale-105 transition-transform duration-300">
          {config.illustration}
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-4 max-w-md">
        <h3 className="font-bold text-xl text-nubank-gray-800 leading-tight">
          {config.title}
        </h3>
        
        {config.subtitle && (
          <p className="font-semibold text-nubank-gray-600 text-lg">
            {config.subtitle}
          </p>
        )}
        
        <p className="text-nubank-gray-600 leading-relaxed text-base">
          {config.description}
        </p>

        {/* Primary Action */}
        {config.primaryAction && (
          <div className="pt-4">
            <button
              onClick={config.primaryAction.onClick}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-nubank-purple-500 to-nubank-pink-500 text-white font-semibold hover:from-nubank-purple-600 hover:to-nubank-pink-600 hover:shadow-nubank-hover hover:scale-105 py-3 px-6 rounded-nubank transition-all duration-300"
            >
              {config.primaryAction.icon}
              <span>{config.primaryAction.text}</span>
            </button>
          </div>
        )}

        {/* Tips */}
        {config.tips && config.tips.length > 0 && (
          <div className="pt-6 space-y-2">
            {config.tips.map((tip, index) => (
              <p key={index} className="text-sm text-nubank-gray-500 italic bg-white/50 py-2 px-4 rounded-nubank border border-nubank-gray-200/50">
                {tip}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

EmptyStateOpportunity.displayName = 'EmptyStateOpportunity';

export default EmptyStateOpportunity;