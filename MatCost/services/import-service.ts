import axiosClient from "@/lib/axios-client";
import axios from "axios";

// ==========================================
// 1. DTO INTERFACES (MODELS)
// ==========================================

export interface PurchaseOrderDto {
  purchaseOrderId: number;
  purchaseOrderCode: string;
  requestId?: number;
  projectId: number;
  projectName: string;
  supplierId: number;
  supplierName: string;
  createdBy: number;
  createdAt: string; // ISO Date
  status: string;
  accountantApprovedBy?: number;
  accountantApprovedAt?: string; // ISO Date
  adminApprovedBy?: number;
  adminApprovedAt?: string; // ISO Date
  sentToSupplierAt?: string; // ISO Date
  totalAmount?: number;
  items: PurchaseOrderItemDto[];
}

export interface PurchaseOrderItemDto {
  itemId: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  orderedQuantity: number;
  unitPrice?: number;
  lineTotal?: number;
}

export interface PurchaseOrderRejectDto {
  reason: string;
}

export interface PriceReviewItemDto {
  materialName: string;
  poUnitPrice: number;
  quotationPrice: number;
  variance: number;
  variancePercent?: number;
}

export interface PurchaseOrderReviewResponse {
  order: PurchaseOrderDto;
  review: PriceReviewItemDto[];
}

export interface PurchaseRequestDto {
  requestId: number;
  requestCode: string;
  projectId: number;
  projectName: string;
  alertId?: number;
  createdBy: number;
  createdAt: string; // ISO Date
  status: string;
  items: PurchaseRequestItemDto[];
}

export interface PurchaseRequestItemDto {
  itemId: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  quantity: number;
  notes?: string;
}

export interface PurchaseRequestItemInputDto {
  materialId: number;
  quantity: number;
  notes?: string;
}

export interface CreatePurchaseRequestFromAlertDto {
  projectId: number;
  finalQuantity?: number;
  items: PurchaseRequestItemInputDto[];
}

export interface StockShortageAlertDto {
  alertId: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  warehouseId?: number;
  warehouseName: string;
  currentQuantity: number;
  minStockLevel?: number;
  suggestedQuantity: number;
  status: string;
  priority?: string;
  createdAt: string; // ISO Date
  confirmedAt?: string; // ISO Date
  confirmedBy?: number;
  notes?: string;
}

export interface ConfirmStockShortageAlertDto {
  adjustedQuantity?: number;
  notes?: string;
}

export interface StockShortageDetectResultDto {
  totalScanned: number;
  newAlerts: number;
  updatedAlerts: number;
}

export interface CreatePurchaseOrderDraftDto {
  requestId: number;
  supplierId?: number;
  items: PurchaseOrderDraftItemDto[];
}

export interface PurchaseOrderDraftItemDto {
  supplierId?: number;
  materialId: number;
  orderedQuantity: number;
  unitPrice?: number;
}

export interface NotificationDto {
  notiId: number;
  message: string;
  relatedEntityType: string;
  relatedEntityId: number;
  createdAt: string;
}

// --- ACCOUNTANT ---
export const accountantPurchaseOrderApi = {
  getPendingOrders: () => {
    return axiosClient.get<PurchaseOrderDto[]>("/accountant/purchase-orders");
  },
  getReview: (purchaseOrderId: number) => {
    return axiosClient.get<PurchaseOrderReviewResponse>(`/accountant/purchase-orders/${purchaseOrderId}/review`);
  },
  approve: (purchaseOrderId: number) => {
    return axiosClient.post<PurchaseOrderDto>(`/accountant/purchase-orders/${purchaseOrderId}/approve`);
  },
  reject: (purchaseOrderId: number, data: PurchaseOrderRejectDto) => {
    return axiosClient.post<PurchaseOrderDto>(`/accountant/purchase-orders/${purchaseOrderId}/reject`, data);
  },
};

// --- ADMIN ---
export const adminNotificationApi = {
  getUnreadNotifications: (skip: number = 0, take: number = 50) => {
    return axiosClient.get<NotificationDto[]>("/admin/notifications", { params: { skip, take } });
  },
};

export const adminPurchaseOrderApi = {
  approve: (purchaseOrderId: number) => {
    return axiosClient.post<PurchaseOrderDto>(`/admin/purchase-orders/${purchaseOrderId}/approve`);
  },
  reject: (purchaseOrderId: number, data: PurchaseOrderRejectDto) => {
    return axiosClient.post<PurchaseOrderDto>(`/admin/purchase-orders/${purchaseOrderId}/reject`, data);
  },
};

export const adminPurchaseRequestApi = {
  getRequests: () => {
    return axiosClient.get<PurchaseRequestDto[]>("/admin/purchase-requests");
  },
  getRequest: (requestId: number) => {
    return axiosClient.get<PurchaseRequestDto>(`/admin/purchase-requests/${requestId}`);
  },
  createFromAlert: (alertId: number, data: CreatePurchaseRequestFromAlertDto) => {
    return axiosClient.post<PurchaseRequestDto>(`/admin/purchase-requests/alerts/${alertId}`, data);
  },
};

export const adminStockShortageAlertApi = {
  getConfirmedAlerts: () => {
    return axiosClient.get<StockShortageAlertDto[]>("/admin/alerts/confirmed");
  },
  getAlert: (alertId: number) => {
    return axiosClient.get<StockShortageAlertDto>(`/admin/alerts/${alertId}`);
  },
};

// --- WAREHOUSE MANAGER ---
export const managerStockShortageAlertApi = {
  getAlerts: () => {
    return axiosClient.get<StockShortageAlertDto[]>("/warehouse-manager/alerts");
  },
  getAlert: (alertId: number) => {
    return axiosClient.get<StockShortageAlertDto>(`/warehouse-manager/alerts/${alertId}`);
  },
  confirmAlert: (alertId: number, data: ConfirmStockShortageAlertDto) => {
    return axiosClient.put<StockShortageAlertDto>(`/warehouse-manager/alerts/${alertId}/confirm`, data);
  },
};

export const managerNotificationApi = {
  getUnreadNotifications: (skip: number = 0, take: number = 50) => {
    return axiosClient.get<NotificationDto[]>("/warehouse-manager/notifications", { params: { skip, take } });
  },
};

// --- PURCHASING ---
export const purchasingPurchaseOrderApi = {
  getOrders: () => {
    return axiosClient.get<PurchaseOrderDto[]>("/purchasing/purchase-orders");
  },
  getOrder: (purchaseOrderId: number) => {
    return axiosClient.get<PurchaseOrderDto>(`/purchasing/purchase-orders/${purchaseOrderId}`);
  },
  createDraft: (data: CreatePurchaseOrderDraftDto) => {
    return axiosClient.post<PurchaseOrderDto[]>("/purchasing/purchase-orders/draft", data);
  },
  sendToSupplier: (purchaseOrderId: number) => {
    return axiosClient.post<{ purchaseOrderId: number; status: string; sentAt: string }>(
      `/purchasing/purchase-orders/${purchaseOrderId}/send`
    );
  },
};

export const purchasingPurchaseRequestApi = {
  getRequests: () => {
    return axiosClient.get<PurchaseRequestDto[]>("/purchasing/purchase-requests");
  },
};

// --- INTERNAL ---
export const internalStockShortageApi = {
  calculate: (warehouseId?: number) => {
    return axiosClient.post<StockShortageDetectResultDto>("/internal/stock-shortage/calculate", null, {
      params: { warehouseId },
    });
  },
};