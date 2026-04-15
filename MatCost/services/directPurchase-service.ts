
import axiosClient from "@/lib/axios-client";

export interface DirectPurchaseDetail {
  dpoDetailId: number;
  materialId: number;
  materialName: string;
  quantity: number;
  negotiatedUnitPrice: number;
  lineTotal: number;
}

export interface DirectPurchase {
  dpoId: number;
  dpoCode: string;
  referenceCode: string;
  supplierId: number | null;
  projectId: number;
  status: string;
  totalAmount: number;
  details: DirectPurchaseDetail[];
}

export interface ConfirmOrderItem {
  dpoDetailId: number;
  negotiatedUnitPrice: number;
  supplierId: number;
}

export interface ConfirmOrderRequest {
  expectedDeliveryDate?: string;
  deliveryAddress: string;
  items: ConfirmOrderItem[];
}
export interface IncomingShipment {
  recordId: number;
  code: string;
  type: string;
  sourceName: string;
  expectedDate: string;
  status: string;
  itemsSummary: string;
  licensePlate: string;
}

 

export const directPurchaseApi = {
  getDirectPurchaseById: async (id: number): Promise<DirectPurchase> => {
    const response = await axiosClient.get(`/DirectPurchase/${id}`);
    return response.data;
  },
  confirmOrder: async (id: number, data: ConfirmOrderRequest) => {
    const res = await axiosClient.post(
      `/DirectPurchase/${id}/confirm-order`,
      data
    );
    return res.data;
  },
  getIncomingShipments: async (): Promise<IncomingShipment[]> => {
    const res = await axiosClient.get(
      `/DirectPurchase/api/site/incoming-shipments`
    );
    return res.data;
  },
};