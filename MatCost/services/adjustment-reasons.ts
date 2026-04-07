import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";

export type AdjustmentReasonItem = {
  reasonId: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
};

export type AdjustmentReasonPagedResult = {
  items: AdjustmentReasonItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type UpsertAdjustmentReasonPayload = {
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
};

export type CreateAdjustmentReasonResponse = {
  id: number;
  message: string;
};

export function getAdjustmentReasons() {
  return apiGet<AdjustmentReasonPagedResult>("/admin/master-data/adjustment-reasons");
}

export function createAdjustmentReason(body: UpsertAdjustmentReasonPayload) {
  return apiPost<CreateAdjustmentReasonResponse>("/admin/master-data/adjustment-reasons", body);
}

export function updateAdjustmentReason(id: number, body: UpsertAdjustmentReasonPayload) {
  return apiPut<void>(`/admin/master-data/adjustment-reasons/${id}`, body);
}

export function deleteAdjustmentReason(id: number) {
  return apiDelete<void>(`/admin/master-data/adjustment-reasons/${id}`);
}
