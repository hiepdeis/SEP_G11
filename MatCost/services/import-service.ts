import axiosClient from "@/lib/axios-client";

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
  expectedDeliveryDate?: string; // ISO Date
  supplierNote?: string;
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

// ==========================================
// THÊM: DTOs CHO ACCOUNTANT
// ==========================================
export interface AccountantReceiptSummaryDto {
  receiptId: number;
  receiptCode: string;
  status: string;
  receiptDate?: string;
  purchaseOrderId?: number;
  purchaseOrderCode?: string;
  warehouseName?: string;
}

export interface AccountantInventoryCurrentDto {
  warehouseId: number;
  materialId: number;
  materialName?: string;
  binId: number;
  binCode?: string;
  batchId: number;
  batchCode?: string;
  quantityOnHand: number;
  lastUpdated?: string;
}

export interface AccountantReceiptDetailDto {
  receiptId: number;
  receiptCode: string;
  status: string;
  receiptDate?: string;
  purchaseOrder?: PurchaseOrderDto;
  qcCheck?: QCCheckDto;
  inventoryCurrents: AccountantInventoryCurrentDto[];
  warehouseCards: WarehouseCardDto[];
}

export interface AccountantReceiptCloseDto {
  accountingNote?: string;
}

// ==========================================
// THÊM: DTOs CHO MANAGER
// ==========================================
export interface ManagerIncidentItemSummaryDto {
  materialId: number;
  materialName?: string;
  passQuantity: number;
  failQuantity: number;
  failReason?: string;
}

export interface ManagerIncidentSummaryDto {
  incidentId: number;
  incidentCode: string;
  receiptId: number;
  receiptCode?: string;
  submittedAt: string;
  items: ManagerIncidentItemSummaryDto[];
}

export interface ManagerIncidentDetailDto {
  incidentId: number;
  incidentCode: string;
  receiptId: number;
  receiptCode?: string;
  status: string;
  description: string;
  createdAt: string;
  qcCheck?: QCCheckDto;
  items: ManagerIncidentItemSummaryDto[];
}

export interface ManagerApproveIncidentDto {
  notes?: string;
}

export interface ManagerSupplementaryReceiptItemDto {
  materialId: number;
  materialName?: string;
  supplementaryQuantity: number;
}

export interface ManagerSupplementaryReceiptDto {
  supplementaryReceiptId: number;
  purchaseOrderId: number;
  incidentId: number;
  status: string;
  supplierNote?: string;
  expectedDeliveryDate?: string;
  createdAt: string;
  items: ManagerSupplementaryReceiptItemDto[];
}

export interface ManagerApproveSupplementaryDto {
  notes?: string;
}

export interface ManagerRejectSupplementaryDto {
  reason: string;
}

export interface ManagerSupplementaryApprovalResultDto {
  incidentId: number;
  passQuantityAdded: number;
  supplementaryQuantityPending: number;
  poStatus: string;
  nextStep: string;
}

export interface ManagerSupplementaryRejectResultDto {
  status: string;
}

// ==========================================
// THÊM: DTOs CHO PURCHASING
// ==========================================
export interface ConfirmDeliveryDto {
  expectedDeliveryDate: string;
  supplierNote?: string;
}

export interface PurchasingIncidentItemSummaryDto {
  materialId: number;
  materialName?: string;
  passQuantity: number;
  failQuantity: number;
  failReason?: string;
}

export interface PurchasingIncidentSummaryDto {
  incidentId: number;
  incidentCode: string;
  receiptId: number;
  receiptCode?: string;
  createdAt: string;
  items: PurchasingIncidentItemSummaryDto[];
}

export interface PurchasingIncidentDetailDto {
  incidentId: number;
  incidentCode: string;
  receiptId: number;
  receiptCode?: string;
  status: string;
  description: string;
  createdAt: string;
  qcCheck?: QCCheckDto;
  items: PurchasingIncidentItemSummaryDto[];
}

export interface CreateSupplementaryReceiptItemDto {
  materialId: number;
  supplementaryQuantity: number;
}

