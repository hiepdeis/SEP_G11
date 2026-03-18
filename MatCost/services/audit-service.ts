import axiosClient from "@/lib/axios-client";

// --- DTO Types ---
export interface CreateAuditPlanRequest {
  title: string;
  warehouseId: number;
  binLocationIds?: number[]; // Nếu không có bin nào được chọn, backend sẽ hiểu là áp dụng cho toàn bộ kho
  plannedStartDate: string;
  plannedEndDate: string;
  notes?: string;
}

export interface AuditListItemDto {
  stockTakeId: number;
  title: string;
  status: string;
  warehouseId: number;
  warehouseName: string;
  plannedStartDate: string;
  plannedEndDate: string;
  countingProgress: number;
}

export interface EligibleStaffDto {
  userId: number;
  fullName: string;
  email: string;
}

export interface AssignedMemberDto {
  userId: number;
  fullName: string;
  roleInTeam?: string;
  assignedAt: string;
}

export interface AuditTeamResponse {
  stockTakeId: number;
  title: string;
  assignedMembers: AssignedMemberDto[];
}

export interface CountItemDto {
  materialId: number;
  binId: number;
  batchId: number;
  materialName: string;
  batchCode: string;
  binCode: string;
  countQty?: number | null;
  countedBy?: number;
  countedAt?: string;
}

export interface UpsertCountRequest {
  materialId: number;
  binCode: string;
  batchCode: string;
  countQty: number;
  reason?: string;
}

// --- Các DTO mới cho phần Review Detail ---
export interface AuditMetricsDto {
  totalItems: number;
  countedItems: number;
  matchedItems: number;
  discrepancyItems: number;
  countingProgress: number;
}

export interface VarianceItemDto {
  id: number;
  materialName: string;
  binCode: string;
  batchCode: string;
  systemQty: number;
  countQty: number;
  variance: number;
  discrepancyStatus: string;
  resolutionAction?: string;
}

export interface StockTakeReviewDetailDto {
  stockTakeId: number;
  title: string;
  status: string;
  metrics: AuditMetricsDto;
}

// --- Service Functions ---
export const auditService = {
  // 1. Accountant: Create Plan
  createPlan: async (data: CreateAuditPlanRequest) => {
    // Đảm bảo gửi mảng rỗng nếu không chọn bin để lấy toàn kho
    const payload = { ...data, binLocationIds: data.binLocationIds || [] };
    const response = await axiosClient.post("/accountants/audits/plans", payload);
    return response.data;
  },

  // 2. Lấy danh sách (Dùng API Manager cho tất cả)
  getAll: async () => {
    const response = await axiosClient.get<{ items: AuditListItemDto[], total: number }>("/manager/audits");
    return response.data.items; // Backend mới trả về obj có bọc { items, total }
  },

  // 3. Manager: Get Team Info
  getTeam: async (stockTakeId: number) => {
    const response = await axiosClient.get<AuditTeamResponse>(`/manager/audits/${stockTakeId}/team`);
    return response.data;
  },

  // 4. Manager: Get Eligible Staff
  getEligibleStaff: async (stockTakeId: number) => {
    const response = await axiosClient.get<EligibleStaffDto[]>(`/manager/audits/${stockTakeId}/eligible-staff`);
    return response.data;
  },

  // 5. Manager: Save Team
  saveTeam: async (stockTakeId: number, userIds: number[]) => {
    const payload = { memberUserIds: userIds, roleInTeam: "Counter" };
    const response = await axiosClient.post(`/manager/audits/${stockTakeId}/team`, payload);
    return response.data;
  },

  // Manager: Khóa kho để bắt đầu đếm
  lockAudit: async (stockTakeId: number) => {
    const response = await axiosClient.post(`/manager/audits/${stockTakeId}/lock`);
    return response.data;
  },

  // 6. Manager: Remove Member
  removeMember: async (stockTakeId: number, userId: number) => {
    const response = await axiosClient.delete(`/manager/audits/${stockTakeId}/team/${userId}`);
    return response.data;
  },

  // 7. Staff: Get Items to Count
  getCountItems: async (stockTakeId: number, keyword: string = "", uncountedOnly: boolean = false) => {
    const response = await axiosClient.get<CountItemDto[]>(`/staff/audits/${stockTakeId}/count-items`, {
      params: { keyword, uncountedOnly }
    });
    return response.data;
  },

  // 7.1. Staff: Get Items that require Recount
  getRecountItems: async (stockTakeId: number, keyword: string = "") => {
    const response = await axiosClient.get<CountItemDto[]>(`/staff/audits/${stockTakeId}/recount-items`, {
      params: { keyword }
    });
    return response.data;
  },

  // 7.2. Staff: Submit Recount Result
  submitRecount: async (stockTakeId: number, data: UpsertCountRequest) => {
    const response = await axiosClient.post(`/staff/audits/${stockTakeId}/recount-items`, data);
    return response.data;
  },

  // 8. Staff: Submit Count (Upsert)
  submitCount: async (stockTakeId: number, data: UpsertCountRequest) => {
    const response = await axiosClient.post(`/staff/audits/${stockTakeId}/count-items`, data);
    return response.data;
  },

  // 9. Staff: Finish Work (Tuy backend mới bạn không gửi Controller này, nhưng tôi cứ để gọi API cũ)
  finishWork: async (stockTakeId: number) => {
    const response = await axiosClient.post(`/staff/audits/${stockTakeId}/finish`);
    return response.data;
  },

  // ==========================================
  // API MỚI CHO TRANG DETAIL (MANAGER REVIEW)
  // ==========================================

  // 10. Lấy chi tiết Review (Gồm Metrics, Timeline, v.v...)
  getReviewDetail: async (stockTakeId: number) => {
    const response = await axiosClient.get<StockTakeReviewDetailDto>(`/manager/audits/${stockTakeId}/review-detail`);
    return response.data;
  },

  // 11. Lấy danh sách chênh lệch (Variances)
  getVariances: async (stockTakeId: number) => {
    const response = await axiosClient.get<{items: VarianceItemDto[]}>(`/manager/audits/${stockTakeId}/variances/details`);
    return response.data.items;
  },

  // 12. Resolve chênh lệch
  resolveVariance: async (stockTakeId: number, detailId: number, resolutionAction: string, adjustmentReasonId?: number) => {
    const payload = { resolutionAction, adjustmentReasonId };
    const response = await axiosClient.put(`/manager/audits/${stockTakeId}/variances/${detailId}/resolve`, payload);
    return response.data;
  },

  // Yêu cầu đếm lại
  requestRecount: async (stockTakeId: number, detailId: number, reasonId: number, note: string = "") => {
    const payload = { reasonId, note };
    const response = await axiosClient.put(`/manager/audits/${stockTakeId}/variances/${detailId}/request-recount`, payload);
    return response.data;
  },

// 13. Manager: Sign Off (Ký xác nhận trước khi chốt)
  signOff: async (stockTakeId: number, notes: string = "") => {
    const payload = { notes };
    const response = await axiosClient.post(`/manager/audits/${stockTakeId}/sign-off`, payload);
    return response.data;
  },

  // 14. Khóa sổ toàn bộ Audit
  finalizeAudit: async (stockTakeId: number, notes: string = "") => {
    const payload = { notes };
    const response = await axiosClient.post(`/manager/audits/${stockTakeId}/complete`, payload);
    return response.data;
  }
};