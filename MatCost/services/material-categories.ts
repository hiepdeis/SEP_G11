import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

export type CategoryItem = {
  categoryId: number;
  code: string;
  name: string;
  description?: string;
};

export type CategoryPagedResult = {
  items: CategoryItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type UpsertCategoryPayload = {
  code: string;
  name: string;
  description?: string;
};

export function getCategories() {
  return apiGet<CategoryPagedResult>("/admin/master-data/categories");
}

export function createCategory(body: UpsertCategoryPayload) {
  return apiPost<CategoryItem>("/admin/master-data/categories", body);
}

export function updateCategory(categoryId: number, body: UpsertCategoryPayload) {
  return apiPut<void>(`/admin/master-data/categories/${categoryId}`, body);
}

export function deleteCategory(categoryId: number) {
  return apiDelete<void>(`/admin/master-data/categories/${categoryId}`);
}