export interface CreateSupplementaryReceiptDto {
  supplierNote: string;
  expectedDeliveryDate?: string;
  items: CreateSupplementaryReceiptItemDto[];
}

export interface SupplementaryReceiptResultDto {
  supplementaryReceiptId: number;
  purchaseOrderId: number;
  status: string;
  totalSupplementaryQty: number;
  nextStep: string;
}

// ==========================================
// THÊM: DTOs CHO STAFF (WAREHOUSE/QC)
// ==========================================
export interface ConfirmGoodsReceiptItemDto {
  detailId: number;
  actualQuantity: number;
  binLocationId: number;
  batchCode?: string;
  mfgDate?: string;
  certificateImage?: string;
}

export interface ConfirmGoodsReceiptDto {
  items: ConfirmGoodsReceiptItemDto[];
  notes?: string;
}

export interface GetInboundRequestItemDto {
  detailId: number;
  materialId?: number;
  materialCode: string;
  materialName: string;
  quantity?: number;
  actualQuantity?: number;
  binLocationId?: number;
  binCode?: string;
  batchId?: number;
  batchCode?: string;
  mfgDate?: string;
  supplierId?: number;
  supplierName: string;
  unitPrice?: number;
  unit?: string;
  lineTotal?: number;
}

export interface GetInboundRequestListDto {
  receiptId: number;
  receiptCode: string;
  warehouseId?: number;
  warehouseName: string;
  receiptApprovalDate?: string;
  totalQuantity: number;
  createdByName?: string;
  createdDate?: string;
  submittedByName?: string;
  submittedDate?: string;
  approvedByName?: string;
  approvedDate?: string;
  confirmedByName?: string;
  confirmedDate?: string;
  rejectedByName?: string;
  rejectedDate?: string;
  status?: string;
  items: GetInboundRequestItemDto[];
}

export interface CreateIncidentReportDetailDto {
  materialId: number;
  orderedQuantity: number;
  passQuantity: number;
  failQuantity: number;
  issueType: string;
  notes?: string;
}

export interface CreateIncidentReportDto {
  description: string;
  details: CreateIncidentReportDetailDto[];
}

export interface IncidentReportDetailDto {
  detailId: number;
  receiptDetailId: number;
  materialId: number;
  materialCode?: string;
  materialName?: string;
  materialUnit?: string;
  expectedQuantity: number;
  actualQuantity: number;
  issueType: string;
  notes?: string;
}

export interface IncidentReportDto {
  incidentId: number;
  incidentCode: string;
  receiptId: number;
  receiptCode?: string;
  qcCheckId?: number;
  qcCheckCode?: string;
  qcOverallResult?: string;
  createdBy: number;
  createdByName?: string;
  createdAt: string;
  description: string;
  status: string;
  resolution?: string;
  resolvedAt?: string;
  resolvedBy?: number;
  resolvedByName?: string;
  details: IncidentReportDetailDto[];
}

export interface IncidentReportSummaryDto {
  incidentId: number;
  incidentCode: string;
  receiptId: number;
  receiptCode?: string;
  warehouseName?: string;
  createdAt: string;
  createdByName?: string;
  description: string;
  status: string;
  totalItems: number;
}

export interface PendingPurchaseOrderItemDto {
  materialName: string;
  orderedQuantity: number;
  unit: string;
}

export interface PendingPurchaseOrderDto {
  purchaseOrderId: number;
  poCode: string;
  supplierName: string;
  expectedDeliveryDate: string;
  items: PendingPurchaseOrderItemDto[];
}

export interface QCCheckDetailInputDto {
  materialId: number;
  actualQuantity: number;
  passQuantity: number;
  failQuantity: number;
  result: string;
  failReason?: string;
}

export interface SubmitQCCheckDto {
  notes?: string;
  details: QCCheckDetailInputDto[];
}

export interface QCFailedItemDto {
  materialId: number;
  failQuantity: number;
  failReason?: string;
}

