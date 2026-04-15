import axiosClient from "@/lib/axios-client";

export interface Supplier {
  supplierId: number;
  code: string;
  name: string;
  taxCode: string | null;
  address: string | null;
  contracts: any[]; // nếu sau này có model Contract thì thay lại
}

export const supplierApi = {
  // Lấy danh sách supplier
  getSuppliers: async (): Promise<Supplier[]> => {
    const response = await axiosClient.get("/Suppliers");
    return response.data;
  }
}