import axiosClient from "@/lib/axios-client";

export interface CreateAuditPlanRequest { title: string; warehouseId: number; binLocationIds?: number[]; plannedStartDate: string; plannedEndDate: string; notes?: string; }
export interface UpdateAuditPlanRequest { title: string; warehouseId: number; binLocationIds?: number[]; plannedStartDate: string; plannedEndDate: string; }
export interface AuditListItemDto { stockTakeId: number; title: string; status: string; warehouseId: number; warehouseName: string; plannedStartDate: string; plannedEndDate: string; countingProgress: number; }
export interface EligibleStaffDto { userId: number; fullName: string; email: string; }
export interface AssignedMemberDto { userId: number; fullName: string; roleInTeam?: string; assignedAt: string; }
export interface AuditTeamResponse { stockTakeId: number; title: string; assignedMembers: AssignedMemberDto[]; }
export interface CountItemDto { materialId: number; binId: number; batchId: number; materialName: string; batchCode: string; binCode: string; countQty?: number | null; countedBy?: number; countedAt?: string; countRound?: number; unitName?: string; variance?: number; discrepancyStatus?: string; }
export interface MaterialBatchDto { materialId: number; materialName: string; batchId: number; batchCode: string; }
export interface UpsertCountRequest { materialId: number; binCode: string; batchCode: string; countQty: number; reason?: string; }
export interface AuditMetricsDto { totalItems: number; countedItems: number; matchedItems: number; discrepancyItems: number; countingProgress: number; }
export interface VarianceItemDto { id: number; materialName: string; binCode: string; batchCode: string; systemQty: number; countQty: number; variance: number; discrepancyStatus: string; resolutionAction?: string; countRound?: number; unitPrice: number; }
export interface StockTakeReviewDetailDto { stockTakeId: number; title: string; status: string; warehouseId: number; warehouseName: string; notes?: string; metrics: AuditMetricsDto; signatures?: SignatureInfoDto[]; timeline?: any; teamMembers?: any; varianceSummary?: any; penalty?: PenaltyInfoDto; }
export interface PenaltyInfoDto { penaltyId: number; reason: string; amount: number; notes?: string; issuedByUserId: number; issuedByName?: string; targetUserId: number; targetUserName?: string; createdAt: string; }
export interface SignatureInfoDto { userId: number; fullName: string; role: string; signedAt: string; notes?: string; }
export interface RecountCandidateDto { userId: number; fullName: string; isActive: boolean; assignedAt: string; removedAt?: string; }

