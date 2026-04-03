import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

export type NotificationItem = {
  notiId: number;
  userId: number;
  message: string;
  isRead: boolean;
  createdAt: string;
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
  userId: number;
  message: string;
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
  return apiGet<NotificationPagedResult>(
    `/admin/notifications${query ? `?${query}` : ""}`
  );
}

export function createNotification(payload: CreateNotificationPayload) {
  return apiPost<NotificationItem>("/admin/notifications", payload);
}

export async function createNotificationsBulk(userIds: number[], message: string) {
  await Promise.all(userIds.map((userId) => createNotification({ userId, message })));
}

export function markNotificationAsRead(notiId: number) {
  return apiPatch(`/admin/notifications/${notiId}/read`, {});
}

export function deleteNotificationById(notiId: number) {
  return apiDelete(`/admin/notifications/${notiId}`);
}