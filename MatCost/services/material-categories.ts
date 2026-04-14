import axiosClient from "@/lib/axios-client";

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

export type CreateCategoryResponse = {
  id: number;
  message: string;
};

export function getCategories() {
  return axiosClient.get<CategoryPagedResult>("/admin/master-data/categories").then((res) => res.data);
}

export function createCategory(body: UpsertCategoryPayload) {
  return axiosClient.post<CreateCategoryResponse>("/admin/master-data/categories", body).then((res) => res.data);
}

export function updateCategory(categoryId: number, body: UpsertCategoryPayload) {
  return axiosClient.put<void>(`/admin/master-data/categories/${categoryId}`, body).then((res) => res.data);
}

export function deleteCategory(categoryId: number) {
  return axiosClient.delete<void>(`/admin/master-data/categories/${categoryId}`).then((res) => res.data);
}
