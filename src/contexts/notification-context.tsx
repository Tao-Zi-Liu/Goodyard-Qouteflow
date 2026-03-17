"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { AppNotification } from '@/lib/types';
import { useI18n } from '@/hooks/use-i18n';
import {
  collection, addDoc, updateDoc, doc, query,
  where, onSnapshot, serverTimestamp, writeBatch, getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  createNotification: (data: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t, isLoaded } = useI18n();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const prevNotifIds = useRef<Set<string>>(new Set());

  // ── Request desktop notification permission ───────────────────────────────
  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  useEffect(() => { requestPermission(); }, [requestPermission]);

  // ── Show desktop notification ─────────────────────────────────────────────
  const showDesktopNotification = useCallback((notification: AppNotification) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    new Notification(t(notification.titleKey), {
      body: t(notification.bodyKey, notification.bodyParams),
      icon: '/favicon.ico',
    });
  }, [t]);

  // ── Listen to Firestore notifications for current user ───────────────────
  useEffect(() => {
    if (!user?.id || !db) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: AppNotification[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toMillis?.() || d.data().createdAt || Date.now(),
      })) as AppNotification[];

      // Sort newest first
      notifs.sort((a, b) => b.createdAt - a.createdAt);
      setNotifications(notifs);

      // Show desktop notification for newly arrived unread notifications
      if (isLoaded) {
        notifs.forEach(n => {
          if (!n.read && !prevNotifIds.current.has(n.id)) {
            showDesktopNotification(n);
          }
        });
      }

      // Update seen IDs
      prevNotifIds.current = new Set(notifs.map(n => n.id));
    });

    return () => unsubscribe();
  }, [user?.id, isLoaded, showDesktopNotification]);

  // ── Create notification (writes to Firestore) ─────────────────────────────
  const createNotification = useCallback(async (
    data: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
  ) => {
    if (!db) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        ...data,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }, []);

  // ── Mark single notification as read ─────────────────────────────────────
  const markAsRead = useCallback(async (id: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // ── Mark all notifications as read ───────────────────────────────────────
  const markAllAsRead = useCallback(async () => {
    if (!db || !user?.id) return;
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', user.id),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => batch.update(d.ref, { read: true }));
      await batch.commit();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [user?.id]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const value = {
    notifications,
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