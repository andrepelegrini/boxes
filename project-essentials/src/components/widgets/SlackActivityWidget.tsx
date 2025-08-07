// src/components/widgets/SlackActivityWidget.tsx
import React, { useState, useEffect } from 'react';
import { FiSlack, FiMessageSquare, FiUsers, FiRefreshCw, FiLink, FiClock } from 'react-icons/fi';
import WidgetCard from './WidgetCard';
import { Project } from '../../types/app';
import { useSlack } from '../../contexts';

interface SlackActivityWidgetProps {
  project: Project;
  className?: string;
  isExpandable?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onRemove?: () => void;
}

interface SlackActivityData {
  channelName: string;
  lastSync: string;
  messageCount: number;
  activeUsers: string[];
  recentActivity: Array<{
    id: string;
    user: string;
    text: string;
    timestamp: string;
    type: 'message' | 'file' | 'reaction';
  }>;
  isConnected: boolean;
  syncStatus: 'synced' | 'syncing' | 'error' | 'never';
}

const SlackActivityWidget: React.FC<SlackActivityWidgetProps> = ({
  project,
  className,
  isExpandable = true,
  isExpanded = false,
  onToggleExpand,
  onRemove
}) => {
  const slack = useSlack();
  const { state: slackState, actions: slackActions, isConnected } = slack;
  const [activityData, setActivityData] = useState<SlackActivityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [projectSyncData, setProjectSyncData] = useState<any[]>([]);
  const activeSync = projectSyncData.find((sync: any) => sync.isEnabled);

  useEffect(() => {
    const fetchConnections = async () => {
      const connections = await slackActions.getConnectionsForProject(project.id);
      setProjectSyncData(connections);
    };

    if (isConnected) {
      fetchConnections();
    }
  }, [project.id, isConnected, slackActions]);

  useEffect(() => {
    if (activeSync && isConnected) {
      // Small delay to prevent immediate API hit on mount
      const timer = setTimeout(() => {
        loadActivityData();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [activeSync, isConnected]);

  const loadActivityData = async () => {
    if (!activeSync) return;
    
    setIsLoading(true);
    try {
      // Fetch real Slack channel messages with lower limit to reduce API pressure
      console.log('SlackActivityWidget: Fetching messages for channel', activeSync.channelId, 'with limit 10');
      const messages = await slackActions.fetchMessages(activeSync.channelId, 10);
      
      // Extract unique active users from recent messages
      const activeUsers = [...new Set((messages || []).map((msg: any) => msg.user_name || msg.user).filter(Boolean))] as string[];
      
      // Transform messages to activity format
      const recentActivity = (messages || []).slice(0, 10).map((msg: any) => ({
        id: msg.ts || msg.id || Math.random().toString(),
        user: msg.user_name || msg.user || 'Unknown User',
        text: msg.text || '',
        timestamp: msg.ts ? new Date(parseFloat(msg.ts) * 1000).toISOString() : new Date().toISOString(),
        type: msg.files?.length > 0 ? 'file' : 'message'
      }));

      const activityData: SlackActivityData = {
        channelName: activeSync?.channelName || 'Unknown Channel',
        lastSync: activeSync?.lastSyncAt || new Date().toISOString(),
        messageCount: messages.length,
        activeUsers: activeUsers.slice(0, 10), // Limit to 10 most active users
        recentActivity,
        isConnected: true,
        syncStatus: 'synced'
      };
      
      setActivityData(activityData);
    } catch (error) {
      console.error('Error loading Slack activity:', error);
      
      // Check if it's a rate limit error
      const isRateLimit = error instanceof Error && error.message.includes('Rate limited');
      
      // Error fallback
      const errorData: SlackActivityData = {
        channelName: activeSync.channelName,
        lastSync: activeSync.lastSyncAt || new Date().toISOString(),
        messageCount: 0,
        activeUsers: [],
        recentActivity: [],
        isConnected: !isRateLimit, // If rate limited, connection is still active
        syncStatus: isRateLimit ? 'syncing' : 'error'
      };
      
      setActivityData(errorData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshActivity = async () => {
    if (activeSync) {
      // Temporarily disabled to prevent cursor loop
      // await slackActions.triggerSync(project.id);
      await loadActivityData();
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    
    // Check if the date is valid
    if (isNaN(time.getTime())) {
      console.warn('Invalid timestamp provided to formatRelativeTime:', timestamp);
      return 'data inválida';
    }
    
    const diffMs = now.getTime() - time.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'agora';
    if (diffMinutes < 60) return `${diffMinutes}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'file': return '📎';
      case 'reaction': return '👍';
      default: return '💬';
    }
  };

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'text-green-600 bg-green-100';
      case 'syncing': return 'text-blue-600 bg-blue-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSyncStatusLabel = (status: string) => {
    switch (status) {
      case 'synced': return 'Sincronizado';
      case 'syncing': return 'Sincronizando';
      case 'error': return 'Erro na sincronização';
      default: return 'Nunca sincronizado';
    }
  };

  return (
    <WidgetCard
      title="Atividade do Slack"
      icon={<FiSlack size={20} />}
      className={className || ''}
      isExpandable={isExpandable}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      onRemove={onRemove}
      size={isExpanded ? 'xl' : 'md'}
      priority={activeSync ? 'medium' : 'low'}
      isLoading={isLoading}
      actions={
        activeSync && (
          <button
            onClick={handleRefreshActivity}
            className="p-1 text-purple-600 hover:text-purple-800 transition-colors"
            title="Atualizar atividade"
            disabled={isLoading}
          >
            <FiRefreshCw className={isLoading ? 'animate-spin' : ''} size={16} />
          </button>
        )
      }
    >
      <div className="space-y-4">
        {!isConnected ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center">
              <FiSlack className="text-purple-600" size={20} />
            </div>
            <h4 className="text-sm font-medium text-nubank-gray-600 mb-1">
              Slack não conectado
            </h4>
            <p className="text-xs text-nubank-gray-500">
              Conecte ao Slack para ver atividades do canal
            </p>
          </div>
        ) : !activeSync ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 bg-nubank-gray-100 rounded-full flex items-center justify-center">
              <FiLink className="text-nubank-gray-400" size={20} />
            </div>
            <h4 className="text-sm font-medium text-nubank-gray-600 mb-1">
              Canal não conectado
            </h4>
            <p className="text-xs text-nubank-gray-500 mb-3">
              Conecte este projeto a um canal do Slack
            </p>
            <button className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium hover:bg-purple-200 transition-colors">
              Conectar Canal
            </button>
          </div>
        ) : activityData ? (
          <>
            {/* Channel Info */}
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <FiSlack className="text-purple-600" size={16} />
                  <span className="font-medium text-purple-800">#{activityData.channelName}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSyncStatusColor(activityData.syncStatus)}`}>
                  {getSyncStatusLabel(activityData.syncStatus)}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-xs text-purple-700">
                <div className="flex items-center space-x-1">
                  <FiClock size={12} />
                  <span>Última sincronização: {formatRelativeTime(activityData.lastSync)}</span>
                </div>
              </div>
            </div>

            {/* Activity Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-nubank-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-nubank-blue-600">{activityData.messageCount}</div>
                <div className="text-xs text-nubank-blue-700">Mensagens hoje</div>
              </div>
              
              <div className="text-center p-3 bg-nubank-green-50 rounded-lg">
                <div className="text-2xl font-bold text-nubank-green-600">{activityData.activeUsers.length}</div>
                <div className="text-xs text-nubank-green-700">Usuários ativos</div>
              </div>
            </div>

            {/* Active Users */}
            <div>
              <h4 className="text-sm font-medium text-nubank-gray-800 mb-2 flex items-center">
                <FiUsers className="mr-2" size={14} />
                Usuários Ativos
              </h4>
              <div className="flex flex-wrap gap-1">
                {(activityData.activeUsers || []).map((user, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-nubank-gray-100 text-nubank-gray-700 rounded-full text-xs"
                  >
                    {user}
                  </span>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="text-sm font-medium text-nubank-gray-800 mb-3 flex items-center">
                <FiMessageSquare className="mr-2" size={14} />
                Atividade Recente
              </h4>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {(activityData.recentActivity || []).map((activity) => (
                  <div key={activity.id} className="flex space-x-3 p-2 bg-nubank-gray-50 rounded-lg">
                    <div className="text-lg">{getActivityIcon(activity.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm text-nubank-gray-800">{activity.user}</span>
                        <span className="text-xs text-nubank-gray-500">{formatRelativeTime(activity.timestamp)}</span>
                      </div>
                      <p className="text-sm text-nubank-gray-600 line-clamp-2">{activity.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isExpanded && (
              <div className="pt-3 border-t border-nubank-gray-200">
                <button className="w-full px-3 py-2 text-purple-700 hover:text-purple-900 text-sm font-medium transition-colors">
                  Ver Todas as Mensagens no Slack
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 bg-nubank-gray-100 rounded-full flex items-center justify-center">
              <FiMessageSquare className="text-nubank-gray-400" size={20} />
            </div>
            <h4 className="text-sm font-medium text-nubank-gray-600 mb-1">
              Sem atividade
            </h4>
            <p className="text-xs text-nubank-gray-500">
              Nenhuma atividade encontrada no canal conectado
            </p>
          </div>
        )}
      </div>
    </WidgetCard>
  );
};

export default SlackActivityWidget;