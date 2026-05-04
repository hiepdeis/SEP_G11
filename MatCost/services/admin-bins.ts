import axiosClient from "@/lib/axios-client";

export type BinDto = {
  binId: number;
  code: string;
  warehouseId: number;
  type: string;
  currentMaterialId: number | null;
  currentMaterialName: string | null;
  currentMaterialCode: string | null;
  maxStockLevel: number | null;
};

export type BinResponse =
  | BinDto[]
  | {
      items: BinDto[];
      page?: number;
      pageSize?: number;
      totalItems?: number;
      totalPages?: number;
    };

export type GetBinsParams = {
  warehouseId?: number;
};

export type UpsertBinPayload = {
  warehouseId: number;
  code: string;
  type: string;
  currentMaterialId: number | null;
  maxStockLevel: number | null;
};

export type CreateBinResponse = {
  id: number;
  message: string;
};

export function getBins(params: GetBinsParams = {}) {
  const qs = new URLSearchParams();

  if (params.warehouseId) {
    qs.set("warehouseId", String(params.warehouseId));
  }

  const query = qs.toString();
  return axiosClient
    .get<BinResponse>(
      `/admin/master-data/bin-locations${query ? `?${query}` : ""}`,
    )
    .then((res) => res.data);
}

export function createBin(body: UpsertBinPayload) {
  return axiosClient
    .post<CreateBinResponse>("/admin/master-data/bin-locations", body)
    .then((res) => res.data);
}

export function updateBin(id: number, body: UpsertBinPayload) {
  return axiosClient
    .put<void>(`/admin/master-data/bin-locations/${id}`, body)
    .then((res) => res.data);
}

export function deleteBin(id: number) {
  return axiosClient
    .delete<void>(`/admin/master-data/bin-locations/${id}`)
    .then((res) => res.data);
}
