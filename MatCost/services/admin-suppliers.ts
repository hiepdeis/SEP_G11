import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";

export type ContractMaterialDto = {
  materialId: number;
  code: string;
  name: string;
  unit?: string | null;
  orderedQuantity: number;
  totalAmount?: number | null;
};

export type ContractDto = {
  contractId: number;
  contractCode: string;
  contractNumber?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: string;
  isActive: boolean;
  supplierName?: string | null;
  purchaseOrderCount: number;
  materialCount: number;
  totalAmount?: number | null;
  materials: ContractMaterialDto[];
};

export type SupplierDto = {
  supplierId: number;
  code: string;
  name: string;
  taxCode?: string | null;
  address?: string | null;
  contracts?: ContractDto[];
};

export type SupplierPagedResult = {
  items: SupplierDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type UpsertSupplierPayload = {
  code: string;
  name: string;
  taxCode?: string;
  address?: string;
};

export type CreateSupplierResponse = {
  id: number;
  message: string;
};

export function getSuppliers() {
  return apiGet<SupplierPagedResult>("/admin/master-data/suppliers");
}

export function createSupplier(body: UpsertSupplierPayload) {
  return apiPost<CreateSupplierResponse>("/admin/master-data/suppliers", body);
}

export function updateSupplier(id: number, body: UpsertSupplierPayload) {
  return apiPut<void>(`/admin/master-data/suppliers/${id}`, body);
}

export function deleteSupplier(id: number) {
  return apiDelete<void>(`/admin/master-data/suppliers/${id}`);
}
