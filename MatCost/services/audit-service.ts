import axiosClient from "@/lib/axios-client";

// --- DTO Types ---
export interface CreateAuditPlanRequest {
  title: string;
  warehouseId: number;
  plannedStartDate: string;
  plannedEndDate: string;
  notes?: string;
}

export interface AuditPlanResponse {
  stockTakeId: number;
  warehouseId: number;
  title: string;
  status: string;
  plannedStartDate: string;
  plannedEndDate: string;
}

export interface EligibleStaffDto {
  userId: number;
  fullName: string;
  email: string;
}

export interface AssignedMemberDto {
  userId: number;
  fullName: string;
  roleInTeam: string;
  assignedAt: string;
}

export interface AuditTeamResponse {
  stockTakeId: number;
  title: string;
  assignedMembers: AssignedMemberDto[];
}

export interface SaveTeamRequest {
  memberUserIds: number[];
  roleInTeam?: string;
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

export interface AuditPlanListItem {
  stockTakeId: number;
  title: string;
  warehouseId: number;
  // warehouseName?: string;
  plannedStartDate: string;
  status: string;
  progress?: number;
}

// --- Service Functions ---
export const auditService = {
  // GET /api/accountants/audits
  getAll: async () => {
    const response = await axiosClient.get<AuditPlanListItem[]>("/accountants/audits");
    return response.data;
  },
    
  // 1. Accountant: Create Plan
  createPlan: async (data: CreateAuditPlanRequest) => {
    // URL khớp với Backend: api/accountants/audits/plans
    const response = await axiosClient.post<AuditPlanResponse>("/accountants/audits/plans", data);
    return response.data;
  },

  // 2. Manager: Get Team Info
  getTeam: async (stockTakeId: number) => {
    const response = await axiosClient.get<AuditTeamResponse>(`/manager/audits/${stockTakeId}/team`);
    return response.data;
  },

  // 3. Manager: Get Eligible Staff
  getEligibleStaff: async (stockTakeId: number) => {
    const response = await axiosClient.get<EligibleStaffDto[]>(`/manager/audits/${stockTakeId}/eligible-staff`);
    return response.data;
  },

  // 4. Manager: Save Team
  saveTeam: async (stockTakeId: number, userIds: number[]) => {
    const payload: SaveTeamRequest = { memberUserIds: userIds, roleInTeam: "Counter" };
    const response = await axiosClient.post(`/manager/audits/${stockTakeId}/team`, payload);
    return response.data;
  },

  // 5. Manager: Remove Member
  removeMember: async (stockTakeId: number, userId: number) => {
    const response = await axiosClient.delete(`/manager/audits/${stockTakeId}/team/${userId}`);
    return response.data;
  },

  // 6. Staff: Get Items to Count
  getCountItems: async (stockTakeId: number, keyword: string = "", uncountedOnly: boolean = false) => {
    const response = await axiosClient.get<CountItemDto[]>(`/staff/audits/${stockTakeId}/count-items`, {
      params: { keyword, uncountedOnly }
    });
    return response.data;
  },

  // 7. Staff: Submit Count (Upsert)
  submitCount: async (stockTakeId: number, data: UpsertCountRequest) => {
    const response = await axiosClient.put(`/staff/audits/${stockTakeId}/count-items`, data);
    return response.data;
  },

  // 8. Staff: Finish Work
  finishWork: async (stockTakeId: number) => {
    const response = await axiosClient.post(`/staff/audits/${stockTakeId}/finish`);
    return response.data;
  }
};