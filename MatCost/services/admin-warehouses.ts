import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";

export type WarehouseDto = {
  warehouseId: number;
  name: string;
  address?: string;
  binCount?: number;
};

export type WarehouseResponse =
  | WarehouseDto[]
  | {
      items: WarehouseDto[];
      page?: number;
      pageSize?: number;
      totalItems?: number;
      totalPages?: number;
    };

export type UpsertWarehousePayload = {
  name: string;
  address?: string;
};

export function getWarehouses() {
  return apiGet<WarehouseResponse>("/admin/master-data/warehouses");
}

export function createWarehouse(body: UpsertWarehousePayload) {
  return apiPost<WarehouseDto>("/admin/master-data/warehouses", body);
}

export function updateWarehouse(id: number, body: UpsertWarehousePayload) {
  return apiPut<void>(`/admin/master-data/warehouses/${id}`, body);
}

export function deleteWarehouse(id: number) {
  return apiDelete<void>(`/admin/master-data/warehouses/${id}`);
}