import axiosClient from "@/lib/axios-client";

export interface IssueSlipDetailDto {
  materialId: number;
  quantity: number;
  unitPrice: number;
}

export interface IssueSlipDto {
  projectId: number;
  issueCode: string;
  userId: number;
  description: string;
  WorkItem ?: string;
  Department ?: string;
  DeliveryLocation ?: string;
  ReferenceCode ?: string;
}

export interface IssueSlip {
  issueId: number;
  issueCode: string;
  projectId: number;
  issueDate: string;
  status: string;
  description: string;
}


export interface IssueSlipDetailItem {
  detailId: number;
  materialId: number;
  materialName: string;
  unit: string;
  requestedQty: number;
  totalStock: number;
  isEnough: boolean;
  message: string;
}

export interface IssueSlipDetail {
  issueId: number;
  issueCode: string;
  projectId: number;
  projectName: string;
  warehouseId: number | null;
  warehouseName: string | null;
  issueDate: string;
  status: string;
  createdBy: number;
  createdByName: string;
  description: string;
  workItem?: string;
  department?: string;
  deliveryLocation?: string;
  referenceCode?: string;
  details: IssueSlipDetailItem[];
}

export interface ReviewIssueRequest {
  action: "Approved" | "Rejected";
  reason?: string;
}

export interface Batch {
  batchId: number;
  batchCode: string;
  quantity: number;
}

export interface AllocationItem {
  detailId: number;
  materialId: number;
  materialName: string;
  unit: string;
  requestedQty: number;
  totalAvailable: number;
  isEnough: boolean;
  availableBatches: Batch[];
  suggestedAllocation: any[]; // tuỳ backend
}

export interface IssueSlipAllocation {
  issueId: number;
  issueCode: string;
  projectName: string;
  status: string;
  items: AllocationItem[];
  isAllEnough: boolean;
  hasShortage: boolean;
}

interface AllocationDetail {
  materialName: string;
  batchCode: string;
  allocatedQuantity: number;
  binCode: string;
}

interface InventoryIssueDetail {
  id: number;
  issueCode: string;
  status: string;
  allocationDetails: AllocationDetail[];
}

interface InventoryIssue {
  inventoryIssueId: number;
  issueCode: string;
  createdDate: string;
  status: string;
  issueSlipId: number;
  issueSlipCode: string;
  projectName: string;
}

export const issueSlipApi = {
  getIssueSlips: async (): Promise<IssueSlip[]> => {
    const response = await axiosClient.get("/IssueSlips");
    return response.data;
  },

  createIssueSlip: async (data: IssueSlipDto) => {
    const response = await axiosClient.post("/IssueSlips", data);
    return response.data; // nên trả về issueSlipId
  },

  createIssueSlipDetails: async (
    issueSlipId: number,
    details: IssueSlipDetailDto[]
  ) => {
    const response = await axiosClient.post(
      `/IssueSlips/${issueSlipId}/details`,
      details
    );
    return response.data;
  },


  getIssueSlipDetail: async (issueId: number): Promise<IssueSlipDetail> => {
    const response = await axiosClient.get(`/IssueSlipDetails/${issueId}`);
    return response.data;
  },

  // manager review 
  reviewIssue: async (
    issueId: number,
    data: ReviewIssueRequest
  ): Promise<any> => {
    const response = await axiosClient.put(`/IssueSlips/${issueId}/review`, data);
    return response.data;
  },

  // accountant check inventory for issue slip
  getIssueSlipAllocation: async (issueId: number): Promise<IssueSlipAllocation> => {
    const response = await axiosClient.get(`/IssueSlipDetails/${issueId}/allocation`);
    return response.data;
  },

  // ghi phiếu xuất kho 
  processIssueSlip: async (issueId: number, allocationResult: any): Promise<any> => {
    const response = await axiosClient.post(`/IssueSlipDetails/${issueId}/process`, allocationResult);
    return response.data;
  },

  getInventoryIssueList: async (): Promise<InventoryIssue[]> => {
    const response = await axiosClient.get("/InventoryIssues?status=Processing");
    return response.data;
  },

  getInventoryIssueDetailById: async (issueId: number): Promise<InventoryIssueDetail> => {
    const response = await axiosClient.get(`/InventoryIssues/${issueId}`);
    return response.data;
  },

  handleDispatch: async (issueId: number): Promise<any> => {
    const response = await axiosClient.put(`/InventoryIssues/${issueId}/dispatch`);
    return response.data;
  }
};


