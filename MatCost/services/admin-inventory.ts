import { apiGet } from "@/lib/api";

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

export function getInventoryByMaterial(materialId: number) {
  return apiGet<InventoryGroup[]>(`/admin/materials/${materialId}/inventory`);
}