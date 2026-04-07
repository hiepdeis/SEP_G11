
import axiosClient from "@/lib/axios-client";
import { get } from "http";



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

export interface MaterialBatchInStockDto {
  materialId: string;
  warehouseId: string;
  totalAvailable: number;
  batches: BatchInStockDto[];
}

export interface BatchInStockDto {
  batchId: number;
  batchCode: string;
  mfgDate: string;       // hoặc Date nếu bạn parse
  createdDate: string;   // hoặc Date
  availableQuantity: number;
}


export const materialApi = {
    getMaterials: async (): Promise<MaterialDto[]> => {
        const response = await axiosClient.get("/Materials");
        return response.data;
    },
    getMaterialById: async (materialId: number): Promise<MaterialDto> => {
        const response = await axiosClient.get(`/Materials/${materialId}`);
        return response.data;
    },
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

    getBatchesInStock: async (materialId: number, warehouseId: number) => {
        const response = await axiosClient.get<MaterialBatchInStockDto[]>(`IssueSlips/materials/${materialId}/batches-in-stock?warehouseId=1`);
        return response.data; 
    } 

};