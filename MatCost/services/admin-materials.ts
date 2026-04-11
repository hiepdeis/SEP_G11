import axiosClient from "@/lib/axios-client";

export type MaterialItem = {
  materialId: number;
  code: string;
  name: string;
  unit: string;
  massPerUnit: number | null;
  minStockLevel: number | null;
  maxStockLevel: number | null;
  categoryId: number | null;
  categoryName?: string;
  unitPrice: number | null;
  technicalStandard: string;
  specification: string;
  isDecimalUnit: boolean;
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
  maxStockLevel: number | null;
  categoryId: number | null;
  unitPrice: number | null;
  technicalStandard: string;
  specification: string;
  isDecimalUnit: boolean;
};

export function getMaterials(params: GetMaterialsParams = {}) {
  const qs = new URLSearchParams();

  if (params.keyword) qs.set("keyword", params.keyword);
  if (params.categoryId) qs.set("categoryId", String(params.categoryId));
  qs.set("page", String(params.page ?? 1));
  qs.set("pageSize", String(params.pageSize ?? 10));

  return axiosClient
    .get<MaterialPagedResult>(`/admin/materials?${qs.toString()}`)
    .then((res) => res.data);
}

export function getMaterialById(materialId: number) {
  return axiosClient
    .get<MaterialItem>(`/admin/materials/${materialId}`)
    .then((res) => res.data);
}

export function createMaterial(payload: UpsertMaterialPayload) {
  return axiosClient
    .post<MaterialItem>(`/admin/materials`, payload)
    .then((res) => res.data);
}

export function updateMaterial(
  materialId: number,
  payload: UpsertMaterialPayload,
) {
  return axiosClient
    .put<MaterialItem>(`/admin/materials/${materialId}`, payload)
    .then((res) => res.data);
}

export function removeMaterial(materialId: number) {
  return axiosClient
    .delete<void>(`/admin/materials/${materialId}`)
    .then((res) => res.data);
}
