import { apiGet } from "@/lib/api";

export interface DashboardSummary {
  totalMaterials: number;
  lowStockCount: number;
  todayReceipts: number;
  todayIssues: number;
}

export interface LowStockMaterial {
  materialId: number;
  code: string;
  name: string;
  unit: string;
  quantityOnHand: number;
  minStockLevel: number;
  warehouseName: string;
}

export interface RecentReceipt {
  id: string;
  date: string;
  warehouseName: string;
  createdBy: string;
  status: string;
  totalAmount: number;
}

export interface AdminDashboardResponse {
  summary: DashboardSummary;
  lowStockMaterials: LowStockMaterial[];
  recentReceipts: RecentReceipt[];
}

export async function getAdminDashboard() {
  return apiGet<AdminDashboardResponse>("/dashboard");
}

