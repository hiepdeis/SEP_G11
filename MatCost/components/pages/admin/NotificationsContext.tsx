"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
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
const POLL_INTERVAL_MS = 10000;
const HAS_TIMEZONE_SUFFIX = /(?:[zZ]|[+-]\d{2}:\d{2})$/;

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }

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
  createdAt: normalizeNotificationCreatedAt(item.createdAt),
});

function normalizeNotificationCreatedAt(value: string | null | undefined) {
  const raw = value?.trim();

  if (!raw) {
    return new Date().toISOString();
  }

  const normalized = HAS_TIMEZONE_SUFFIX.test(raw) ? raw : `${raw}Z`;
  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString();
}

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
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const isRefreshingRef = useRef(false);

  const refreshNotifications = useCallback(async (silent = false) => {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;

    try {
      if (!silent) {
        if (hasLoadedOnceRef.current) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);
      }

      const res = await getNotifications({ page: 1, pageSize: 1000 });
      setNotifications((res.items ?? []).map(normalizeNotification));

      if (!silent || !hasLoadedOnceRef.current) {
        setError(null);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Khong tai duoc thong bao";

      if (!silent || !hasLoadedOnceRef.current) {
        setError(message);
      } else {
        console.error("Failed to refresh notifications", err);
      }
    } finally {
      hasLoadedOnceRef.current = true;
      isRefreshingRef.current = false;

      if (!silent) {
        setRefreshing(false);
      }

      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await refreshNotifications(false);
  }, [refreshNotifications]);

  useEffect(() => {
    void refreshNotifications(hasLoadedOnceRef.current);
  }, [pathname, refreshNotifications]);

  useEffect(() => {
    const refreshSilently = () => {
      if (document.visibilityState !== "visible") return;
      void refreshNotifications(true);
    };

    const intervalId = window.setInterval(refreshSilently, POLL_INTERVAL_MS);

    window.addEventListener("focus", refreshSilently);
    document.addEventListener("visibilitychange", refreshSilently);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshSilently);
      document.removeEventListener("visibilitychange", refreshSilently);
    };
  }, [refreshNotifications]);

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
