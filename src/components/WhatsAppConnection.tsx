import React, { useState, useEffect } from 'react';
import { useWhatsApp } from '../contexts/WhatsAppContext';
import { Loader2, MessageSquare, AlertCircle, CheckCircle, Phone, PhoneOff, Play, Pause, RefreshCw, Settings } from 'lucide-react';

export const WhatsAppConnection: React.FC = () => {
  const {
    connectionState,
    isConnected,
    isConnecting,
    isMonitoring,
    qrCode,
    connect,
    disconnect,
    startMonitoring,
    refetchMessages,
    checkLogin,
    error,
    isActivelyFetching,
  } = useWhatsApp();

  const [isProcessing, setIsProcessing] = useState(false);
  const [lookbackDays, setLookbackDays] = useState(7);
  const [showLookbackSettings, setShowLookbackSettings] = useState(false);

  // Log connection state changes
  useEffect(() => {
    // Logging disabled - Connection state changed
  }, [connectionState, isConnected, isConnecting, isMonitoring, qrCode, error]);

  const handleConnect = async () => {
    // Logging disabled - Connect button clicked
    setIsProcessing(true);
    try {
      // Logging disabled - Calling connect function with lookback days
      await connect(lookbackDays);
      // Logging disabled - Connect function completed successfully
    } catch (err) {
      // Logging disabled - Connect function failed
      // Error is handled by context
    } finally {
      setIsProcessing(false);
      // Logging disabled - Connect process finished
    }
  };

  const handleDisconnect = async () => {
    // Logging disabled - Disconnect button clicked
    setIsProcessing(true);
    try {
      // Logging disabled - Calling disconnect function
      await disconnect();
      // Logging disabled - Disconnect function completed successfully
    } catch (err) {
      // Logging disabled - Disconnect function failed
      // Error is handled by context
    } finally {
      setIsProcessing(false);
      // Logging disabled - Disconnect process finished
    }
  };

  const handleStartMonitoring = async () => {
    // Logging disabled - Start monitoring button clicked
    setIsProcessing(true);
    try {
      // Logging disabled - Calling startMonitoring function
      await startMonitoring();
      // Logging disabled - StartMonitoring function completed successfully
    } catch (err) {
      // Logging disabled - StartMonitoring function failed
      // Error is handled by context
    } finally {
      setIsProcessing(false);
      // Logging disabled - Start monitoring process finished
    }
  };

  const handleRefetchMessages = async () => {
    // Logging disabled - Refetch messages button clicked
    setIsProcessing(true);
    try {
      // Logging disabled - Calling refetchMessages function
      await refetchMessages();
      // Logging disabled - RefetchMessages function completed successfully
    } catch (err) {
      // Logging disabled - RefetchMessages function failed
      // Error is handled by context
    } finally {
      setIsProcessing(false);
      // Logging disabled - Refetch messages process finished
    }
  };

  const handleCheckLogin = async () => {
    // Logging disabled - Check login button clicked
    setIsProcessing(true);
    try {
      // Logging disabled - Calling checkLogin function
      await checkLogin();
      // Logging disabled - CheckLogin function completed successfully
    } catch (err) {
      // Logging disabled - CheckLogin function failed
      // Error is handled by context
    } finally {
      setIsProcessing(false);
      // Logging disabled - Check login process finished
    }
  };

  const getStatusIcon = () => {
    if (isConnecting || isProcessing) {
      return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
    }
    
    if (isMonitoring) {
      return <Play className="w-5 h-5 text-green-500" />;
    }
    
    if (isConnected || isActivelyFetching) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    
    if (typeof connectionState.status === 'object' && 'Error' in connectionState.status) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    
    return <PhoneOff className="w-5 h-5 text-gray-400" />;
  };

  const getStatusText = () => {
    if (isMonitoring) return 'Monitoring Messages';
    if (isConnected && connectionState.connected_since) return 'Connected (Persistent Session)';
    if (isConnected) return 'Connected';
    if (isActivelyFetching) return 'Connected (Fetching Messages)';
    if (isConnecting) return 'Connecting with existing session...';
    if (connectionState.status === 'QrCodeReady') return 'Scan QR Code';
    if (typeof connectionState.status === 'object' && 'Error' in connectionState.status) {
      return `Error: ${connectionState.status.Error}`;
    }
    return 'Disconnected';
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getHealthStatusColor = () => {
    const health = connectionState.health_status;
    const now = Date.now() / 1000;
    const timeSinceHeartbeat = now - health.last_heartbeat;
    
    if (timeSinceHeartbeat > 300) return 'text-red-500'; // 5 minutes
    if (timeSinceHeartbeat > 120) return 'text-yellow-500'; // 2 minutes
    return 'text-green-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MessageSquare className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">WhatsApp Integration</h3>
            <p className="text-sm text-gray-600">Real-time message monitoring and task discovery</p>
          </div>
        </div>
        {getStatusIcon()}
      </div>

      {/* Connection Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Status</span>
          <span className={`text-sm font-medium ${
            isMonitoring ? 'text-green-600' : 
            isConnected || isActivelyFetching ? 'text-blue-600' : 
            isConnecting ? 'text-yellow-600' : 'text-gray-500'
          }`}>
            {getStatusText()}
          </span>
        </div>

        {connectionState.connected_since && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Connected Since</span>
            <span className="text-sm text-gray-600">
              {formatTimestamp(connectionState.connected_since)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Messages Captured</span>
          <span className="text-sm text-gray-600">{connectionState.message_count}</span>
        </div>

        {connectionState.last_message_timestamp && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Last Message</span>
            <span className="text-sm text-gray-600">
              {formatTimestamp(connectionState.last_message_timestamp)}
            </span>
          </div>
        )}
      </div>

      {/* QR Code Display */}
      {connectionState.status === 'QrCodeReady' && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="text-center space-y-3">
            <h4 className="font-medium text-gray-900">Scan QR Code with WhatsApp</h4>
            {qrCode ? (
              <div className="flex justify-center">
                <img 
                  src={qrCode} 
                  alt="WhatsApp QR Code" 
                  className="w-48 h-48 border border-gray-300 rounded"
                  onError={(e) => {
                    // Logging disabled - QR Code image failed to load
                  }}
                  onLoad={() => {
                    // Logging disabled - QR Code image loaded successfully
                  }}
                />
              </div>
            ) : (
              <div className="flex justify-center items-center w-48 h-48 border border-gray-300 rounded bg-gray-100">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Loading QR Code...</p>
                </div>
              </div>
            )}
            <p className="text-sm text-gray-600">
              Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
            </p>
            {/* Check Login Button */}
            <button
              onClick={handleCheckLogin}
              disabled={isProcessing}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed mt-3"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>Check if Scanned</span>
            </button>
            {/* Debug info */}
            <div className="text-xs text-gray-400 mt-2">
              QR Status: {qrCode ? `Present (${qrCode.length} chars)` : 'Missing'}
            </div>
          </div>
        </div>
      )}

      {/* Health Status */}
      {isMonitoring && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-3">Health Status</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Heartbeat</span>
              <span className={`text-sm font-medium ${getHealthStatusColor()}`}>
                {connectionState.health_status.last_heartbeat > 0 ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Consecutive Failures</span>
              <span className="text-sm text-gray-600">
                {connectionState.health_status.consecutive_failures}
              </span>
            </div>
            {connectionState.health_status.gap_count > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Message Gaps</span>
                <span className="text-sm text-yellow-600">
                  {connectionState.health_status.gap_count}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="border border-red-200 rounded-lg p-4 bg-red-50">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900">Connection Error</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}


      {/* Lookback Settings */}
      {!isConnected && !isActivelyFetching && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Message History Settings</h4>
            <button
              onClick={() => setShowLookbackSettings(!showLookbackSettings)}
              className="text-blue-600 hover:text-blue-700"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          
          {showLookbackSettings ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fetch messages from the last:
                </label>
                <select
                  value={lookbackDays}
                  onChange={(e) => setLookbackDays(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={7}>7 days (1 week)</option>
                  <option value={14}>14 days (2 weeks)</option>
                  <option value={30}>30 days (1 month)</option>
                  <option value={90}>90 days (3 months)</option>
                </select>
              </div>
              <p className="text-xs text-gray-600">
                This determines how far back to fetch historical messages when connecting for the first time.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Will fetch messages from the last <strong>{lookbackDays} days</strong>
              <button
                onClick={() => setShowLookbackSettings(true)}
                className="ml-2 text-blue-600 hover:text-blue-700 underline"
              >
                Change
              </button>
            </p>
          )}
        </div>
      )}

      {/* Message Management for Connected State */}
      {(isConnected || isActivelyFetching) && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-3">Message Management</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fetch messages from the last:
              </label>
              <select
                value={lookbackDays}
                onChange={(e) => setLookbackDays(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value={1}>1 day</option>
                <option value={3}>3 days</option>
                <option value={7}>7 days (1 week)</option>
                <option value={14}>14 days (2 weeks)</option>
                <option value={30}>30 days (1 month)</option>
                <option value={90}>90 days (3 months)</option>
              </select>
            </div>
            <button
              onClick={() => {
                setIsProcessing(true);
                refetchMessages(lookbackDays).finally(() => setIsProcessing(false));
              }}
              disabled={isProcessing}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>Refetch Messages</span>
            </button>
            <p className="text-xs text-gray-600">
              Fetch all messages from the last {lookbackDays} days to discover tasks and updates
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3">
        {!isConnected && !isActivelyFetching ? (
          <button
            onClick={handleConnect}
            disabled={isProcessing || isConnecting}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Phone className="w-4 h-4" />
            )}
            <span>Connect WhatsApp</span>
          </button>
        ) : (
          <>
            {!isMonitoring ? (
              <button
                onClick={handleStartMonitoring}
                disabled={isProcessing}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>Start Monitoring</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                <Play className="w-4 h-4" />
                <span>Monitoring Active</span>
              </div>
            )}
            
            <button
              onClick={handleDisconnect}
              disabled={isProcessing}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PhoneOff className="w-4 h-4" />
              )}
              <span>Disconnect</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};