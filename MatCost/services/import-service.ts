import axiosClient from "@/lib/axios-client";

export interface ImportItemDto {
  materialCode: string | null;
  materialName: string | null;
  quantity: number;
  unit: string | null;
}

export interface CreateImportRequestDto {
  createdByName: string;
  createdDate: string;
  items: ImportItemDto[];
}

export interface ImportRequestResultDto {
  receiptId: number;
  status: string;
  message: string;
}
  
export interface ImportExcelResponseDto {
  message: string;
  fileName: string;
}

export interface MaterialUnitResponseDto {
  materialCode: string;
  unit: string;
}

export const importApi = {
  createRequest: (data: CreateImportRequestDto) => {
    return axiosClient.post<ImportRequestResultDto>("/Import/requests", data);
  },

  importExcel: (file: File, warehouseId: number) => {
    const formData = new FormData();
    formData.append("File", file);
    formData.append("WarehouseId", warehouseId.toString());

    return axiosClient.post<ImportExcelResponseDto>("/Import/import-excel", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  getMyRequests: () => {
    return axiosClient.get<CreateImportRequestDto[]>("/Import/my-requests");
  },

  getMaterialUnit: (materialCode: string) => {
    return axiosClient.get<MaterialUnitResponseDto>("/Import/material-unit", {
      params: { materialCode }
    });
  },

  getAllMaterialCodeAndName: () => {
    return axiosClient.get<Record<string, string>>("/Import/material-codes-names");
  },
};