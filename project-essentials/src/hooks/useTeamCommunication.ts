import { useState, useCallback } from 'react';
import { useSlack as useSlackGlobal } from '../contexts';

export interface TeamCommunicationState {
  messages: any[];
  isLoading: boolean;
  error: string | null;
}

export interface TeamCommunicationActions {
  sendMessage: (channelId: string, message: string) => Promise<void>;
  refreshMessages: (channelId: string) => Promise<void>;
  clearError: () => void;
}

export function useTeamCommunication(): TeamCommunicationState & TeamCommunicationActions {
  const { services } = useSlackGlobal();
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (channelId: string, message: string) => {
    setIsLoading(true);
    try {
      await services.slack.sendMessage(channelId, message);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [services.slack]);

  const refreshMessages = useCallback(async (channelId: string) => {
    setIsLoading(true);
    try {
      const fetchedMessages = await services.slack.getChannelMessages(channelId);
      setMessages(fetchedMessages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh messages');
    } finally {
      setIsLoading(false);
    }
  }, [services.slack]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    refreshMessages,
    clearError
  };
}