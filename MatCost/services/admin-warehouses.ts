import axiosClient from "@/lib/axios-client";

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

export type CreateWarehouseResponse = {
  id: number;
  message: string;
};

export function getWarehouses() {
  return axiosClient.get<WarehouseResponse>("/admin/master-data/warehouses").then((res) => res.data);
}

export function createWarehouse(body: UpsertWarehousePayload) {
  return axiosClient.post<CreateWarehouseResponse>("/admin/master-data/warehouses", body).then((res) => res.data);
}

export function updateWarehouse(id: number, body: UpsertWarehousePayload) {
  return axiosClient.put<void>(`/admin/master-data/warehouses/${id}`, body).then((res) => res.data);
}

export function deleteWarehouse(id: number) {
  return axiosClient.delete<void>(`/admin/master-data/warehouses/${id}`).then((res) => res.data);
}
