
"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { AppNotification } from '@/lib/types';
import { useI18n } from '@/hooks/use-i18n';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  createNotification: (data: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const NotificationContext = createContext<NotificationContextType | null>(null);

const NOTIFICATIONS_STORAGE_KEY = 'app-notifications';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t, isLoaded } = useI18n();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    try {
      const storedNotifications = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (storedNotifications) {
        setNotifications(JSON.parse(storedNotifications));
      }
    } catch (error) {
      console.error("Failed to parse notifications from localStorage", error);
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log("This browser does not support desktop notification");
      return;
    }
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  const showDesktopNotification = useCallback((notification: AppNotification) => {
    if (Notification.permission === 'granted') {
       new Notification(t(notification.titleKey), {
        body: t(notification.bodyKey, notification.bodyParams),
        icon: '/favicon.ico', // Optional: add an icon
      });
    }
  }, [t]);

  const createNotification = useCallback((data: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: AppNotification = {
      ...data,
      id: `notif-${Date.now()}`,
      createdAt: Date.now(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev]);

    // Show desktop notification only if the recipient is the current user
    if (user?.id === data.recipientId) {
        // Wait for translation to be loaded
        if(isLoaded) {
            showDesktopNotification(newNotification);
        } else {
            // A simple retry mechanism if translations are not yet loaded
            setTimeout(() => showDesktopNotification(newNotification), 500);
        }
    }
  }, [showDesktopNotification, user, isLoaded]);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const userNotifications = notifications.filter(n => n.recipientId === user?.id);
  const unreadCount = userNotifications.filter(n => !n.read).length;

  const value = {
    notifications: userNotifications,
    unreadCount,
    createNotification,
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