export interface QCSubmitResultDto {
  status: string;
  poStatus?: string;
  failedItems: QCFailedItemDto[];
  nextStep?: string;
}

export interface QCCheckDetailDto {
  detailId: number;
  receiptDetailId: number;
  materialId?: number;
  materialCode?: string;
  materialName?: string;
  result: string;
  failReason?: string;
  passQuantity: number;
  failQuantity: number;
}

export interface QCCheckDto {
  qcCheckId: number;
  qcCheckCode: string;
  receiptId: number;
  receiptCode?: string;
  checkedBy: number;
  checkedByName?: string;
  checkedAt: string;
  overallResult: string;
  notes?: string;
  details: QCCheckDetailDto[];
}

export interface ReceiveGoodsFromPoItemDto {
  materialId: number;
  actualQuantity: number;
}

export interface ReceiveGoodsFromPoDto {
  purchaseOrderId: number;
  supplementaryReceiptId?: number;
  items: ReceiveGoodsFromPoItemDto[];
}

export interface ReceiveGoodsFromPoResultDto {
  receiptId: number;
  purchaseOrderId: number;
  supplementaryReceiptId?: number;
  status: string;
  nextStep: string;
}

export interface WarehouseCardDto {
  cardId: number;
  cardCode: string;
  warehouseId: number;
  warehouseName?: string;
  materialId: number;
  materialCode?: string;
  materialName?: string;
  materialUnit?: string;
  binId: number;
  binCode?: string;
  batchId: number;
  batchCode?: string;
  transactionType: string;
  referenceId: number;
  referenceType: string;
  transactionDate: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  createdBy: number;
  createdByName?: string;
  notes?: string;
}

export interface WarehouseCardQueryDto {
  warehouseId?: number;
  materialId?: number;
  binId?: number;
  fromDate?: string;
  toDate?: string;
  transactionType?: string;
}

// --- ACCOUNTANT ---
export const accountantPurchaseOrderApi = {
  getPendingOrders: () => {
    return axiosClient.get<PurchaseOrderDto[]>("/accountant/purchase-orders");
  },
  getReview: (purchaseOrderId: number) => {
    return axiosClient.get<PurchaseOrderReviewResponse>(
      `/accountant/purchase-orders/${purchaseOrderId}/review`,
    );
  },
  approve: (purchaseOrderId: number) => {
    return axiosClient.post<PurchaseOrderDto>(
      `/accountant/purchase-orders/${purchaseOrderId}/approve`,
    );
  },
  reject: (purchaseOrderId: number, data: PurchaseOrderRejectDto) => {
    return axiosClient.post<PurchaseOrderDto>(
      `/accountant/purchase-orders/${purchaseOrderId}/reject`,
      data,
    );
  },
};

// --- ADMIN ---
export const adminNotificationApi = {
  getUnreadNotifications: (skip: number = 0, take: number = 50) => {
    return axiosClient.get<NotificationDto[]>("/admin/notifications", {
      params: { skip, take },
    });
  },
};

export const adminPurchaseOrderApi = {
  getPendingOrders: () => {
    return axiosClient.get<PurchaseOrderDto[]>("/admin/purchase-orders");
  },
  approve: (purchaseOrderId: number) => {
    return axiosClient.post<PurchaseOrderDto>(
      `/admin/purchase-orders/${purchaseOrderId}/approve`,
    );
  },
  reject: (purchaseOrderId: number, data: PurchaseOrderRejectDto) => {
    return axiosClient.post<PurchaseOrderDto>(
      `/admin/purchase-orders/${purchaseOrderId}/reject`,
      data,
    );
  },
};

