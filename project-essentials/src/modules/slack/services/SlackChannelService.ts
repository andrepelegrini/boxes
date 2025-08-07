// Simple Slack Channel Service - Direct implementation without complex wrappers

import { SlackChannel } from '../../../utils/slackCredentials';
import { getSlackCredentialsSecure } from '../../../utils/slackCredentialsSecure';
import { invoke } from '../../../utils/tauri';

// Simple event emitter for auto-join notifications
class AutoJoinEventEmitter {
  private listeners: { [key: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}

export const autoJoinEvents = new AutoJoinEventEmitter();

export class SlackChannelService {
  // Circuit breaker for rate limiting
  private static rateLimitedChannels = new Set<string>();
  private static rateLimitResetTimes = new Map<string, number>();
  /**
   * Get all channels the user has access to
   */
  static async getAccessibleChannels(): Promise<SlackChannel[]> {
    try {
      const credentials = await getSlackCredentialsSecure();
      if (!credentials) {
        throw new Error('No Slack credentials found');
      }
      
      if (!credentials.accessToken) {
        throw new Error('No Slack access token found');
      }

      const result = await invoke('slack_list_channels', { 
        accessToken: credentials.accessToken 
      });
      return result.channels || [];
    } catch (error) {
      console.error('Failed to get accessible channels:', error);
      // Check if it's a token-related error and provide guidance
      if (error instanceof Error && error.message.includes('access token')) {
        console.error('Slack access token missing or invalid. Please reconfigure Slack credentials.');
      }
      return [];
    }
  }

  /**
   * Get all channels with basic filtering
   */
  static async getAllChannels(): Promise<SlackChannel[]> {
    return this.getAccessibleChannels();
  }

  /**
   * Get channels (alias for getAccessibleChannels for compatibility)
   */
  static async getChannels(): Promise<{ success: boolean; data: SlackChannel[]; error?: string }> {
    try {
      const channels = await this.getAccessibleChannels();
      return {
        success: true,
        data: channels
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Join a specific channel
   */
  static async joinChannel(channelId: string): Promise<boolean> {
    try {
      const credentials = await getSlackCredentialsSecure();
      if (!credentials?.accessToken) {
        throw new Error('No Slack access token found');
      }

      await invoke('slack_join_channel', { 
        accessToken: credentials.accessToken,
        channelId: channelId 
      });
      autoJoinEvents.emit('channel_joined', { channelId });
      return true;
    } catch (error) {
      console.error('Failed to join channel:', error);
      return false;
    }
  }

  /**
   * Leave a specific channel
   */
  static async leaveChannel(channelId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log(`Leaving channel ${channelId} - not implemented in backend yet`);
      return {
        success: false,
        error: 'Leave channel functionality not implemented yet'
      };
    } catch (error) {
      console.error('Failed to leave channel:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get information about a specific channel
   */
  static async getChannelInfo(channelId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log(`Getting channel info for ${channelId} - not implemented in backend yet`);
      return {
        success: false,
        error: 'Get channel info functionality not implemented yet'
      };
    } catch (error) {
      console.error('Failed to get channel info:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clear channel cache
   */
  static clearCache(): void {
    // This method clears any cached channel data
    // For now, it's a no-op as we don't have persistent cache in this service
    console.log('SlackChannelService cache cleared');
  }

  /**
   * Test access to a channel
   */
  static async testChannelAccess(channelId: string): Promise<boolean> {
    try {
      const channels = await this.getAccessibleChannels();
      return channels.some(channel => channel.id === channelId);
    } catch (error) {
      console.error('Failed to test channel access:', error);
      return false;
    }
  }

  /**
   * Fetch messages from a channel with circuit breaker
   */
  static async fetchChannelMessages(channelId: string, limit = 100, oldest?: string): Promise<any[]> {
    // Check circuit breaker
    const now = Date.now();
    const resetTime = this.rateLimitResetTimes.get(channelId);
    
    if (this.rateLimitedChannels.has(channelId) && resetTime && now < resetTime) {
      const waitTime = Math.ceil((resetTime - now) / 1000);
      console.warn(`⚡ [CIRCUIT_BREAKER] Channel ${channelId} is rate limited, skipping for ${waitTime}s`);
      return [];
    }

    // Reset circuit breaker if time has passed
    if (resetTime && now >= resetTime) {
      this.rateLimitedChannels.delete(channelId);
      this.rateLimitResetTimes.delete(channelId);
      console.log(`✅ [CIRCUIT_BREAKER] Channel ${channelId} rate limit reset`);
    }

    try {
      const credentials = await getSlackCredentialsSecure();
      if (!credentials?.accessToken) {
        throw new Error('No Slack access token found');
      }

      const result = await invoke('slack_fetch_messages', { 
        channelId: channelId, 
        limit,
        accessToken: credentials.accessToken,
        oldestTimestamp: oldest ? parseFloat(oldest) : undefined
      });
      return result.messages || [];
    } catch (error) {
      console.error('Failed to fetch channel messages:', error);
      
      // Handle rate limiting with circuit breaker
      if (error instanceof Error && error.message.includes('Rate limited')) {
        const backoffTime = 5 * 60 * 1000; // 5 minutes backoff
        this.rateLimitedChannels.add(channelId);
        this.rateLimitResetTimes.set(channelId, now + backoffTime);
        console.warn(`🚫 [CIRCUIT_BREAKER] Channel ${channelId} rate limited, backing off for 5 minutes`);
      }
      
      return [];
    }
  }

  /**
   * Fetch all messages from a channel with pagination
   */
  static async fetchAllChannelMessages(channelId: string): Promise<any[]> {
    try {
      const credentials = await getSlackCredentialsSecure();
      if (!credentials?.accessToken) {
        throw new Error('No Slack access token found');
      }

      const result = await invoke('slack_fetch_messages_paginated', { 
        channelId: channelId,
        accessToken: credentials.accessToken
      });
      return result.messages || [];
    } catch (error) {
      console.error('Failed to fetch all channel messages:', error);
      return [];
    }
  }
}