export const auditService = {
  createPlan: async (data: CreateAuditPlanRequest) => {
    const payload = { ...data, binLocationIds: data.binLocationIds || [] };
    const response = await axiosClient.post("/accountants/audits/plans", payload);
    return response.data;
  },
  updatePlan: async (id: number, data: UpdateAuditPlanRequest) => {
    const payload = { ...data, binLocationIds: data.binLocationIds || [] };
    const response = await axiosClient.put(`/accountants/audits/plans/${id}`, payload);
    return response.data;
  },
  deletePlan: async (id: number) => {
    const response = await axiosClient.delete(`/accountants/audits/plans/${id}`);
    return response.data;
  },
  getPlanById: async (id: number) => {
    const response = await axiosClient.get(`/accountants/audits/plans/${id}`);
    return response.data;
  },
  getAll: async () => {
    const response = await axiosClient.get<{ items: AuditListItemDto[], total: number }>("/manager/audits");
    return response.data.items;
  },
  getTeam: async (stockTakeId: number) => {
    const response = await axiosClient.get<AuditTeamResponse>(`/manager/audits/${stockTakeId}/team`);
    return response.data;
  },
  getEligibleStaff: async (stockTakeId: number) => {
    const response = await axiosClient.get<EligibleStaffDto[]>(`/manager/audits/${stockTakeId}/eligible-staff`);
    return response.data;
  },
  saveTeam: async (stockTakeId: number, userIds: number[]) => {
    const payload = { memberUserIds: userIds, roleInTeam: "Counter" };
    const response = await axiosClient.post(`/manager/audits/${stockTakeId}/team`, payload);
    return response.data;
  },
  removeMember: async (stockTakeId: number, userId: number) => {
    const response = await axiosClient.delete(`/manager/audits/${stockTakeId}/team/${userId}`);
    return response.data;
  },

  // --- STAFF COUNTING APIs ---
  getCountedItems: async (stockTakeId: number, skip: number = 0, take: number = 200) => {
    const response = await axiosClient.get<MaterialBatchDto[]>(`/staff/audits/${stockTakeId}/counted-items`, { params: { skip, take } });
    return response.data;
  },
  getUncountedItems: async (stockTakeId: number, skip: number = 0, take: number = 200) => {
    const response = await axiosClient.get<MaterialBatchDto[]>(`/staff/audits/${stockTakeId}/uncounted-items`, { params: { skip, take } });
    return response.data;
  },
  getRecountItems: async (stockTakeId: number, keyword: string = "") => {
    const response = await axiosClient.get<CountItemDto[]>(`/staff/audits/${stockTakeId}/recount-items`, { params: { keyword } });
    return response.data;
  },
  submitRecount: async (stockTakeId: number, data: UpsertCountRequest) => {
    const response = await axiosClient.post(`/staff/audits/${stockTakeId}/recount-items`, data);
    return response.data;
  },
  submitCount: async (stockTakeId: number, data: UpsertCountRequest) => {
    const response = await axiosClient.post(`/staff/audits/${stockTakeId}/count-items`, data);
    return response.data;
  },
  finishWork: async (stockTakeId: number) => {
    const response = await axiosClient.post(`/staff/audits/${stockTakeId}/finish`);
    return response.data;
  },

  // --- REVIEW APIs ---
  getReviewDetail: async (stockTakeId: number) => {
    const response = await axiosClient.get<StockTakeReviewDetailDto>(`/manager/audits/${stockTakeId}/review-detail`);
    return response.data;
  },
  getVariances: async (stockTakeId: number) => {
    const response = await axiosClient.get<{items: VarianceItemDto[]}>(`/manager/audits/${stockTakeId}/variances/details`);
    return response.data.items;
  },
  resolveVariance: async (stockTakeId: number, detailId: number, resolutionAction: string, adjustmentReasonId?: number, signatureData?: string, notes?: string) => {
    const payload = { resolutionAction, adjustmentReasonId, signatureData, notes };
    const response = await axiosClient.put(`/manager/audits/${stockTakeId}/variances/${detailId}/resolve`, payload);
    return response.data;
  },
  resolveVariances: async (stockTakeId: number, detailIds: number[], resolutionAction: string, adjustmentReasonId?: number, notes?: string) => {
    const payload = { detailIds, resolutionAction, adjustmentReasonId, notes };
    const response = await axiosClient.put(`/manager/audits/${stockTakeId}/variances/bulk-resolve`, payload);
    return response.data;
  },
  requestRecount: async (stockTakeId: number, detailId: number, reasonId: number, note: string = "") => {
    const payload = { reasonId, note };
    const response = await axiosClient.put(`/manager/audits/${stockTakeId}/variances/${detailId}/request-recount`, payload);
    return response.data;
  },
  requestRecountAll: async (stockTakeId: number, reasonId: number, note: string = "") => {
    const payload = { reasonId, note };
    const response = await axiosClient.post(`/manager/audits/${stockTakeId}/request-recount-all`, payload);
    return response.data;
  },
  managerConfirmResolution: async (stockTakeId: number, signatureData?: string) => {
    const response = await axiosClient.post(`/manager/audits/${stockTakeId}/confirm-resolution`, { signatureData });
    return response.data;
  },
  
  // RECOUNT TEAM MANAGEMENT
  getRecountCandidates: async (stockTakeId: number) => {
    const response = await axiosClient.get<{items: RecountCandidateDto[]}>(`/manager/audits/${stockTakeId}/recount-candidates`);
    return response.data.items;
  },
  rejoinForRecount: async (stockTakeId: number, userId: number) => {
    const response = await axiosClient.post(`/manager/audits/${stockTakeId}/recount-candidates/${userId}/rejoin`);
    return response.data;
  },

  lockAudit: async (stockTakeId: number) => {
    const response = await axiosClient.post(`/accountants/audits/${stockTakeId}/lock`);
    return response.data;
  },
  signOff: async (stockTakeId: number, notes: string = "") => {
    const response = await axiosClient.post(`/manager/audits/${stockTakeId}/sign-off`, { notes });
    return response.data;
  },
  finalizeAudit: async (stockTakeId: number, notes: string = "") => {
    const response = await axiosClient.post(`/manager/audits/${stockTakeId}/complete`, { notes });
    return response.data;
  },

  // ===== NEW WORKFLOW APIs =====
  
  /** Accountant reviews: action = "Approve" | "ForwardToManager" */
  accountantReview: async (stockTakeId: number, action: string, signatureData?: string) => {
    const response = await axiosClient.post(`/accountants/audits/${stockTakeId}/review`, { action, signatureData });
    return response.data;
  },

  /** Accountant approves Manager's resolution → complete + update inventory */
  accountantApproveResolve: async (stockTakeId: number, signatureData?: string) => {
    const response = await axiosClient.post(`/accountants/audits/${stockTakeId}/approve-resolve`, { signatureData });
    return response.data;
  },

  /** Accountant rejects Manager's resolution → escalate to Admin */
  accountantRejectResolve: async (stockTakeId: number, notes: string = "", signatureData?: string) => {
    const response = await axiosClient.post(`/accountants/audits/${stockTakeId}/reject-resolve`, { notes, signatureData });
    return response.data;
  },

  /** Admin issues penalty + signs → complete + update inventory */
  adminFinalize: async (stockTakeId: number, data: {
    penaltyReason: string;
    penaltyAmount: number;
    penaltyNotes?: string;
    targetManagerUserId: number;
    auditNotes?: string;
    signatureData?: string;
  }) => {
    const response = await axiosClient.post(`/admin/audits/${stockTakeId}/finalize`, data);
    return response.data;
  },

  // PDF EXPORT
  exportPdf: async (stockTakeId: number) => {
    const response = await axiosClient.get(`/audits/${stockTakeId}/report/pdf`, { responseType: 'blob' });
    return response.data;
  }
};

export const staffNotificationApi = {
  getUnreadNotifications: (skip: number = 0, take: number = 50) => {
    return axiosClient.get<any[]>("/staff/notifications", {
      params: { skip, take, unreadOnly: true }
    });
  },
};

export const accountantNotificationApi = {
  getUnreadNotifications: (skip: number = 0, take: number = 50) => {
    return axiosClient.get<any[]>("/accountant/notifications", {
      params: { skip, take }
    });
  },
};

export const managerAuditNotificationApi = {
  getUnreadNotifications: (skip: number = 0, take: number = 50) => {
    return axiosClient.get<any[]>("/manager/audit-notifications", {
      params: { skip, take }
    });
  },
};