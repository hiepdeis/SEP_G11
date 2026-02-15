import axiosClient from "@/lib/axios-client";

export interface ImportItemDto {
  materialCode: string | null;
  quantity: number;
}

export interface CreateImportRequestDto {
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
};