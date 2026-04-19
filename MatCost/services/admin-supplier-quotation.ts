import axiosClient from "@/lib/axios-client";

export interface SupplierQuotation {
  quoteId: number;
  supplierId: number;
  supplierName: string;
  materialId: number;
  materialCode: string;
  materialName: string;
  price: number;
  currency: string;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}

export interface UpsertSupplierQuotation {
  supplierId: number;
  materialId: number;
  price: number;
  currency: string;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}

export interface SupplierQuotationPagedResult {
  data: SupplierQuotation[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export const adminSupplierQuotationService = {
  async getSupplierQuotations(params: any) {
    const response = await axiosClient.get<SupplierQuotationPagedResult>(
      "/admin/master-data/supplier-quotations",
      {
        params,
      },
    );
    return response.data;
  },
  async getSupplierQuotationById(id: number) {
    const response = await axiosClient.get<SupplierQuotation>(
      `/admin/master-data/supplier-quotations/${id}`,
    );
    return response.data;
  },
  async createSupplierQuotation(data: UpsertSupplierQuotation) {
    const response = await axiosClient.post<number>(
      "/admin/master-data/supplier-quotations",
      data,
    );
    return response.data;
  },
  async updateSupplierQuotation(id: number, data: UpsertSupplierQuotation) {
    const response = await axiosClient.put<boolean>(
      `/admin/master-data/supplier-quotations/${id}`,
      data,
    );
    return response.data;
  },
  async deleteSupplierQuotation(id: number) {
    const response = await axiosClient.delete(
      `/admin/master-data/supplier-quotations/${id}`,
    );
    return response.data;
  },
  async getSupplierQuotationBySupplierId(supplierId: number) {
    const response = await axiosClient.get<SupplierQuotation>(
      `/admin/master-data/supplier-quotations/supplier/${supplierId}`,
    );
    return response.data;
  },
};
