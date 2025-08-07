import { useState, useEffect } from 'react';
import { FiHash, FiLock, FiUsers, FiLoader, FiCheck, FiX, FiSearch, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';
import { useSlack as useSlackGlobal } from '../../contexts';

interface SlackChannelSelectorProps {
  projectId: string;
  projectName?: string;
  onChannelConnected?: (channelId: string, channelName: string) => void;
  onClose?: () => void;
}

interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
  num_members?: number;
  purpose?: { value: string };
  topic?: { value: string };
}

export function SlackChannelSelector({ 
  projectId,
  projectName,
  onChannelConnected,
  onClose 
}: SlackChannelSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingChannelId, setConnectingChannelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState(15);

  const { connection, services, isConnected, isConfigured, actions } = useSlackGlobal();
  const { state } = connection;

  // Load channels when component mounts
  useEffect(() => {
    if (isConfigured && isConnected) {
      // Use services.slack to load channels
      // This will need to be implemented in the service
    }
  }, [isConfigured, isConnected]);

  // Filter channels from connection state
  const filteredChannels = (state.channels || []).filter((channel: any) => 
    channel.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChannelSelect = async (channel: SlackChannel) => {
    if (isConnecting) return;

    setIsConnecting(true);
    setConnectingChannelId(channel.id);
    setError(null);

    try {
      // Connect the project to the channel with selected frequency
      await services.slack.connectProjectToChannel(projectId, channel.id, channel.name, { syncIntervalMinutes: selectedFrequency });
      
      // Call the callback
      if (onChannelConnected) {
        onChannelConnected(channel.id, channel.name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to channel');
    } finally {
      setIsConnecting(false);
      setConnectingChannelId(null);
    }
  };

  const handleRefresh = () => {
    actions.loadChannels();
  };

  const getChannelIcon = (channel: SlackChannel) => {
    if (channel.is_private) return <FiLock className="w-4 h-4 text-yellow-600" />;
    return <FiHash className="w-4 h-4 text-gray-600" />;
  };

  if (state.loading.channels) {
    return (
      <div className="p-6 bg-white rounded-lg shadow max-w-2xl mx-auto">
        <div className="text-center py-8">
          <FiLoader className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Loading Channels</h3>
          <p className="text-gray-600">Fetching available Slack channels...</p>
        </div>
      </div>
    );
  }

  if (state.connectionStatus !== 'connected') {
    return (
      <div className="p-6 bg-white rounded-lg shadow max-w-2xl mx-auto">
        <div className="text-center py-8">
          <FiX className="w-8 h-8 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Not Connected</h3>
          <p className="text-gray-600 mb-4">Please configure your Slack connection first.</p>
          {onClose && (
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Select Slack Channel</h3>
          {projectName && (
            <p className="text-sm text-gray-600">for project: {projectName}</p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={state.loading.channels}
          className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          title="Refresh channels"
        >
          <FiRefreshCw className={`w-4 h-4 ${state.loading.channels ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search channels..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Sync Frequency Selector */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Message Fetch Frequency
        </label>
        <select
          value={selectedFrequency}
          onChange={(e) => setSelectedFrequency(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={5}>Every 5 minutes</option>
          <option value={15}>Every 15 minutes (default)</option>
          <option value={30}>Every 30 minutes</option>
          <option value={60}>Every 1 hour</option>
          <option value={120}>Every 2 hours</option>
          <option value={240}>Every 4 hours</option>
          <option value={480}>Every 8 hours</option>
          <option value={1440}>Daily</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          How often new messages should be fetched from this channel
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center">
          <FiAlertTriangle className="text-red-600 mr-2 flex-shrink-0" />
          <span className="text-sm text-red-800">{error}</span>
        </div>
      )}

      {/* Channel List */}
      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
        {filteredChannels.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FiHash className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{searchTerm ? 'No channels match your search' : 'No channels available'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredChannels.map((channel: any) => (
              <div
                key={channel.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    {getChannelIcon(channel)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900 truncate">
                          {channel.name}
                        </h4>
                        {channel.is_private && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            Private
                          </span>
                        )}
                        {!channel.is_member && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            Not a member
                          </span>
                        )}
                      </div>
                      
                      {(channel.purpose?.value || channel.topic?.value) && (
                        <p className="text-sm text-gray-600 mt-1 truncate">
                          {channel.purpose?.value || channel.topic?.value}
                        </p>
                      )}
                      
                      {channel.num_members && (
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <FiUsers className="w-3 h-3 mr-1" />
                          {channel.num_members} member{channel.num_members === 1 ? '' : 's'}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleChannelSelect({ ...channel, is_private: !!channel.is_private })}
                    disabled={isConnecting || (!channel.is_member && channel.is_private)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isConnecting && connectingChannelId === channel.id ? (
                      <>
                        <FiLoader className="animate-spin mr-2 w-4 h-4" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <FiCheck className="mr-2 w-4 h-4" />
                        Connect
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-6">
        <p className="text-xs text-gray-500">
          {filteredChannels.length} channel{filteredChannels.length === 1 ? '' : 's'} available
        </p>
        <div className="space-x-3">
          {onClose && (
            <button 
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SlackChannelSelector;