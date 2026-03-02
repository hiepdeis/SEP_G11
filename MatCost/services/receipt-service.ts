import axiosClient from "@/lib/axios-client";

// ==========================================
// ACCOUNTANT DTOs (Namespace: Backend.Domains.Import.DTOs.Accountants)
// ==========================================

export interface ReceiptSummaryDto {
  receiptId: number;
  receiptCode: string;
  warehouseId: number | null;
  warehouseName: string | null;
  receiptDate: string | null;
  status: string | null;
  rejectionReason: string | null;
  itemCount: number;
  createdByName: string;
}

export interface ReceiptItemDto {
  detailId: number;
  materialId: number | null;
  materialCode: string;
  materialName: string;
  quantity: number | null;
  supplierId: number | null; // int?
  supplierName: string; // Added to match C#
  unitPrice: number | null;
  lineTotal: number | null;
}

export interface ReceiptDetailDto {
  receiptId: number;
  receiptCode: string;
  warehouseId: number | null;
  warehouseName: string | null;
  receiptDate: string | null;
  status: string | null;
  totalAmount: number | null;
  items: ReceiptItemDto[];
}

export interface SupplierQuotationDto {
  supplierId: number;
  supplierName: string;
  price: number;
  currency: string;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
}

export interface MaterialSuppliersDto {
  materialId: number;
  materialCode: string;
  materialName: string;
  suppliers: SupplierQuotationDto[];
}

export interface DraftItemDto {
  supplierId: number;
  materialId: number;
  quantity: number;
  unitPrice: number;
}

export interface CreateDraftDto {
  warehouseId: number;
  items: DraftItemDto[];
  notes?: string | null;
}

// ==========================================
// ACCOUNTANT API
// ==========================================

export const receiptApi = {
  // GET /api/accountant/Receipts/pending-review
  getPendingAccountant: () => {
    return axiosClient.get<ReceiptSummaryDto[]>(
      "/accountant/Receipts/pending-review",
    );
  },

  // GET /api/accountant/Receipts/{id}
  getById: (id: number) => {
    return axiosClient.get<ReceiptDetailDto>(`/accountant/Receipts/${id}`);
  },

  // GET /api/accountant/Receipts/{id}/available-suppliers
  getAvailableSuppliers: (id: number) => {
    return axiosClient.get<MaterialSuppliersDto[]>(
      `/accountant/Receipts/${id}/available-suppliers`,
    );
  },

  // POST /api/accountant/Receipts/{id}/create-draft
  createDraft: (id: number, data: CreateDraftDto) => {
    return axiosClient.post(`/accountant/Receipts/${id}/create-draft`, data);
  },

  // PUT /api/accountant/Receipts/{id}/draft
  updateDraft: (id: number, data: CreateDraftDto) => {
    return axiosClient.put(`/accountant/Receipts/${id}/draft`, data);
  },

  // POST /api/accountant/Receipts/{id}/submit
  submitForApproval: (id: number) => {
    return axiosClient.post(`/accountant/Receipts/${id}/submit`);
  },

  revertToDraft: (id: number) => {
    return axiosClient.post(`/accountant/Receipts/${id}/revert-to-draft`);
  },

  getRejectionHistory: (id: number) => {
    return axiosClient.get<ReceiptRejectionHistoryDto[]>(
      `/accountant/Receipts/${id}/rejection-history`,
    );
  },
};

// ==========================================
// MANAGER DTOs (Namespace: Backend.Domains.Import.DTOs.Managers)
// ==========================================

export interface ApproveReceiptDto {
  approvalNotes?: string | null;
}

export interface RejectReceiptDto {
  rejectionReason: string;
}

export interface PendingReceiptDetailDto {
  detailId: number;
  materialCode: string | null;
  materialName: string | null;
  supplierName: string | null;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  subTotal: number | null;
}

