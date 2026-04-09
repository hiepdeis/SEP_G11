import axiosClient from "@/lib/axios-client";

export interface InventoryRow {
  id: number;
  warehouseId: number;
  warehouseName: string;
  binId: number;
  binCode: string;
  binType: string;
  batchId: number;
  batchCode: string;
  quantityOnHand: number;
  quantityAllocated: number;
  available: number;
}

export interface InventoryGroup {
  warehouseId: number;
  warehouseName: string;
  totalOnHand: number;
  totalAllocated: number;
  available: number;
  rows: InventoryRow[];
}

export interface UpsertInventoryPayload {
  warehouseId: number;
  binId: number;
  batchId?: number; // chỉ optional, KHÔNG dùng null
  batchCode: string;
  quantityOnHand: number;
  quantityAllocated: number;
}

export function getInventoryByMaterial(materialId: number) {
  return axiosClient
    .get<InventoryGroup[]>(`/admin/materials/${materialId}/inventory`)
    .then((res) => res.data);
}

export function createInventory(materialId: number, payload: UpsertInventoryPayload) {
  return axiosClient
    .post<InventoryRow>(`/admin/materials/${materialId}/inventory`, payload)
    .then((res) => res.data);
}

export function updateInventory(
  materialId: number,
  inventoryId: number,
  payload: UpsertInventoryPayload
) {
  return axiosClient
    .put<InventoryRow>(
      `/admin/materials/${materialId}/inventory/${inventoryId}`,
      payload
    )
    .then((res) => res.data);
}

export function removeInventory(materialId: number, inventoryId: number) {
  return axiosClient
    .delete<void>(`/admin/materials/${materialId}/inventory/${inventoryId}`)
    .then((res) => res.data);
}