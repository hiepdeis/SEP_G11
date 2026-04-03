import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

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
  return apiGet<InventoryGroup[]>(`/admin/materials/${materialId}/inventory`);
}

export function createInventory(materialId: number, payload: UpsertInventoryPayload) {
  return apiPost<InventoryRow>(`/admin/materials/${materialId}/inventory`, payload);
}

export function updateInventory(
  materialId: number,
  inventoryId: number,
  payload: UpsertInventoryPayload
) {
  return apiPut<InventoryRow>(
    `/admin/materials/${materialId}/inventory/${inventoryId}`,
    payload
  );
}

export function removeInventory(materialId: number, inventoryId: number) {
  return apiDelete<void>(`/admin/materials/${materialId}/inventory/${inventoryId}`);
}