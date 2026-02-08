import axiosClient from "@/lib/axios-client";

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
  materialId: number | null;
  materialCode: string;
  materialName: string;
  quantity: number | null;
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

export interface MaterialSuppliersResponse {
  materials: MaterialSuppliersDto[];
  warning?: string;
}

export interface DraftItemDto {
  materialId: number;
  quantity: number;
  unitPrice: number;
}

export interface CreateDraftDto {
  supplierId: number;
  items: DraftItemDto[];
  notes?: string | null;
}

export interface DraftResponseDto {
  receiptId: number;
  status: string;
  message: string;
  submittedAt?: string;
}

export const receiptApi = {
  // GET /api/Receipts/pending-accountant
  // Lấy danh sách phiếu trạng thái "Requested" cần kế toán xử lý
  getPendingAccountant: () => {
    return axiosClient.get<ReceiptSummaryDto[]>("/Receipts/pending-accountant");
  },

  // GET /api/Receipts/{id}
  // Lấy chi tiết phiếu nhập
  getById: (id: number) => {
    return axiosClient.get<ReceiptDetailDto>(`/Receipts/${id}`);
  },

  // GET /api/Receipts/{id}/available-suppliers
  // Lấy danh sách nhà cung cấp có báo giá cho các vật tư trong phiếu
  getAvailableSuppliers: (id: number) => {
    return axiosClient.get<MaterialSuppliersDto[] | MaterialSuppliersResponse>(
      `/Receipts/${id}/available-suppliers`
    );
  },

  // POST /api/Receipts/{id}/create-draft
  // Tạo bản nháp (Draft) - Kế toán chọn Supplier và lưu giá
  createDraft: (id: number, data: CreateDraftDto) => {
    return axiosClient.post<DraftResponseDto>(`/Receipts/${id}/create-draft`, data);
  },

  // PUT /api/Receipts/{id}/draft
  // Cập nhật bản nháp (nếu cần sửa đổi Supplier hoặc giá)
  updateDraft: (id: number, data: CreateDraftDto) => {
    return axiosClient.put<DraftResponseDto>(`/Receipts/${id}/draft`, data);
  },

  // POST /api/Receipts/{id}/submit
  // Gửi phiếu lên Manager phê duyệt (Draft -> Submitted)
  submitForApproval: (id: number) => {
    return axiosClient.post<DraftResponseDto>(`/Receipts/${id}/submit`);
  },
};