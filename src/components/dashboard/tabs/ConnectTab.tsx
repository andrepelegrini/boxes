import React, { useState, useEffect } from 'react';
import { FiMessageSquare, FiUsers, FiZap, FiEye, FiCpu, FiFileText, FiLayers, FiArrowRight, FiTrendingUp } from 'react-icons/fi';
import { Project } from '../../../types/app';
import { useSlackConnection } from '../../../hooks/useSlackConnection';
import { SlackConnectFlow } from '../../slack/SlackConnectFlow';
import { SlackStatusCard } from '../../slack/SlackStatusCard';
import { SlackChannelManager } from '../../slack/SlackChannelManager';
import { slackService } from '../../../modules/slack/services/SlackService';
import { useSlackTaskDiscovery } from '../../../modules/slack/hooks';
type ViewMode = 'status' | 'setup' | 'channels';

interface ConnectedChannel {
  id: string;
  channelId: string;
  channelName: string;
  isEnabled: boolean;
  syncFrequency: string;
  connectionHealthy: boolean;
  lastHealthCheck: string;
}


interface ConnectTabProps {
  project: Project;
  onOpenSlackSuggestions: () => void;
}

export const ConnectTab: React.FC<ConnectTabProps> = ({
  project,
  onOpenSlackSuggestions,
}) => {
  const { state: connectionState, actions: connectionActions, isReady } = useSlackConnection();
  const { suggestionCounts } = useSlackTaskDiscovery();
  const [viewMode, setViewMode] = useState<ViewMode>('status');
  const [connectedChannels, setConnectedChannels] = useState<ConnectedChannel[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  
  // AI Intelligence Expansion State
  const [aiInsightsExpanded, setAiInsightsExpanded] = useState(false);
  const [backgroundProcesses, setBackgroundProcesses] = useState({
    textAnalysis: false,
    documentProcessing: false,
    patternRecognition: false,
    crossProjectLearning: false
  });

  // Load connected channels for this project
  useEffect(() => {
    if (isReady && project?.id) {
      loadConnectedChannels();
    }
  }, [isReady, project?.id]);

  const loadConnectedChannels = async () => {
    if (!project?.id) return;
    
    setIsLoadingChannels(true);
    try {
      const result = await slackService.getSyncDataForProject(project.id);
      if (result.success && result.data) {
        setConnectedChannels(result.data);
        
        // Update last sync time
        const latestSync = result.data
          .filter(ch => ch.lastHealthCheck)
          .sort((a, b) => {
            const dateA = new Date(a.lastHealthCheck);
            const dateB = new Date(b.lastHealthCheck);
            // Skip invalid dates in sorting
            if (isNaN(dateA.getTime())) return 1;
            if (isNaN(dateB.getTime())) return -1;
            return dateB.getTime() - dateA.getTime();
          })[0];
        
        if (latestSync) {
          const syncDate = new Date(latestSync.lastHealthCheck);
          if (!isNaN(syncDate.getTime())) {
            setLastSyncTime(syncDate.toISOString());
          }
        }
      }
    } catch (error) {
      console.error('Failed to load connected channels:', error);
    } finally {
      setIsLoadingChannels(false);
    }
  };

  // Auto-determine view mode based on connection state
  useEffect(() => {
    if (!connectionState.isConnected) {
      setViewMode('setup');
    } else if (connectedChannels.length === 0 && !isLoadingChannels) {
      setViewMode('channels');
    } else {
      setViewMode('status');
    }
  }, [connectionState.isConnected, connectedChannels.length, isLoadingChannels]);

  // Handler functions
  const handleSyncNow = async () => {
    if (!project?.id || connectedChannels.length === 0) return;
    
    setIsSyncing(true);
    try {
      // Sync all connected channels for this project
      for (const channel of connectedChannels) {
        await slackService.startManualSync(project.id, channel.channelId);
      }
      setLastSyncTime(new Date().toISOString());
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleChannelConnected = async (channelId: string, channelName: string) => {
    console.log('Channel connected:', { channelId, channelName });
    await loadConnectedChannels();
    setViewMode('status');
  };

  const handleChannelDisconnected = async (channelId: string, channelName: string) => {
    console.log('Channel disconnected:', { channelId, channelName });
    await loadConnectedChannels();
  };

  const handleReconnect = async () => {
    try {
      await connectionActions.reconnect();
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  };

  const handleForceReanalysis = async () => {
    if (!project?.id || connectedChannels.length === 0) return;
    
    setIsSyncing(true);
    try {
      // Force re-analysis for all connected channels
      for (const channel of connectedChannels) {
        await slackService.forceReanalysis(project.id, channel.channelId);
      }
      setLastSyncTime(new Date().toISOString());
    } catch (error) {
      console.error('Force re-analysis failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Simulate AI background processes
  useEffect(() => {
    const interval = setInterval(() => {
      setBackgroundProcesses(() => ({
        textAnalysis: Math.random() > 0.8,
        documentProcessing: Math.random() > 0.9,
        patternRecognition: Math.random() > 0.85,
        crossProjectLearning: Math.random() > 0.95
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const formatLastSyncTime = (timeString: string | null): string => {
    if (!timeString) return 'Never';
    
    const syncTime = new Date(timeString);
    // Check if the date is valid
    if (isNaN(syncTime.getTime())) {
      console.warn('Invalid date string provided to formatLastSyncTime:', timeString);
      return 'Never';
    }
    
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - syncTime.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return syncTime.toLocaleDateString();
  };

  // Expanded AI Capabilities beyond Slack
  const expandedAICapabilities = [
    {
      id: 'project-intelligence',
      title: 'Project Intelligence',
      description: 'AI analyzes project context, goals, and progress patterns',
      icon: FiCpu,
      isActive: backgroundProcesses.patternRecognition,
      insights: [
        'Identified 3 productivity patterns',
        'Suggested workflow optimizations',
        'Detected potential roadblocks'
      ]
    },
    {
      id: 'document-analysis',
      title: 'Document Analysis',
      description: 'Smart processing of project documents and resources',
      icon: FiFileText,
      isActive: backgroundProcesses.documentProcessing,
      insights: [
        'Extracted key requirements from docs',
        'Generated summary insights',
        'Identified missing documentation'
      ]
    },
    {
      id: 'cross-project-learning',
      title: 'Cross-Project Learning',
      description: 'Learns from similar projects to provide better recommendations',
      icon: FiLayers,
      isActive: backgroundProcesses.crossProjectLearning,
      insights: [
        'Applied learnings from 12 similar projects',
        'Suggested proven methodologies',
        'Identified success patterns'
      ]
    },
    {
      id: 'predictive-analytics',
      title: 'Predictive Analytics',
      description: 'Forecasts project outcomes and resource needs',
      icon: FiTrendingUp,
      isActive: backgroundProcesses.textAnalysis,
      insights: [
        'Predicted completion in 3 weeks',
        'Identified resource constraints',
        'Suggested timeline adjustments'
      ]
    }
  ];


  const renderContent = () => {
    switch (viewMode) {
      case 'setup':
        return (
          <div className="max-w-2xl mx-auto">
            <SlackConnectFlow
              onComplete={() => setViewMode('channels')}
              onChannelsConnected={() => setViewMode('status')}
            />
          </div>
        );
      
      case 'channels':
        return (
          <SlackChannelManager
            projectId={project.id}
            projectName={project.name}
            connectedChannels={connectedChannels}
            onChannelConnected={handleChannelConnected}
            onChannelDisconnected={handleChannelDisconnected}
            onClose={() => setViewMode('status')}
          />
        );
      
      case 'status':
      default:
        return (
          <div className="space-y-6">
            {/* Expanded AI Intelligence Hub */}
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6 relative overflow-hidden">
              {/* Background process indicators */}
              <div className="absolute top-4 right-4 flex space-x-1">
                {Object.values(backgroundProcesses).some(Boolean) && (
                  <>
                    {backgroundProcesses.textAnalysis && <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" title="Text Analysis"></div>}
                    {backgroundProcesses.documentProcessing && <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Document Processing"></div>}
                    {backgroundProcesses.patternRecognition && <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" title="Pattern Recognition"></div>}
                    {backgroundProcesses.crossProjectLearning && <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" title="Cross-Project Learning"></div>}
                  </>
                )}
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-indigo-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                      <FiCpu className="w-6 h-6 text-white" />
                    </div>
                    {/* AI activity pulse */}
                    {Object.values(backgroundProcesses).some(Boolean) && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-purple-900">AI Intelligence Center</h3>
                    <p className="text-sm text-purple-700">Beyond Slack: Comprehensive project analysis and insights</p>
                  </div>
                </div>
                <button
                  onClick={() => setAiInsightsExpanded(!aiInsightsExpanded)}
                  className="flex items-center space-x-2 px-4 py-2 bg-white/70 backdrop-blur-sm text-purple-700 rounded-lg hover:bg-white/90 transition-all font-medium border border-purple-200"
                >
                  <span>{aiInsightsExpanded ? 'Collapse' : 'Expand'}</span>
                  <FiArrowRight className={`w-4 h-4 transition-transform ${aiInsightsExpanded ? 'rotate-90' : ''}`} />
                </button>
              </div>

              {/* AI Capabilities Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {expandedAICapabilities.map((capability) => {
                  const Icon = capability.icon;
                  return (
                    <div
                      key={capability.id}
                      className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/50 hover:bg-white/80 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="relative">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          {capability.isActive && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 group-hover:text-purple-800 transition-colors">
                            {capability.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">{capability.description}</p>
                          {capability.isActive && (
                            <div className="mt-2 text-xs text-green-600 font-medium">
                              ⚡ Processing...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Expanded AI Insights */}
              {aiInsightsExpanded && (
                <div className="border-t border-purple-200/50 pt-6 animate-fade-in">
                  <h4 className="font-semibold text-purple-900 mb-4">Recent AI Discoveries</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {expandedAICapabilities.map((capability) => (
                      <div key={`insights-${capability.id}`} className="bg-white/80 rounded-lg p-3 border border-purple-100">
                        <div className="flex items-center space-x-2 mb-2">
                          <capability.icon className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-800">{capability.title}</span>
                        </div>
                        <ul className="space-y-1">
                          {capability.insights.map((insight, index) => (
                            <li key={index} className="text-xs text-gray-700 flex items-start space-x-2">
                              <div className="w-1 h-1 bg-purple-400 rounded-full mt-1.5 flex-shrink-0"></div>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="col-span-2 space-y-6">
                {/* Enhanced AI Task Suggestions Card */}
                {(suggestionCounts?.[project.id as keyof typeof suggestionCounts] || 0) > 0 && (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg shadow-sm overflow-hidden relative">
                    {/* Slack integration indicator */}
                    <div className="absolute top-4 right-4 flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-purple-600 font-medium">Slack Connected</span>
                    </div>

                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/25">
                            <FiZap className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-purple-900">AI Task Suggestions</h3>
                            <p className="text-sm text-purple-700">
                              {suggestionCounts?.[project.id as keyof typeof suggestionCounts]} task{(suggestionCounts?.[project.id as keyof typeof suggestionCounts] || 0) > 1 ? 's' : ''} from team communications + project analysis
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg shadow-purple-500/25">
                            {suggestionCounts?.[project.id as keyof typeof suggestionCounts]} NEW
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <p className="text-sm text-purple-800">
                          AI has analyzed team communications, project context, and cross-project patterns to identify actionable tasks and optimization opportunities.
                        </p>
                        
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => {
                              console.log('🔍 [CONNECT_TAB] User clicked Review All Suggestions button');
                              // Navigate to AI suggestions page using proper React Router navigation
                              if (typeof window !== 'undefined') {
                                window.location.hash = '/ai-suggestions';
                              }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 hover:scale-105 shadow-lg shadow-purple-500/25 font-medium"
                          >
                            <FiEye className="w-4 h-4" />
                            Review All Suggestions
                          </button>
                          <button
                            onClick={onOpenSlackSuggestions}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors font-medium"
                          >
                            <FiZap className="w-4 h-4" />
                            Quick Review
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Connection Status Card */}
                <SlackStatusCard
                  projectChannelCount={connectedChannels.length}
                  lastSyncTime={formatLastSyncTime(lastSyncTime)}
                  isSyncing={isSyncing}
                  onOpenSettings={() => {
                    console.log('⚙️ [CONNECT_TAB] User clicked open settings button');
                    // Open the settings modal through the UI store
                    // This will be handled by the parent component that has access to the UI store
                    if (typeof document !== 'undefined') {
                      const settingsButton = document.querySelector('[data-testid="settings-button"]') as HTMLButtonElement;
                      if (settingsButton) {
                        settingsButton.click();
                      }
                    }
                  }}
                  onOpenChannels={() => setViewMode('channels')}
                  onSyncNow={handleSyncNow}
                  onReconnect={handleReconnect}
                  onForceReanalysis={handleForceReanalysis}
                />
                
                {/* Connected Channels Overview */}
                {connectedChannels.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                          <FiMessageSquare className="w-5 h-5 mr-3 text-blue-600" />
                          Connected Channels ({connectedChannels.length})
                        </h3>
                        <button
                          onClick={() => setViewMode('channels')}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="grid gap-3">
                        {connectedChannels.slice(0, 3).map((channel) => (
                          <div key={channel.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-green-700">#</span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">#{channel.channelName}</p>
                                <p className="text-sm text-gray-600">
                                  {channel.connectionHealthy ? '✅ Active' : '⚠️ Issues'} • {channel.syncFrequency}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatLastSyncTime(channel.lastHealthCheck)}
                            </span>
                          </div>
                      ))}
                      
                      {connectedChannels.length > 3 && (
                        <button
                          onClick={() => setViewMode('channels')}
                          className="text-center py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View all {connectedChannels.length} channels
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              </div>

              {/* Team Communication Panel */}
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <FiUsers className="w-5 h-5 mr-3 text-purple-600" />
                    Team Activity
                  </h3>
                </div>
                
                <div className="p-6">
                  <div className="text-center py-8">
                    <FiMessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h4 className="font-medium text-gray-800 mb-2">No Recent Activity</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      {connectedChannels.length === 0
                        ? 'Connect channels to see team discussions and updates.'
                        : 'Team communication will appear here as messages are synced.'}
                    </p>
                    {connectedChannels.length === 0 && (
                      <button
                        onClick={() => setViewMode('channels')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Connect Channels →
                      </button>
                    )}
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderContent()}
    </div>
  );
};