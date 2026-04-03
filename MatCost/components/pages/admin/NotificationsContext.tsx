"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createNotifications,
  deleteNotificationById,
  getNotifications,
  markNotificationAsRead,
  NotificationCreateResult,
  NotificationItem,
} from "@/services/admin-notifications";

export interface Notification {
  notiId: number;
  userId: number;
  message: string;
  relatedEntityType?: string | null;
  relatedEntityId?: number | null;
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
  ) => Promise<NotificationCreateResult>;
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
  relatedEntityType: item.relatedEntityType ?? null,
  relatedEntityId:
    item.relatedEntityId === undefined || item.relatedEntityId === null
      ? null
      : Number(item.relatedEntityId),
  isRead: Boolean(item.isRead),
  createdAt: item.createdAt,
});

const emptyCreateResult: NotificationCreateResult = {
  sentCount: 0,
  notificationIds: [],
  emailRequested: true,
  emailConfigured: false,
  emailSentCount: 0,
  emailMissingAddressCount: 0,
  emailFailedCount: 0,
};

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
    async (
      userId: number | "all",
      message: string,
      allUserIds: number[] = []
    ): Promise<NotificationCreateResult> => {
      const isAll = userId === "all";

      if (isAll && !allUserIds.length) {
        return emptyCreateResult;
      }

      const result = await createNotifications({
        targetMode: isAll ? "all" : "single",
        userId: isAll ? undefined : userId,
        message,
        sendEmail: true,
      });

      await refresh();
      return result;
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
