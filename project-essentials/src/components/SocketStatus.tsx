import React from 'react';
import { useSocketContext } from '../contexts/SocketContext';

export function SocketStatus() {
  const {
    isConnected,
    isAuthenticated,
    error,
    reconnectAttempt,
  } = useSocketContext();

  if (!isConnected && !error && reconnectAttempt === 0) {
    return (
      <div className="flex items-center space-x-2 text-gray-500 text-sm">
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span>Connecting...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2 text-red-500 text-sm">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        <span>Connection error</span>
        {reconnectAttempt > 0 && (
          <span className="text-xs">
            (Attempt {reconnectAttempt})
          </span>
        )}
      </div>
    );
  }

  if (isConnected && !isAuthenticated) {
    return (
      <div className="flex items-center space-x-2 text-yellow-500 text-sm">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
        <span>Authenticating...</span>
      </div>
    );
  }

  if (isConnected && isAuthenticated) {
    return (
      <div className="flex items-center space-x-2 text-green-500 text-sm">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span>Real-time connected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-gray-500 text-sm">
      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
      <span>Offline</span>
    </div>
  );
}

interface ConnectionIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function ConnectionIndicator({ 
  size = 'sm', 
  showText = true 
}: ConnectionIndicatorProps) {
  const { isConnected, isAuthenticated, error } = useSocketContext();

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  let color = 'bg-gray-400';
  let text = 'Offline';
  let shouldPulse = false;

  if (error) {
    color = 'bg-red-500';
    text = 'Error';
    shouldPulse = true;
  } else if (isConnected && isAuthenticated) {
    color = 'bg-green-500';
    text = 'Online';
  } else if (isConnected) {
    color = 'bg-yellow-500';
    text = 'Connecting';
    shouldPulse = true;
  }

  return (
    <div className="flex items-center space-x-2">
      <div 
        className={`${sizeClasses[size]} ${color} rounded-full ${shouldPulse ? 'animate-pulse' : ''}`}
      />
      {showText && (
        <span className={`${textSizeClasses[size]} text-gray-600 dark:text-gray-300`}>
          {text}
        </span>
      )}
    </div>
  );
}