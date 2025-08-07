import React, { createContext, useContext, ReactNode } from 'react';

import { useSlackConnection } from '../hooks/useSlackConnection';
import { ConnectionState } from '../modules/slack/services/SlackConnectionManager';

interface SlackGlobalContextType {
  connection: {
    state: ConnectionState;
    actions: {
      configure: (clientId: string, clientSecret: string) => Promise<void>;
      authenticate: () => Promise<void>;
      disconnect: () => Promise<void>;
      reconnect: () => Promise<void>;
      getStatus: () => string;
      loadChannels: () => Promise<void>;
      connectChannel: (channelId: string) => Promise<void>;
      storeCredentials: (clientId: string, clientSecret: string) => Promise<void>;
      startOAuth: () => Promise<void>;
      completeOAuth: (code: string) => Promise<void>;
      deleteCredentials: () => Promise<void>;
    };
  };
  isConnected: boolean;
  isConfigured: boolean;
  isReady: boolean;
  status: string;
}

const SlackGlobalContext = createContext<SlackGlobalContextType | undefined>(undefined);

interface SlackGlobalProviderProps {
  children: ReactNode;
}

export const SlackGlobalProvider: React.FC<SlackGlobalProviderProps> = ({ children }) => {
  const { state, actions, status, isReady } = useSlackConnection();

  const contextValue: SlackGlobalContextType = {
    connection: {
      state,
      actions
    },
    isConnected: state.isConnected,
    isConfigured: state.isConfigured,
    isReady,
    status
  };

  return (
    <SlackGlobalContext.Provider value={contextValue}>
      {children}
    </SlackGlobalContext.Provider>
  );
};

export const useSlackGlobal = () => {
  const context = useContext(SlackGlobalContext);
  if (context === undefined) {
    throw new Error('useSlackGlobal must be used within a SlackGlobalProvider');
  }
  return context;
};

// For backward compatibility
export const useSlack = useSlackGlobal;
