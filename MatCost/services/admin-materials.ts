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

export function getMaterials(params: GetMaterialsParams = {}) {
  const qs = new URLSearchParams();

  if (params.keyword) qs.set("keyword", params.keyword);
  if (params.categoryId) qs.set("categoryId", String(params.categoryId));
  qs.set("page", String(params.page ?? 1));
  qs.set("pageSize", String(params.pageSize ?? 10));

  return apiGet<MaterialPagedResult>(`/admin/materials?${qs.toString()}`);
}