export const adminPurchaseRequestApi = {
  getRequests: () => {
    return axiosClient.get<PurchaseRequestDto[]>("/admin/purchase-requests");
  },
  getRequest: (requestId: number) => {
    return axiosClient.get<PurchaseRequestDto>(
      `/admin/purchase-requests/${requestId}`,
    );
  },
  createFromAlert: (
    alertId: number,
    data: CreatePurchaseRequestFromAlertDto,
  ) => {
    return axiosClient.post<PurchaseRequestDto>(
      `/admin/purchase-requests/alerts/${alertId}`,
      data,
    );
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
    return axiosClient.get<StockShortageAlertDto[]>(
      "/warehouse-manager/alerts",
    );
  },
  getAlert: (alertId: number) => {
    return axiosClient.get<StockShortageAlertDto>(
      `/warehouse-manager/alerts/${alertId}`,
    );
  },
  confirmAlert: (alertId: number, data: ConfirmStockShortageAlertDto) => {
    return axiosClient.put<StockShortageAlertDto>(
      `/warehouse-manager/alerts/${alertId}/confirm`,
      data,
    );
  },
};

export const managerNotificationApi = {
  getUnreadNotifications: (skip: number = 0, take: number = 50) => {
    return axiosClient.get<NotificationDto[]>(
      "/warehouse-manager/notifications",
      { params: { skip, take } },
    );
  },
};

// --- PURCHASING ---
export const purchasingPurchaseOrderApi = {
  getOrders: () => {
    return axiosClient.get<PurchaseOrderDto[]>("/purchasing/purchase-orders");
  },
  getOrder: (purchaseOrderId: number) => {
    return axiosClient.get<PurchaseOrderDto>(
      `/purchasing/purchase-orders/${purchaseOrderId}`,
    );
  },
  createDraft: (data: CreatePurchaseOrderDraftDto) => {
    return axiosClient.post<PurchaseOrderDto[]>(
      "/purchasing/purchase-orders/draft",
      data,
    );
  },
  sendToSupplier: (purchaseOrderId: number) => {
    return axiosClient.post<{
      purchaseOrderId: number;
      status: string;
      sentAt: string;
    }>(`/purchasing/purchase-orders/${purchaseOrderId}/send`);
  },
  getSuppliers: () => {
    return axiosClient.get<{ supplierId: number; name: string }[]>(
      "/purchasing/purchase-orders/suppliers",
    );
  },
  confirmDelivery: (purchaseOrderId: number, data: ConfirmDeliveryDto) => {
    return axiosClient.patch<{
      purchaseOrderId: number;
      status: string;
      expectedDeliveryDate: string;
      supplierNote: string;
    }>(`/purchasing/purchase-orders/${purchaseOrderId}/confirm-delivery`, data);
  },
};

export const purchasingIncidentApi = {
  getPendingIncidents: () => {
    return axiosClient.get<PurchasingIncidentSummaryDto[]>("/purchasing/incidents");
  },
  getIncidentDetail: (incidentId: number) => {
    return axiosClient.get<PurchasingIncidentDetailDto>(`/purchasing/incidents/${incidentId}`);
  },
  createSupplementaryReceipt: (incidentId: number, data: CreateSupplementaryReceiptDto) => {
    return axiosClient.post<SupplementaryReceiptResultDto>(`/purchasing/incidents/${incidentId}/supplementary-receipt`, data);
  },
};

export const staffIncidentApi = {
  submitToManager: (incidentId: number) => {
    return axiosClient.post<{ status: string }>(`/staff/incidents/${incidentId}/submit-to-manager`);
  }
};

