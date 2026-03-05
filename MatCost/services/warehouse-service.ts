import axiosClient from "@/lib/axios-client";

// ==========================================
// DTO Interfaces
// ==========================================

export interface WarehouseListItemDto {
  warehouseId: number;
  name: string | null;
  address: string | null;
}

// ==========================================
// API Service
// ==========================================

export const warehouseApi = {
  // GET /api/Warehouse
  // Lấy danh sách tất cả các kho để hiển thị trong Dropdown
  getAll: () => {
    return axiosClient.get<WarehouseListItemDto[]>("/Warehouses");
  },
};