import axiosClient from "@/lib/axios-client";

export interface ImportItemDto {
  materialCode: string | null;
  quantity: number | null;
}

export interface CreateImportRequestDto {
  warehouseId: number | null;
  items: ImportItemDto[];
}

export interface ImportExcelResponseDto {
  message: string;
  fileName: string;
}

export interface ImportRequestResultDto {
  receiptId: number;
  status: string;
  message: string;
}

export const importApi = {
  // POST /api/Import/requests
  // Tạo yêu cầu nhập kho thủ công
  createRequest: (data: CreateImportRequestDto) => {
    return axiosClient.post<ImportRequestResultDto>("/Import/requests", data);
  },

  // POST /api/Import/import-excel
  // Import yêu cầu từ file Excel
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

  // GET /api/Import/my-requests
  // Lấy danh sách các yêu cầu của người dùng hiện tại
  getMyRequests: () => {
    return axiosClient.get<CreateImportRequestDto[]>("/Import/my-requests");
  },
};