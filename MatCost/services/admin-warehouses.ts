import { apiGet } from "@/lib/api";

export type WarehouseItem = {
  warehouseId: number;
  name: string;
  address?: string;
  binCount?: number;
};

export type WarehouseResponse =
  | WarehouseItem[]
  | {
      items: WarehouseItem[];
      page?: number;
      pageSize?: number;
      totalItems?: number;
      totalPages?: number;
    };

export function getWarehouses() {
  return apiGet<WarehouseResponse>("/admin/master-data/warehouses");
}