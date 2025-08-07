/**
 * React hook for Slack connection management
 * Provides persistent connection state and actions
 */

import React from 'react';
import { slackConnectionManager, ConnectionState } from '../modules/slack/services/SlackConnectionManager';

export function useSlackConnection() {
  const [state, setState] = React.useState<ConnectionState>(slackConnectionManager.getState());

  React.useEffect(() => {
    const unsubscribe = slackConnectionManager.subscribe(setState);
    return unsubscribe;
  }, []);

  const actions = React.useMemo(() => ({
    configure: slackConnectionManager.configure.bind(slackConnectionManager),
    authenticate: slackConnectionManager.authenticate.bind(slackConnectionManager),
    disconnect: slackConnectionManager.disconnect.bind(slackConnectionManager),
    reconnect: slackConnectionManager.reconnect.bind(slackConnectionManager),
    getStatus: slackConnectionManager.getStatus.bind(slackConnectionManager),
    loadChannels: slackConnectionManager.loadChannels.bind(slackConnectionManager),
    connectChannel: slackConnectionManager.connectChannel.bind(slackConnectionManager),
    // Legacy compatibility methods
    storeCredentials: slackConnectionManager.configure.bind(slackConnectionManager),
    startOAuth: slackConnectionManager.authenticate.bind(slackConnectionManager),
    completeOAuth: (code: string) => 
      slackConnectionManager.completeAuthentication(code),
    deleteCredentials: slackConnectionManager.disconnect.bind(slackConnectionManager),
  }), []);

  return { 
    state, 
    actions, 
    status: slackConnectionManager.getStatus(),
    isReady: slackConnectionManager.isReady()
  };
}