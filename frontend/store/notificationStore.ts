import { create } from "zustand";

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  timestamp: string;
  read: boolean;
  ticketId?: string;
}

interface NotificationState {
  notifications: SystemNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<SystemNotification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [
    {
      id: "notif-1",
      title: "Urgent Escalation Alert",
      message: "AI chatbot auto-escalated ticket #ticket_123 (EcoStyle) due to high negative sentiment.",
      type: "warning",
      timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      read: false,
      ticketId: "ticket_123"
    },
    {
      id: "notif-2",
      title: "New Customer Enquiry",
      message: "customer@gmail.com opened a ticket: 'coupon discount checks'",
      type: "info",
      timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      read: true,
      ticketId: "ticket_123"
    }
  ],
  unreadCount: 1,
  addNotification: (notification) =>
    set((state) => {
      const newNotif: SystemNotification = {
        ...notification,
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString(),
        read: false,
      };
      const updated = [newNotif, ...state.notifications];
      return {
        notifications: updated,
        unreadCount: state.unreadCount + 1,
      };
    }),
  markAsRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      const unread = updated.filter((n) => !n.read).length;
      return {
        notifications: updated,
        unreadCount: unread,
      };
    }),
  markAllAsRead: () =>
    set((state) => {
      const updated = state.notifications.map((n) => ({ ...n, read: true }));
      return {
        notifications: updated,
        unreadCount: 0,
      };
    }),
  clearNotifications: () =>
    set({
      notifications: [],
      unreadCount: 0,
    }),
}));
