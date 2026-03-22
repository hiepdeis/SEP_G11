import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";

export type BinDto = {
  binId: number;
  code: string;
  warehouseId: number;
  type: string;
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
};

export function getBins(params: GetBinsParams = {}) {
  const qs = new URLSearchParams();

  if (params.warehouseId) {
    qs.set("warehouseId", String(params.warehouseId));
  }

  const query = qs.toString();
  return apiGet<BinResponse>(
    `/admin/master-data/bin-locations${query ? `?${query}` : ""}`
  );
}

export function createBin(body: UpsertBinPayload) {
  return apiPost<BinDto>("/admin/master-data/bin-locations", body);
}

export function updateBin(id: number, body: UpsertBinPayload) {
  return apiPut<void>(`/admin/master-data/bin-locations/${id}`, body);
}

export function deleteBin(id: number) {
  return apiDelete<void>(`/admin/master-data/bin-locations/${id}`);
}