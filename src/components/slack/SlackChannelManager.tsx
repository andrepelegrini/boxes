/**
 * Slack Channel Management Interface
 * Add/remove channels for a project with real-time status
 */

import React, { useState, useEffect } from 'react';
import { FiPlus, FiX, FiHash, FiLock, FiUsers, FiRefreshCw, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import { useSlackConnection } from '../../hooks/useSlackConnection';
import { slackService } from '../../modules/slack/services/SlackService';

interface Channel {
  id: string;
  name: string;
  isPrivate?: boolean;
  isMember?: boolean;
  memberCount?: number;
}

interface ConnectedChannel {
  id: string;
  channelId: string;
  channelName: string;
  isEnabled: boolean;
  syncFrequency: string;
  connectionHealthy: boolean;
  lastHealthCheck: string;
}

interface SlackChannelManagerProps {
  projectId: string;
  projectName: string;
  connectedChannels?: ConnectedChannel[];
  onChannelConnected?: (channelId: string, channelName: string) => void;
  onChannelDisconnected?: (channelId: string, channelName: string) => void;
  onClose?: () => void;
}

export const SlackChannelManager: React.FC<SlackChannelManagerProps> = ({
  projectId,
  projectName,
  connectedChannels = [],
  onChannelConnected,
  onChannelDisconnected,
  onClose,
}) => {
  const { isReady } = useSlackConnection();
  const [availableChannels, setAvailableChannels] = useState<Channel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [connectingChannels, setConnectingChannels] = useState<Set<string>>(new Set());
  const [disconnectingChannels, setDisconnectingChannels] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const connectedChannelIds = new Set(connectedChannels.map(ch => ch.channelId));

  useEffect(() => {
    if (isReady) {
      loadAvailableChannels();
    }
  }, [isReady]);

  const loadAvailableChannels = async () => {
    setIsLoadingChannels(true);
    setError(null);
    
    try {
      const result = await slackService.getChannels();
      if (result.success && result.data) {
        setAvailableChannels(result.data.map((ch: any) => ({
          id: ch.id,
          name: ch.name,
          isPrivate: ch.is_private,
          isMember: ch.is_member,
          memberCount: ch.num_members,
        })));
      } else {
        throw new Error(result.error || 'Failed to load channels');
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
      setError(error instanceof Error ? error.message : 'Failed to load channels');
    } finally {
      setIsLoadingChannels(false);
    }
  };

  const handleConnectChannel = async (channel: Channel) => {
    setConnectingChannels(prev => new Set(prev).add(channel.id));
    setError(null);

    try {
      const result = await slackService.connectProjectToChannel(
        projectId,
        channel.id,
        channel.name,
        { enableSync: true, autoJoin: true }
      );

      if (result.success) {
        onChannelConnected?.(channel.id, channel.name);
        // Refresh channels list to update membership status
        if (!channel.isMember && !channel.isPrivate) {
          loadAvailableChannels();
        }
      } else {
        throw new Error(result.error || 'Failed to connect channel');
      }
    } catch (error) {
      console.error('Failed to connect channel:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect channel');
    } finally {
      setConnectingChannels(prev => {
        const newSet = new Set(prev);
        newSet.delete(channel.id);
        return newSet;
      });
    }
  };

  const handleDisconnectChannel = async (connectedChannel: ConnectedChannel) => {
    setDisconnectingChannels(prev => new Set(prev).add(connectedChannel.channelId));
    setError(null);

    try {
      const result = await slackService.disconnectProjectFromChannel(
        projectId,
        connectedChannel.channelId
      );

      if (result.success) {
        onChannelDisconnected?.(connectedChannel.channelId, connectedChannel.channelName);
      } else {
        throw new Error(result.error || 'Failed to disconnect channel');
      }
    } catch (error) {
      console.error('Failed to disconnect channel:', error);
      setError(error instanceof Error ? error.message : 'Failed to disconnect channel');
    } finally {
      setDisconnectingChannels(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectedChannel.channelId);
        return newSet;
      });
    }
  };

  if (!isReady) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 text-center">
          <FiRefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">Checking Connection</h3>
          <p className="text-gray-600">Verifying Slack connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm max-w-2xl mx-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Manage Slack Channels</h3>
            <p className="text-sm text-gray-600">Connect channels to "{projectName}"</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded"
            >
              <FiX className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2">
            <FiAlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Connected Channels */}
      {connectedChannels.length > 0 && (
        <div className="p-6 border-b border-gray-200">
          <h4 className="font-medium text-gray-800 mb-4">
            Connected Channels ({connectedChannels.length})
          </h4>
          <div className="space-y-3">
            {connectedChannels.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <FiHash className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800">#{channel.channelName}</p>
                    <p className="text-xs text-green-600">
                      {channel.connectionHealthy ? 'Active' : 'Connection issues'} • {channel.syncFrequency}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDisconnectChannel(channel)}
                  disabled={disconnectingChannels.has(channel.channelId)}
                  className="px-3 py-1.5 text-red-600 hover:bg-red-100 rounded text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {disconnectingChannels.has(channel.channelId) ? (
                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <FiX className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Channels */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-800">Available Channels</h4>
          <button
            onClick={loadAvailableChannels}
            disabled={isLoadingChannels}
            className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <FiRefreshCw className={`w-4 h-4 ${isLoadingChannels ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {isLoadingChannels ? (
          <div className="text-center py-8">
            <FiRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600">Loading channels...</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {availableChannels
              .filter(channel => !connectedChannelIds.has(channel.id))
              .map((channel) => (
                <div
                  key={channel.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      {channel.isPrivate ? (
                        <FiLock className="w-4 h-4 text-gray-600" />
                      ) : (
                        <FiHash className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">#{channel.name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{channel.isPrivate ? 'Private' : 'Public'}</span>
                        {channel.memberCount && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <FiUsers className="w-3 h-3" />
                              <span>{channel.memberCount} members</span>
                            </div>
                          </>
                        )}
                        {!channel.isMember && (
                          <>
                            <span>•</span>
                            <span className={channel.isPrivate ? "text-orange-600" : "text-blue-600"}>
                              {channel.isPrivate ? "Not a member" : "Will auto-join"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleConnectChannel(channel)}
                    disabled={connectingChannels.has(channel.id)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {connectingChannels.has(channel.id) ? (
                      <FiRefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <FiPlus className="w-4 h-4" />
                    )}
                    {connectingChannels.has(channel.id) ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              ))}
            
            {availableChannels.filter(ch => !connectedChannelIds.has(ch.id)).length === 0 && (
              <div className="text-center py-8">
                <FiCheck className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-gray-600">All available channels are already connected!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};