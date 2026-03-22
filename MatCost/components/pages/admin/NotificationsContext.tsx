"use client";
import { createContext, useContext, useState, ReactNode } from "react";

// Matches DB: Notifications table
export interface Notification {
  notiId: number;
  userId: number;         // FK → Users.UserID
  message: string;        // nvarchar(500)
  isRead: boolean;        // bit
  createdAt: string;      // datetime
}

interface NotificationsContextType {
  notifications: Notification[];
  addNotification: (userId: number | "all", message: string, allUserIds?: number[]) => void;
  markAsRead: (notiId: number) => void;
  markAllAsRead: (userId: number) => void;
  deleteNotification: (notiId: number) => void;
  getUnreadCount: (userId: number) => number;
  getNotificationsForUser: (userId: number) => Notification[];
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();

const initialNotifications: Notification[] = [
  { notiId: 1,  userId: 1, message: "Phiên đăng nhập mới từ thiết bị lạ. Vui lòng kiểm tra bảo mật tài khoản.", isRead: true,  createdAt: daysAgo(3) },
  { notiId: 2,  userId: 2, message: "Yêu cầu nhập kho #RC-2026-0031 đang chờ bạn phê duyệt.", isRead: false, createdAt: daysAgo(1) },
  { notiId: 3,  userId: 3, message: "Vật tư MT-005 sắp hết tồn kho. Số lượng hiện tại: 12 cuộn.", isRead: false, createdAt: hoursAgo(6) },
  { notiId: 4,  userId: 4, message: "Đã hoàn tất đối chiếu công nợ tháng 2/2026. Vui lòng xác nhận.", isRead: false, createdAt: hoursAgo(3) },
  { notiId: 5,  userId: 2, message: "Phiếu xuất kho IS-2026-0018 đã được kế toán duyệt.", isRead: true,  createdAt: daysAgo(2) },
  { notiId: 6,  userId: 1, message: "Hệ thống sẽ bảo trì từ 22:00 đến 23:00 ngày 20/03/2026.", isRead: false, createdAt: hoursAgo(1) },
  { notiId: 7,  userId: 5, message: "Báo cáo tồn kho tháng 2/2026 đã sẵn sàng. Nhấp để tải xuống.", isRead: true,  createdAt: daysAgo(4) },
  { notiId: 8,  userId: 6, message: "Phiếu nhập kho RC-2026-0029 cần bổ sung chứng từ hoá đơn.", isRead: false, createdAt: hoursAgo(8) },
  { notiId: 9,  userId: 3, message: "Lịch kiểm kê kho A được lên kế hoạch vào ngày 25/03/2026.", isRead: true,  createdAt: daysAgo(1) },
  { notiId: 10, userId: 1, message: "Người dùng mới 'giang.dt' đã được thêm vào hệ thống.", isRead: false, createdAt: hoursAgo(2) },
  { notiId: 11, userId: 8, message: "Bạn được phân công vào nhóm kiểm kê Kho B (StockTake #ST-012).", isRead: false, createdAt: hoursAgo(4) },
  { notiId: 12, userId: 2, message: "Tồn kho MT-012 vượt mức an toàn. Cần xem xét điều chuyển.", isRead: false, createdAt: hoursAgo(10) },
];

let nextId = 13;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const addNotification = (userId: number | "all", message: string, allUserIds: number[] = []) => {
    const targets = userId === "all" ? allUserIds : [userId];
    const now = new Date().toISOString();
    const newItems: Notification[] = targets.map((uid) => ({
      notiId: nextId++,
      userId: uid,
      message,
      isRead: false,
      createdAt: now,
    }));
    setNotifications((prev) => [...newItems, ...prev]);
  };

  const markAsRead = (notiId: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.notiId === notiId ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = (userId: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.userId === userId ? { ...n, isRead: true } : n))
    );
  };

  const deleteNotification = (notiId: number) => {
    setNotifications((prev) => prev.filter((n) => n.notiId !== notiId));
  };

  const getUnreadCount = (userId: number) =>
    notifications.filter((n) => n.userId === userId && !n.isRead).length;

  const getNotificationsForUser = (userId: number) =>
    notifications.filter((n) => n.userId === userId).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return (
    <NotificationsContext.Provider
      value={{ notifications, addNotification, markAsRead, markAllAsRead, deleteNotification, getUnreadCount, getNotificationsForUser }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}