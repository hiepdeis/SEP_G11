import axiosClient from "@/lib/axios-client";

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
  return axiosClient
    .get<AdjustmentReasonPagedResult>("/admin/master-data/adjustment-reasons")
    .then((res) => res.data);
}

export function createAdjustmentReason(body: UpsertAdjustmentReasonPayload) {
  return axiosClient
    .post<CreateAdjustmentReasonResponse>("/admin/master-data/adjustment-reasons", body)
    .then((res) => res.data);
}

export function updateAdjustmentReason(id: number, body: UpsertAdjustmentReasonPayload) {
  return axiosClient.put<void>(`/admin/master-data/adjustment-reasons/${id}`, body).then((res) => res.data);
}

export function deleteAdjustmentReason(id: number) {
  return axiosClient
    .delete<void>(`/admin/master-data/adjustment-reasons/${id}`)
    .then((res) => res.data);
}
