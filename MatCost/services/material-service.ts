import axiosClient from "@/lib/axios-client";

export interface MaterialDto {
  materialId: number;
  code: string;
  name: string;
  unit?: string | null;
  massPerUnit?: number | null;
  minStockLevel?: number | null;
  categoryId?: number | null;
  unitPrice?: number | null;
}

export interface CreateMaterialDto {
  code: string;
  name: string;
  unit?: string | null;
  massPerUnit?: number | null;
  minStockLevel?: number | null;
}

export const materialApi = {
  getAll: () => {
    return axiosClient.get<MaterialDto[]>("/Materials");
  },

  getById: (id: number) => {
    return axiosClient.get<MaterialDto>(`/Materials/${id}`);
  },

  create: (data: CreateMaterialDto) => {
    return axiosClient.post<MaterialDto>("/Materials", data);
  },

  update: (id: number, data: MaterialDto) => {
    return axiosClient.put<void>(`/Materials/${id}`, data);
  },
};