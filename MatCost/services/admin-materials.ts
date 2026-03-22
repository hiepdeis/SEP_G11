import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

export type MaterialItem = {
  materialId: number;
  code: string;
  name: string;
  unit: string;
  massPerUnit: number | null;
  minStockLevel: number | null;
  categoryId: number | null;
  categoryName?: string;
  unitPrice: number | null;
  technicalStandard: string;
  specification: string;
};

export type MaterialPagedResult = {
  items: MaterialItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type GetMaterialsParams = {
  keyword?: string;
  categoryId?: number;
  page?: number;
  pageSize?: number;
};

export type UpsertMaterialPayload = {
  code: string;
  name: string;
  unit: string;
  massPerUnit: number | null;
  minStockLevel: number | null;
  categoryId: number | null;
  unitPrice: number | null;
  technicalStandard: string;
  specification: string;
};

export function getMaterials(params: GetMaterialsParams = {}) {
  const qs = new URLSearchParams();

  if (params.keyword) qs.set("keyword", params.keyword);
  if (params.categoryId) qs.set("categoryId", String(params.categoryId));
  qs.set("page", String(params.page ?? 1));
  qs.set("pageSize", String(params.pageSize ?? 10));

  return apiGet<MaterialPagedResult>(`/admin/materials?${qs.toString()}`);
}

export function getMaterialById(materialId: number) {
  return apiGet<MaterialItem>(`/admin/materials/${materialId}`);
}

export function createMaterial(payload: UpsertMaterialPayload) {
  return apiPost<MaterialItem>(`/admin/materials`, payload);
}

export function updateMaterial(materialId: number, payload: UpsertMaterialPayload) {
  return apiPut<MaterialItem>(`/admin/materials/${materialId}`, payload);
}

export function removeMaterial(materialId: number) {
  return apiDelete<void>(`/admin/materials/${materialId}`);
}