export const staffReceiptsApi = {
  getAllReceiptsForWarehouse: () => {
    return axiosClient.get<GetInboundRequestListDto[]>("/staff/receipts/inbound-requests");
  },
  getReceiptDetails: (receiptId: number) => {
    return axiosClient.get<GetInboundRequestListDto>(`/staff/receipts/inbound-requests/${receiptId}`);
  },
  confirmGoodsReceipt: (receiptId: number, data: ConfirmGoodsReceiptDto) => {
    return axiosClient.post<{ message: string }>(`/staff/receipts/inbound-requests/${receiptId}/confirm`, data);
  },
  receiveGoodsFromPurchaseOrder: (data: ReceiveGoodsFromPoDto) => {
    return axiosClient.post<ReceiveGoodsFromPoResultDto>("/staff/receipts/from-po", data);
  },
  getPendingPurchaseOrders: () => {
    return axiosClient.get<PendingPurchaseOrderDto[]>("/staff/receipts/pending-pos");
  },
  getAllBinLocation: () => {
    return axiosClient.get<any[]>("/staff/receipts/binLocation-requests");
  },
  getWarehouseCards: (params?: WarehouseCardQueryDto) => {
    return axiosClient.get<WarehouseCardDto[]>("/staff/receipts/warehouse-cards", { params });
  },
  getWarehouseCardsByMaterial: (materialId: number) => {
    return axiosClient.get<WarehouseCardDto[]>(`/staff/receipts/warehouse-cards/${materialId}`);
  },
  submitQCCheck: (receiptId: number, data: SubmitQCCheckDto) => {
    return axiosClient.post<QCSubmitResultDto>(`/staff/receipts/${receiptId}/qc-check`, data);
  },
  getQCCheck: (receiptId: number) => {
    return axiosClient.get<QCCheckDto>(`/staff/receipts/${receiptId}/qc-check`);
  },
  createIncidentReport: (receiptId: number, data: CreateIncidentReportDto) => {
    return axiosClient.post<IncidentReportDto>(`/staff/receipts/${receiptId}/incident-report`, data);
  },
  getIncidentReport: (receiptId: number) => {
    return axiosClient.get<IncidentReportDto>(`/staff/receipts/${receiptId}/incident-report`);
  },
  getAllIncidentReports: () => {
    return axiosClient.get<IncidentReportSummaryDto[]>("/staff/receipts/incident-reports");
  },
};

export const purchasingPurchaseRequestApi = {
  getRequests: () => {
    return axiosClient.get<PurchaseRequestDto[]>(
      "/purchasing/purchase-requests",
    );
  },
};

// --- INTERNAL ---
export const internalStockShortageApi = {
  calculate: (warehouseId?: number) => {
    return axiosClient.post<StockShortageDetectResultDto>(
      "/internal/stock-shortage/calculate",
      null,
      {
        params: { warehouseId },
      },
    );
  },
};

export const accountantReceiptsApi = {
  getReceipts: () => {
    return axiosClient.get<AccountantReceiptSummaryDto[]>(
      "/accountant/receipts",
    );
  },
  getReceipt: (receiptId: number) => {
    return axiosClient.get<AccountantReceiptDetailDto>(
      `/accountant/receipts/${receiptId}`,
    );
  },
  closeReceipt: (receiptId: number, data: AccountantReceiptCloseDto) => {
    return axiosClient.post<{ message: string }>(
      `/accountant/receipts/${receiptId}/close`,
      data,
    );
  },
};

export const managerIncidentApi = {
  getPendingIncidents: () => {
    return axiosClient.get<ManagerIncidentSummaryDto[]>("/manager/incidents");
  },
  getIncidentDetail: (incidentId: number) => {
    return axiosClient.get<ManagerIncidentDetailDto>(
      `/manager/incidents/${incidentId}`,
    );
  },
  approveIncident: (incidentId: number, data: ManagerApproveIncidentDto) => {
    return axiosClient.post<{ status: string }>(
      `/manager/incidents/${incidentId}/approve`,
      data,
    );
  },
  getSupplementaryReceipt: (incidentId: number) => {
    return axiosClient.get<ManagerSupplementaryReceiptDto>(
      `/manager/incidents/${incidentId}/supplementary-receipt`,
    );
  },
  approveSupplementaryReceipt: (
    incidentId: number,
    data: ManagerApproveSupplementaryDto,
  ) => {
    return axiosClient.post<ManagerSupplementaryApprovalResultDto>(
      `/manager/incidents/${incidentId}/approve-supplementary`,
      data,
    );
  },
  rejectSupplementaryReceipt: (
    incidentId: number,
    data: ManagerRejectSupplementaryDto,
  ) => {
    return axiosClient.post<ManagerSupplementaryRejectResultDto>(
      `/manager/incidents/${incidentId}/reject-supplementary`,
      data,
    );
  },
};
