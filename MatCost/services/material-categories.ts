import { apiGet } from "@/lib/api";

export type CategoryItem = {
  categoryId: number;
  code: string;
  name: string;
};

export type CategoryPagedResult = {
  items: CategoryItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export function getCategories() {
  return apiGet<CategoryPagedResult>("/admin/master-data/categories");
}