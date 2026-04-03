"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import {
  createNotificationsBulk,
  deleteNotificationById,
  getNotifications,
  markNotificationAsRead,
  NotificationItem,
} from "@/services/admin-notifications";

export interface Notification {
  notiId: number;
  userId: number;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsContextType {
  notifications: Notification[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addNotification: (
    userId: number | "all",
    message: string,
    allUserIds?: number[]
  ) => Promise<void>;
  markAsRead: (notiId: number) => Promise<void>;
  markAllAsRead: (userId?: number) => Promise<void>;
  deleteNotification: (notiId: number) => Promise<void>;
  getUnreadCount: (userId: number) => number;
  getNotificationsForUser: (userId: number) => Notification[];
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}

const normalizeNotification = (item: NotificationItem): Notification => ({
  notiId: Number(item.notiId),
  userId: Number(item.userId),
  message: item.message ?? "",
  isRead: Boolean(item.isRead),
  createdAt: item.createdAt,
});

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      const res = await getNotifications({ page: 1, pageSize: 1000 });
      setNotifications((res.items ?? []).map(normalizeNotification));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được thông báo");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addNotification = useCallback(
    async (userId: number | "all", message: string, allUserIds: number[] = []) => {
      const targetIds = userId === "all" ? allUserIds : [userId];
      if (!targetIds.length) return;

      await createNotificationsBulk(targetIds, message);
      await refresh();
    },
    [refresh]
  );

  const markAsRead = useCallback(async (notiId: number) => {
    await markNotificationAsRead(notiId);
    setNotifications((prev) =>
      prev.map((n) => (n.notiId === notiId ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(
    async (userId?: number) => {
      const targets = notifications.filter(
        (n) => !n.isRead && (userId === undefined || n.userId === userId)
      );

      if (!targets.length) return;

      await Promise.all(targets.map((n) => markNotificationAsRead(n.notiId)));

      setNotifications((prev) =>
        prev.map((n) =>
          userId === undefined || n.userId === userId
            ? { ...n, isRead: true }
            : n
        )
      );
    },
    [notifications]
  );

  const deleteNotification = useCallback(async (notiId: number) => {
    await deleteNotificationById(notiId);
    setNotifications((prev) => prev.filter((n) => n.notiId !== notiId));
  }, []);

  const getUnreadCount = useCallback(
    (userId: number) =>
      notifications.filter((n) => n.userId === userId && !n.isRead).length,
    [notifications]
  );

  const getNotificationsForUser = useCallback(
    (userId: number) =>
      notifications
        .filter((n) => n.userId === userId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      loading,
      refreshing,
      error,
      refresh,
      addNotification,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      getUnreadCount,
      getNotificationsForUser,
    }),
    [
      notifications,
      loading,
      refreshing,
      error,
      refresh,
      addNotification,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      getUnreadCount,
      getNotificationsForUser,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}