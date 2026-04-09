import axiosClient from "@/lib/axios-client";

export type NotificationItem = {
  notiId: number;
  userId: number;
  message: string;
  relatedEntityType?: string | null;
  relatedEntityId?: number | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationCreateResult = {
  sentCount: number;
  notificationIds: number[];
  emailRequested: boolean;
  emailConfigured: boolean;
  emailSentCount: number;
  emailMissingAddressCount: number;
  emailFailedCount: number;
};

export type NotificationPagedResult = {
  items: NotificationItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type GetNotificationsParams = {
  userId?: number;
  isRead?: boolean | "";
  keyword?: string;
  page?: number;
  pageSize?: number;
};

export type CreateNotificationPayload = {
  targetMode?: "single" | "all";
  userId?: number;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  sendEmail?: boolean;
};

export function getNotifications(params: GetNotificationsParams = {}) {
  const search = new URLSearchParams();

  if (params.userId !== undefined) {
    search.append("userId", String(params.userId));
  }

  if (params.isRead !== undefined && params.isRead !== "") {
    search.append("isRead", String(params.isRead));
  }

  if (params.keyword) {
    search.append("keyword", params.keyword);
  }

  if (params.page !== undefined) {
    search.append("page", String(params.page));
  }

  if (params.pageSize !== undefined) {
    search.append("pageSize", String(params.pageSize));
  }

  const query = search.toString();
  return axiosClient
    .get<NotificationPagedResult>(`/admin/notifications${query ? `?${query}` : ""}`)
    .then((res) => res.data);
}

export function createNotification(payload: CreateNotificationPayload) {
  return axiosClient
    .post<NotificationCreateResult>("/admin/notifications", payload)
    .then((res) => res.data);
}

export function createNotifications(payload: CreateNotificationPayload) {
  return createNotification(payload);
}

export function markNotificationAsRead(notiId: number) {
  return axiosClient.patch(`/admin/notifications/${notiId}/read`, {}).then((res) => res.data);
}

export function deleteNotificationById(notiId: number) {
  return axiosClient.delete(`/admin/notifications/${notiId}`).then((res) => res.data);
}
