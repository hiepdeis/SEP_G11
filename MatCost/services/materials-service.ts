import axiosClient from "@/lib/axios-client";
import { get } from "http";

export interface MaterialDto {
    materialId: number;
    code: string;
    name: string;
    unit: string;
    massPerUnit: number;
}

export const materialApi = {
    getMaterials: async (): Promise<MaterialDto[]> => {
        const response = await axiosClient.get("/Materials");
        return response.data;
    },
    getMaterialById: async (materialId: number): Promise<MaterialDto> => {
        const response = await axiosClient.get(`/Materials/${materialId}`);
        return response.data;
    }
};