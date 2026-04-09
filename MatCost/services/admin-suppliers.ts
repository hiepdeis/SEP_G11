import axiosClient from "@/lib/axios-client";

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
  return axiosClient.get<SupplierPagedResult>("/admin/master-data/suppliers").then((res) => res.data);
}

export function getSupplierById(id: number) {
  return axiosClient.get<SupplierDto>(`/admin/master-data/suppliers/${id}`).then((res) => res.data);
}

export function createSupplier(body: UpsertSupplierPayload) {
  return axiosClient.post<CreateSupplierResponse>("/admin/master-data/suppliers", body).then((res) => res.data);
}

export function updateSupplier(id: number, body: UpsertSupplierPayload) {
  return axiosClient.put<void>(`/admin/master-data/suppliers/${id}`, body).then((res) => res.data);
}

export function deleteSupplier(id: number) {
  return axiosClient.delete<void>(`/admin/master-data/suppliers/${id}`).then((res) => res.data);
}
