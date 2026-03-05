import axiosClient from "@/lib/axios-client";

// ==========================================
// ACCOUNTANT DTOs & API
// ==========================================

export interface ReceiptSummaryDto {
  receiptId: number;
  receiptCode: string;
  warehouseId: number | null;
  warehouseName: string | null;
  supplierId: number | null;
  supplierName: string | null;
  receiptDate: string | null;
  status: string | null;
  itemCount: number;
  createdByName: string;
}

export interface ReceiptItemDto {
  detailId: number;
  materialId: number | null; // Nullable based on C#
  materialCode: string;
  materialName: string;
  quantity: number | null;
  supplierId: number | null; // Added based on C#
  unitPrice: number | null;
  lineTotal: number | null;
}

export interface ReceiptDetailDto {
  receiptId: number;
  receiptCode: string;
  warehouseId: number | null;
  warehouseName: string | null;
  supplierId: number | null;
  supplierName: string | null;
  receiptDate: string | null;
  status: string | null;
  totalAmount: number | null;
  items: ReceiptItemDto[];
  notes?: string; // Optional field not strictly in C# DTO but useful for UI
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
  // supplierId removed from root, it is inside items now in C# logic if per item, 
  // BUT the C# controller CreateDraftDto still has Items list.
  // Wait, the C# DTO `CreateDraftDto` has `Items` list and `Notes`. 
  // `DraftItemDto` has `SupplierId`. 
  // Let's match the C# `CreateDraftDto`:
  items: DraftItemDto[];
  notes?: string | null;
}

export const receiptApi = {
  // GET /api/accountant/Receipts/pending-review
  getPendingAccountant: () => {
    return axiosClient.get<ReceiptSummaryDto[]>("/accountant/Receipts/pending-review");
  },

  // GET /api/accountant/Receipts/{id}
  getById: (id: number) => {
    return axiosClient.get<ReceiptDetailDto>(`/accountant/Receipts/${id}`);
  },

  // GET /api/accountant/Receipts/{id}/available-suppliers
  getAvailableSuppliers: (id: number) => {
    return axiosClient.get<MaterialSuppliersDto[]>(`/accountant/Receipts/${id}/available-suppliers`);
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
};

// ==========================================
// MANAGER DTOs & API
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
  supplierName: string | null; // Added based on C#
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  subTotal: number | null;
}

export interface PendingReceiptDto {
  receiptId: number;
  receiptDate: string | null;
  warehouseName: string | null;
  supplierName: string | null;
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

export const managerReceiptApi = {
  // GET /api/manager/ManagerReceipts/pending
  getPendingApprovals: () => {
    return axiosClient.get<PendingReceiptDto[]>("/manager/ManagerReceipts/pending");
  },

  // GET /api/manager/ManagerReceipts/{id}
  getById: (id: number) => {
    return axiosClient.get<PendingReceiptDto>(`/manager/ManagerReceipts/${id}`);
  },

  // POST /api/manager/ManagerReceipts/{id}/approve
  approveReceipt: (id: number, data: ApproveReceiptDto) => {
    return axiosClient.post<ApprovalResponseDto>(`/manager/ManagerReceipts/${id}/approve`, data);
  },

  // POST /api/manager/ManagerReceipts/{id}/reject
  rejectReceipt: (id: number, data: RejectReceiptDto) => {
    return axiosClient.post<ApprovalResponseDto>(`/manager/ManagerReceipts/${id}/reject`, data);
  },
};