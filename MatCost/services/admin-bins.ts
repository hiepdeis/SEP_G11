import { apiGet } from "@/lib/api";

export type BinItem = {
  binId: number;
  code: string;
  warehouseId: number;
  type: string;
};

export type BinResponse =
  | BinItem[]
  | {
      items: BinItem[];
      page?: number;
      pageSize?: number;
      totalItems?: number;
      totalPages?: number;
    };

export type GetBinsParams = {
  warehouseId?: number;
};

export function getBins(params: GetBinsParams = {}) {
  const qs = new URLSearchParams();

  if (params.warehouseId) {
    qs.set("warehouseId", String(params.warehouseId));
  }

  const query = qs.toString();
  return apiGet<BinResponse>(`/admin/master-data/bin-locations${query ? `?${query}` : ""}`);
}