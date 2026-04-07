import axiosClient from "@/lib/axios-client";

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
  supplier: string;
  items: number;
  status: string;
  statusKey: string;
}

export interface RecentIssue {
  id: string;
  date: string;
  project: string;
  items: number;
  status: string;
  statusKey: string;
}

export interface AdminDashboardResponse {
  summary: DashboardSummary;
  lowStockMaterials: LowStockMaterial[];
  recentReceipts: RecentReceipt[];
  recentIssues: RecentIssue[];
}

export async function getAdminDashboard() {
  return axiosClient.get<AdminDashboardResponse>("/dashboard").then((res) => res.data);
}