export interface ReceiptRejectionHistoryDto {
  id: number;
  rejectorName: string | null;
  rejectedAt: string;
  rejectionReason: string;
}

export interface PendingReceiptDto {
  receiptId: number;
  receiptCode: string;
  receiptDate: string | null;
  warehouseName: string | null;
  totalAmount: number | null;
  status: string;
  createdByName: string | null;
  createdDate: string | null;
  details: PendingReceiptDetailDto[];
}

export interface ApprovalResponseDto {
  message: string;
  receiptId: number;
  newStatus: string;
  approvedBy?: string;
  rejectedBy?: string;
  approvedDate?: string;
  rejectedDate?: string;
  reason?: string;
}

// ==========================================
// MANAGER API
// ==========================================

export const managerReceiptApi = {
  // GET /api/manager/ManagerReceipts/pending
  getPendingApprovals: () => {
    return axiosClient.get<PendingReceiptDto[]>(
      "/manager/ManagerReceipts/pending",
    );
  },

  // GET /api/manager/ManagerReceipts/{id}
  getById: (id: number) => {
    return axiosClient.get<PendingReceiptDto>(`/manager/ManagerReceipts/${id}`);
  },

  // POST /api/manager/ManagerReceipts/{id}/approve
  approveReceipt: (id: number, data: ApproveReceiptDto) => {
    return axiosClient.post<ApprovalResponseDto>(
      `/manager/ManagerReceipts/${id}/approve`,
      data,
    );
  },

  // POST /api/manager/ManagerReceipts/{id}/reject
  rejectReceipt: (id: number, data: RejectReceiptDto) => {
    return axiosClient.post<ApprovalResponseDto>(
      `/manager/ManagerReceipts/${id}/reject`,
      data,
    );
  },
};

// ==========================================
// STAFF DTOs
// Namespace: Backend.Domains.Import.DTOs.Staff
// ==========================================

export interface GetInboundRequestItemDto {
  detailId: number;
  materialId: number | null;
  materialCode: string;
  materialName: string;
  quantity: number | null; // decimal?
  supplierId: number | null;
  supplierName: string;
  unitPrice: number | null; // decimal?
  unit: string;
  lineTotal: number | null; // decimal?
}

export interface GetInboundRequestListDto {
  receiptId: number;
  receiptCode: string;
  warehouseId: number;
  warehouseName: string;
  receiptApprovalDate: string | null; // DateTime?
  totalQuantity: number; // decimal
  items: GetInboundRequestItemDto[];
}

export interface ConfirmGoodsReceiptItemDto {
  detailId: number;
  actualQuantity: number; // decimal
  binLocationId: number;
  batchCode?: string | null;
  mfgDate?: string | null; // DateTime? (send as ISO string)
  certificateImage?: string | null;
}

export interface ConfirmGoodsReceiptDto {
  items: ConfirmGoodsReceiptItemDto[];
  notes?: string | null;
}

export interface BinLocationDto {
  binId: number;
  warehouseId: number;
  warehouseName: string;
  code: string;
  type: string;
}

// ==========================================
// STAFF API SERVICE
// Controller: StaffReceiptsController
// ==========================================

export const staffReceiptApi = {
  getAllInboundRequests: () => {
    return axiosClient.get<GetInboundRequestListDto[]>(
      "/StaffReceipts/inbound-requests",
    );
  },

  getInboundRequestDetail: (receiptId: number) => {
    return axiosClient.get<GetInboundRequestListDto>(
      `/StaffReceipts/inbound-requests/${receiptId}`,
    );
  },

  confirmGoodsReceipt: (receiptId: number, data: ConfirmGoodsReceiptDto) => {
    return axiosClient.post(
      `/StaffReceipts/inbound-requests/${receiptId}/confirm`,
      data,
    );
  },
  getAllBinLocation: () => {
    return axiosClient.get<BinLocationDto[]>(
      "/StaffReceipts/binLocation-requests",
    );
  },
};
