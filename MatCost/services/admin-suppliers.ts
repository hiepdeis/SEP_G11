import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";

export type SupplierDto = {
  supplierId: number;
  code: string;
  name: string;
  taxCode?: string | null;
  address?: string | null;
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
