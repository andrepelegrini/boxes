import { useState, useCallback } from 'react';

export interface SlackNotification {
  id: string;
  type: 'message' | 'mention' | 'update';
  content: string;
  timestamp: string;
  isRead: boolean;
  projectId?: string;
  channelId?: string;
}

export interface SlackNotificationSettings {
  enabled: boolean;
  mentions: boolean;
  directMessages: boolean;
  updates: boolean;
  sound: boolean;
}

export interface UseSlackNotificationsReturn {
  notifications: SlackNotification[];
  settings: SlackNotificationSettings;
  unreadCount: number;
  updateSettings: (settings: Partial<SlackNotificationSettings>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<SlackNotification, 'id'>) => void;
}

export function useSlackNotifications(): UseSlackNotificationsReturn {
  const [notifications, setNotifications] = useState<SlackNotification[]>([]);
  const [settings, setSettings] = useState<SlackNotificationSettings>({
    enabled: true,
    mentions: true,
    directMessages: true,
    updates: false,
    sound: true,
  });

  const updateSettings = useCallback((newSettings: Partial<SlackNotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, isRead: true }
          : notif
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  }, []);

  const addNotification = useCallback((notification: Omit<SlackNotification, 'id'>) => {
    const newNotification: SlackNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const unreadCount = notifications.filter(notif => !notif.isRead).length;

  return {
    notifications,
    settings,
    unreadCount,
    updateSettings,
    markAsRead,
    markAllAsRead,
    addNotification,
  };
}