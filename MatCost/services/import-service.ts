import axiosClient from "@/lib/axios-client";

// ==========================================
// 1. DTO INTERFACES (MODELS)
// ==========================================

export interface PurchaseOrderDto {
  purchaseOrderId: number;
  purchaseOrderCode: string;
  requestId?: number;
  requestCode?: string;
  projectId?: number;
  projectName: string;
  supplierId: number;
  supplierName: string;
  createdBy: number;
  createdByName: string;
  createdAt: string;
  status: string;
  accountantApprovedBy?: number;
  accountantApprovedByName?: string;
  accountantApprovedAt?: string;
  adminApprovedBy?: number;
  adminApprovedByName?: string;
  adminApprovedAt?: string;
  sentToSupplierAt?: string;
  expectedDeliveryDate?: string;
  supplierNote?: string;
  totalAmount?: number;
  parentPOId?: number | null;
  revisionNumber: number;
  revisionNote?: string | null;
  rejectionReason?: string | null;
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

export interface PurchaseRequestDto {
  requestId: number;
  requestCode: string;
  projectId?: number;
  projectName: string;
  alertId?: number;
  createdBy: number;
  createdByName: number;
  createdAt: string;
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
  projectId?: number;
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
  createdAt: string;
  confirmedAt?: string;
  confirmedBy?: number;
  confirmedByName?: number;
  notes?: string;
  unit?: string;
  isDecimalUnit?: boolean;
}

export interface BulkConfirmAlertItemDto {
  alertId: number;
  adjustedQuantity?: number;
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
  parentPOId?: number | null;
  revisionNote?: string | null;
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

export interface PurchaseOrderHistoryItemDto {
  poId: number;
  revisionNumber: number;
  supplierName: string;
  totalAmount: number | null;
  status: string;
  rejectionReason: string | null;
  revisionNote: string | null;
  createdAt: string;
}

export interface PurchaseOrderHistoryResponseDto {
  requestId: number;
  prStatus: string;
  poChain: PurchaseOrderHistoryItemDto[];
}

// ==========================================
// THÊM: DTOs CHO ACCOUNTANT
// ==========================================
export interface AccountantReceiptSummaryDto {
  receiptId: number;
  receiptCode: string;
  status: string;
  purchaseOrderCode?: string;
  supplierName?: string;
  totalValue: number;
  stampedAt?: string | null;
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

export interface AccountantReceiptDetailItemDto {
  detailId: number;
  materialId: number;
  materialCode?: string;
  materialName?: string;
  materialUnit?: string;
  quantity: number;
  actualQuantity?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
}

export interface AccountantReceiptDetailDto {
  receiptId: number;
  receiptCode: string;
  status: string;
  receiptDate?: string;
  stampedAt?: string | null;
  stampedByName?: string | null;
  purchaseOrder?: PurchaseOrderDto;
  qcCheck?: QCCheckDto;
  receiptDetails: AccountantReceiptDetailItemDto[];
  inventoryCurrents: AccountantInventoryCurrentDto[];
  warehouseCards: WarehouseCardDto[];
}

export interface AccountantReceiptCloseDto {
  accountingNote?: string;
}

export interface PurchaseOrderRevisionHistoryItemDto {
  poId: number;
  revisionNumber: number;
  status: string;
  rejectedBy: string;
  rejectedAt: string | null;
  rejectionReason: string | null;
  totalAmount: number | null;
}

export interface PurchaseOrderReviewResponseDto {
  order: PurchaseOrderDto;
  review: PriceReviewItemDto[];
  revisionHistory: PurchaseOrderRevisionHistoryItemDto[];
  revisionNote: string | null;
}

export interface AccountantReceiptCloseSummaryDto {
  purchaseOrderCode: string | null;
  supplierName: string | null;
  totalItems: number;
  totalQuantity: number;
  batchCodes: string[];
  totalValue: number;
}

export interface AccountantReceiptCloseResultDto {
  receiptId: number;
  status: string;
  closedBy: string | null;
  closedAt: string | null;
  summary: AccountantReceiptCloseSummaryDto;
}

// ==========================================
// THÊM: DTOs CHO MANAGER
// ==========================================
export interface ManagerIncidentItemSummaryDto {
  materialId: number;
  materialName?: string;
  orderedQuantity: number;
  actualQuantity: number;
  passQuantity: number;
  failQuantity: number;
  failReason?: string;
  failQuantityQuantity: number;
  failQuantityQuality: number;
  failQuantityDamage: number;
  evidenceImages: string[] | null;
}

export interface ManagerIncidentSummaryDto {
  incidentId: number;
  incidentCode: string;
  receiptId: number;
  receiptCode?: string;
  submittedAt: string;
  status?: string;
  items: ManagerIncidentItemSummaryDto[];
  supplementaryRevisionHistory: null[];
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

export interface ManagerReceiptStampDto {
  notes?: string | null;
}

export interface ManagerReceiptStampResultDto {
  receiptId: number;
  status: string;
  stampedBy: string | null;
  stampedAt: string | null; // Trả về dạng ISO string: "2024-03-24T08:00:00Z"
  notes: string | null;
  nextStep: string;
}

export interface ManagerReceiptSummaryDto {
  receiptId: number;
  receiptCode: string;
  purchaseOrderCode: string | null;
  supplierName: string | null;
  totalItems: number;
  totalQuantity: number;
  putawayCompletedAt?: string | null;
  putawayCompletedByName?: string | null;
  status: string;
}

export interface ManagerReceiptBinAllocationDto {
  binCode: string;
  quantity: number;
}

export interface ManagerReceiptDetailItemDto {
  materialId: number;
  materialName: string;
  source: string;
  orderedQuantity: number;
  actualQuantity: number;
  passQuantity: number;
  batchCode: string | null;
  putawayImage?: string | null;
  expiryDate: string | null;
  binAllocations: ManagerReceiptBinAllocationDto[];
}

export interface ManagerReceiptDetailDto {
  receiptId: number;
  receiptCode: string;
  purchaseOrderId: number | null;
  purchaseOrderCode: string | null;
  supplierName: string | null;
  status: string;
  totalQuantity: number;
  putawayCompletedAt?: string | null;
  putawayCompletedByName?: string | null;
  items: ManagerReceiptDetailItemDto[];
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
  orderedQuantity?: number;
  actualQuantity?: number;
  passQuantity: number;
  failQuantity: number;
  failQuantityQuantity: number;
  failQuantityQuality: number;
  failQuantityDamage: number;
  failReason?: string;
  evidenceImages: string[] | null;
}

export interface SupplementaryRevisionHistoryItemDto {
  supplementaryReceiptId: number;
  revisionNumber: number;
  status: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  totalSupplementaryQty: number;
  createdAt: string;
}

export interface PurchasingIncidentSummaryDto {
  incidentId: number;
  incidentCode: string;
  receiptId: number;
  receiptCode?: string;
  createdAt: string;
  status?: string;
  items: PurchasingIncidentItemSummaryDto[];
  supplementaryRevisionHistory: SupplementaryRevisionHistoryItemDto[];
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
  supplementaryRevisionHistory: SupplementaryRevisionHistoryItemDto[];
}

export interface CreateSupplementaryReceiptItemDto {
  materialId: number;
  supplementaryQuantity: number;
}

export interface CreateSupplementaryReceiptDto {
  supplierNote: string | null;
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
  passQuantity?: number;
  failQuantity?: number;
  failClaimQuantity?: number;
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
  isDecimalUnit?: boolean;
  lineTotal?: number;
}

export interface GetInboundRequestListDto {
  receiptId: number;
  receiptCode: string;
  warehouseId?: number;
  warehouseName: string;
  receiptApprovalDate?: string;
  purchaseOrderCode?: string;
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
  status: string;
  stampedByName: string;
  stampedAt: string;
  closedByName: string;
  closedAt: string;
  items: GetInboundRequestItemDto[];
}

export interface PendingPurchaseOrderItemDto {
  materialId: number;
  materialName: string;
  orderedQuantity: number;
  unit: string;
  isDecimalUnit: boolean;
}

export interface PendingPurchaseOrderDto {
  type: string;
  purchaseOrderId: number;
  poCode: string;
  supplierName: string;
  expectedDeliveryDate: string;
  supplementaryReceiptId?: number | null;
  incidentId?: number | null;
  replacementQuantity?: number | null;
  originalFailReason?: string | null;
  supplierNote?: string | null;
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
  orderedQuantity: number;
  actualQuantity: number;
  passQuantity: number;
  failQuantity: number;
  result: string;
  failReason?: string | null;
}

export interface ReceiveGoodsFromPoDto {
  purchaseOrderId: number;
  supplementaryReceiptId?: number;
  notes?: string;
  items: ReceiveGoodsFromPoItemDto[];
}

export interface ReceiveGoodsFromPoResultDto {
  receiptId: number;
  purchaseOrderId: number;
  supplementaryReceiptId?: number;
  poStatus?: string | null;
  failedItems: QCFailedItemDto[];
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
  cardId?: number;
  warehouseId?: number;
  materialId?: number;
  referenceId?: number;
  referenceType?: string;
  binId?: number;
  fromDate?: string;
  toDate?: string;
  transactionType?: string;
}

export interface CreateIncidentBreakdownDto {
  quantity: number;
  quality: number;
  damage: number;
}

export interface CreateIncidentReportDetailDto {
  materialId: number;
  issueType: string;
  failQuantity: number;
  evidenceNote?: string | null;
  evidenceImages: string[] | null;
  breakdown: CreateIncidentBreakdownDto;
}

export interface CreateIncidentReportDto {
  description: string;
  details: CreateIncidentReportDetailDto[];
}

export interface IncidentReportCreateSummaryDto {
  totalFailItems: number;
  totalFailQuantity: number;
  supplierName: string;
}

export interface IncidentReportCreateResultDto {
  incidentId: number;
  receiptId: number;
  status: string;
  summary: IncidentReportCreateSummaryDto;
  nextStep: string;
}

export interface IncidentBreakdownDto {
  quantity: number;
  quality: number;
  damage: number;
}

export interface IncidentReportDetailDto {
  detailId: number;
  receiptDetailId: number;
  materialId: number;
  materialCode?: string | null;
  materialName?: string | null;
  materialUnit?: string | null;
  expectedQuantity: number;
  actualQuantity: number;
  issueType: string;
  breakdown: IncidentBreakdownDto;
  notes?: string | null;
  evidenceImages: any[] | null;
}

export interface IncidentReportDto {
  incidentId: number;
  incidentCode: string;
  receiptId: number;
  receiptCode?: string | null;
  qcCheckId?: number | null;
  qcCheckCode?: string | null;
  qcOverallResult?: string | null;
  createdBy: number;
  createdByName?: string | null;
  createdAt: string;
  description: string;
  status: string;
  resolution?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: number | null;
  resolvedByName?: string | null;
  details: IncidentReportDetailDto[];
}

export interface IncidentReportSummaryDto {
  incidentId: number;
  incidentCode: string;
  receiptId: number;
  receiptCode?: string | null;
  warehouseName?: string | null;
  createdAt: string;
  createdBy: number;
  createdByName?: string | null;
  description: string;
  status: string;
  totalItems: number;
}

export interface ReceiptPutawayBinAllocationDto {
  binId: number;
  quantity: number;
}

export interface ReceiptPutawayBatchDto {
  batchId?: number | null;
  batchCode: string;
  mfgDate?: string | null;
  expiryDate?: string | null;
  certificateImage?: string | null;
}

export interface ReceiptPutawayItemDto {
  materialId: number;
  batch: ReceiptPutawayBatchDto;
  binAllocations: ReceiptPutawayBinAllocationDto[];
}

export interface ReceiptPutawayDto {
  items: ReceiptPutawayItemDto[];
}

export interface ReceiptPutawayBinSummaryDto {
  binCode: string;
  quantity: number;
}

export interface ReceiptPutawaySummaryDto {
  materialName: string;
  batchCode: string;
  expiryDate?: string | null;
  totalQuantity: number;
  binAllocations: ReceiptPutawayBinSummaryDto[];
}

export interface ReceiptPutawayResultDto {
  receiptId: number;
  status: string;
  summary: ReceiptPutawaySummaryDto[];
  nextStep: string;
}

export interface ReceiptBatchLookupDto {
  batchId: number;
  batchCode: string;
  mfgDate?: string | null;
  expiryDate?: string | null;
  materialName: string;
  certificateImage?: string;
}

export interface PendingPutawayReceiptDto {
  receiptId: number;
  receiptCode: string;
  purchaseOrderCode: string;
  supplierName: string;
  status: string;
  createdAt: string;
  warehouseId: number;
  warehouseName: string;
  items: PendingPutawayItemDto[];
}

export interface PendingPutawayItemDto {
  materialId: number;
  materialCode: string;
  materialName: string;
  quantityToPutaway: number;
  note?: string | null;
  unit: string;
  isDecimalUnit: boolean;
}

// ==========================================
// ACCOUNTANT
// ==========================================
export const accountantPurchaseOrderApi = {
  getPendingOrders: () => {
    return axiosClient.get<PurchaseOrderDto[]>("/accountant/purchase-orders");
  },
  getReview: (purchaseOrderId: number) => {
    return axiosClient.get<PurchaseOrderReviewResponseDto>(
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

export const accountantReceiptsApi = {
  getReceipts: (status?: string) => {
    return axiosClient.get<AccountantReceiptSummaryDto[]>(
      "/accountant/receipts",
      { params: { status } },
    );
  },
  getReceipt: (receiptId: number) => {
    return axiosClient.get<AccountantReceiptDetailDto>(
      `/accountant/receipts/${receiptId}`,
    );
  },
  closeReceipt: (receiptId: number, data: AccountantReceiptCloseDto) => {
    return axiosClient.post<AccountantReceiptCloseResultDto>(
      `/accountant/receipts/${receiptId}/close`,
      data,
    );
  },
};

// ==========================================
// ADMIN
// ==========================================
export const adminNotificationApi = {
  getUnreadNotifications: (skip: number = 0, take: number = 50) => {
    return axiosClient.get<NotificationDto[]>("/admin/notifications/unread", {
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

// ==========================================
// WAREHOUSE MANAGER
// ==========================================
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
  // confirmAlert: (alertId: number, data: ConfirmStockShortageAlertDto) => {
  //   return axiosClient.put<StockShortageAlertDto>(
  //     `/warehouse-manager/alerts/${alertId}/confirm`,
  //     data,
  //   );
  // },
  bulkConfirmAlerts: (data: BulkConfirmAlertItemDto[]) => {
    return axiosClient.put<StockShortageAlertDto[]>(
      "/warehouse-manager/alerts/confirm-bulk",
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

export const managerReceiptsApi = {
  getReceipts: (status?: string) => {
    return axiosClient.get<ManagerReceiptSummaryDto[]>("/manager/receipts", {
      params: { status },
    });
  },
  getReceiptDetail: (receiptId: number) => {
    return axiosClient.get<ManagerReceiptDetailDto>(
      `/manager/receipts/${receiptId}`,
    );
  },
  stampReceipt: (receiptId: number, data: ManagerReceiptStampDto) => {
    return axiosClient.post<ManagerReceiptStampResultDto>(
      `/manager/receipts/${receiptId}/stamp`,
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

// ==========================================
// PURCHASING
// ==========================================
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
    return axiosClient.get<
      { supplierId: number; name: string; materialIds: number[] }[]
    >("/purchasing/purchase-orders/suppliers");
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

export const purchasingPurchaseRequestApi = {
  getRequests: () => {
    return axiosClient.get<PurchaseRequestDto[]>(
      "/purchasing/purchase-requests",
    );
  },
  getPoHistory: (requestId: number) => {
    return axiosClient.get<PurchaseOrderHistoryResponseDto>(
      `/purchasing/purchase-requests/${requestId}/po-history`,
    );
  },
};

export const purchasingIncidentApi = {
  getPendingIncidents: () => {
    return axiosClient.get<PurchasingIncidentSummaryDto[]>(
      "/purchasing/incidents",
    );
  },
  getIncidentDetail: (incidentId: number) => {
    return axiosClient.get<PurchasingIncidentDetailDto>(
      `/purchasing/incidents/${incidentId}`,
    );
  },
  createSupplementaryReceipt: (
    incidentId: number,
    data: CreateSupplementaryReceiptDto,
  ) => {
    return axiosClient.post<SupplementaryReceiptResultDto>(
      `/purchasing/incidents/${incidentId}/supplementary-receipt`,
      data,
    );
  },
};

// ==========================================
// STAFF
// ==========================================
export const staffIncidentApi = {
  submitToManager: (incidentId: number) => {
    return axiosClient.post<{ status: string }>(
      `/staff/incidents/${incidentId}/submit-to-manager`,
    );
  },
};

export const staffReceiptsApi = {
  getAllReceiptsForWarehouse: () => {
    return axiosClient.get<GetInboundRequestListDto[]>(
      "/staff/receipts/inbound-requests",
    );
  },
  getReceiptDetails: (receiptId: number) => {
    return axiosClient.get<GetInboundRequestListDto>(
      `/staff/receipts/inbound-requests/${receiptId}`,
    );
  },
  confirmGoodsReceipt: (receiptId: number, data: ConfirmGoodsReceiptDto) => {
    return axiosClient.post<{ message: string }>(
      `/staff/receipts/inbound-requests/${receiptId}/confirm`,
      data,
    );
  },
  receiveGoodsFromPurchaseOrder: (data: ReceiveGoodsFromPoDto) => {
    return axiosClient.post<ReceiveGoodsFromPoResultDto>(
      "/staff/receipts/from-po",
      data,
    );
  },
  putaway: (receiptId: number, data: ReceiptPutawayDto) => {
    return axiosClient.post<ReceiptPutawayResultDto>(
      `/staff/receipts/${receiptId}/putaway`,
      data,
    );
  },
  getPendingPurchaseOrders: () => {
    return axiosClient.get<PendingPurchaseOrderDto[]>(
      "/staff/receipts/pending-pos",
    );
  },
  getPendingPurchaseOrderDetail: (purchaseOrderId: number) => {
    return axiosClient.get<PendingPurchaseOrderDto>(
      `/staff/receipts/pending-pos/${purchaseOrderId}`,
    );
  },
  getPendingSupplementaryReceiptDetail: (supplementaryReceiptId: number) => {
    return axiosClient.get<PendingPurchaseOrderDto>(
      `/staff/receipts/pending-pos/supplementary/${supplementaryReceiptId}`,
    );
  },

  getPendingPutawayReceipts: () => {
    return axiosClient.get<PendingPutawayReceiptDto[]>(
      "/staff/receipts/pending-putaway",
    );
  },

  getPendingPutawayReceiptDetail: (receiptId: number) => {
    return axiosClient.get<PendingPutawayReceiptDto>(
      `/staff/receipts/pending-putaway/${receiptId}`,
    );
  },

  getBatches: (materialId: number, batchCode?: string) => {
    return axiosClient.get<ReceiptBatchLookupDto[]>("/staff/receipts/batches", {
      params: { materialId, batchCode },
    });
  },
  getAllBinLocation: () => {
    return axiosClient.get<any[]>("/staff/receipts/binLocation-requests");
  },
  getWarehouseCards: (params?: WarehouseCardQueryDto) => {
    return axiosClient.get<WarehouseCardDto[]>(
      "/staff/receipts/warehouse-cards",
      { params },
    );
  },
  getWarehouseCardsByMaterial: (materialId: number) => {
    return axiosClient.get<WarehouseCardDto[]>(
      `/staff/receipts/warehouse-cards/${materialId}`,
    );
  },
  submitQCCheck: (receiptId: number, data: SubmitQCCheckDto) => {
    return axiosClient.post<QCSubmitResultDto>(
      `/staff/receipts/${receiptId}/qc-check`,
      data,
    );
  },
  getQCCheck: (receiptId: number) => {
    return axiosClient.get<QCCheckDto>(`/staff/receipts/${receiptId}/qc-check`);
  },
  createIncidentReport: (receiptId: number, data: CreateIncidentReportDto) => {
    return axiosClient.post<IncidentReportDto>(
      `/staff/receipts/${receiptId}/incident-report`,
      data,
    );
  },
  getIncidentReport: (receiptId: number) => {
    return axiosClient.get<IncidentReportDto>(
      `/staff/receipts/${receiptId}/incident-report`,
    );
  },
  getAllIncidentReports: () => {
    return axiosClient.get<IncidentReportSummaryDto[]>(
      "/staff/receipts/incident-reports",
    );
  },
};

// ==========================================
// INTERNAL
// ==========================================
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
