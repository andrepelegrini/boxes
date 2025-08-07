import { useEffect } from 'react';
import { autoJoinEvents } from '../modules/slack/services/SlackService';

export interface AutoJoinNotificationCallbacks {
  onAutoJoinAttempt?: (channelId: string) => void;
  onAutoJoinSuccess?: (channelId: string) => void;
  onAutoJoinFailed?: (channelId: string, error: any) => void;
}

/**
 * Hook to listen for auto-join events and provide user feedback
 */
export function useAutoJoinNotifications(callbacks: AutoJoinNotificationCallbacks) {
  useEffect(() => {
    const handleAutoJoinAttempt = (data: { channelId: string }) => {
      callbacks.onAutoJoinAttempt?.(data.channelId);
    };

    const handleAutoJoinSuccess = (data: { channelId: string }) => {
      callbacks.onAutoJoinSuccess?.(data.channelId);
    };

    const handleAutoJoinFailed = (data: { channelId: string; error: any }) => {
      callbacks.onAutoJoinFailed?.(data.channelId, data.error);
    };

    // Subscribe to events
    autoJoinEvents.on('auto-join-attempt', handleAutoJoinAttempt);
    autoJoinEvents.on('auto-join-success', handleAutoJoinSuccess);
    autoJoinEvents.on('auto-join-failed', handleAutoJoinFailed);

    // Cleanup
    return () => {
      autoJoinEvents.removeListener('auto-join-attempt', handleAutoJoinAttempt);
      autoJoinEvents.removeListener('auto-join-success', handleAutoJoinSuccess);
      autoJoinEvents.removeListener('auto-join-failed', handleAutoJoinFailed);
    };
  }, [callbacks]);
}