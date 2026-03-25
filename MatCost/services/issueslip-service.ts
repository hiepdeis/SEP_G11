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
  projectName: string;
}


export interface IssueSlipDetailItem {
  detailId: number;
  materialId: number;
  code: string;
  name: string;
  unit: string;
  requestedQuantity: number;      
  availableQuantity: number;     
  isStockSufficient: boolean;    
  unitPrice: number;
  lineTotal: number;
  fifoSuggestedBatches: FifoBatch[];
}

export interface FifoBatch {
  batchId: number;
  batchCode: string;
  mfgDate: string;
  qtyToTake: number;
  unitPrice: number;
  lineTotal: number;
}

export interface IssueSlipDetail {
  issueId: number;
  issueCode: string;
  status: string;
  issueDate: string;
  workItem?: string;
  referenceCode?: string;
  warehouseId: number | null;
  description?: string;
  deliveryLocation?: string;
  department?: string;
  createdBy: {
    createdBy: number;
    username: string;
  };
  generatedSlips?: {
    inventoryId: number;
    inventoryCode: string;
    inventorySent: boolean;
    poId: number;
    poCode: string;
    poSent: boolean;
  } | null;
  projectInfo: {
    projectId: number;
    name: string;
    totalBudget: number;
    budgetUsed: number;
    budgetRemaining: number;
    totalRequestCost: number;
    remainingAfterIssue: number;
    isOverBudget: boolean;
  };
 details: IssueSlipDetailItem[];
}

export interface ReviewIssueRequest {
  action: string;
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

export interface ChangeStatusRequest {
  action: string;
  reason?: string;
  assignedPickerId?: number;
} 

export interface warehousestaffuser {
  userId: number;
  fullName?: string;

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
    const response = await axiosClient.get(`/IssueSlips/${issueId}/details`);
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
  },

  reviewIssue: async (issueId: number,  data: ReviewIssueRequest): Promise<any> => {
    const response = await axiosClient.put(`/IssueSlips/${issueId}/review`, data);
    return response.data;
  },
  
  changeStatus: async ( issueId: number,data: ChangeStatusRequest ): Promise<any> => {
    const response = await axiosClient.post(`/IssueSlips/${issueId}/change-status`,data);
    return response.data; 
  },


  getWarehouseStaff: async (): Promise<warehousestaffuser[]> => {
    const res = await axiosClient.get("/IssueSlips/warehouse-staff");
    return res.data;
  }
  
};


