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
export interface TrackingSlipInfo {
  slipId: number;
  slipCode: string;
  status: string;
  slipType: string; 
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
  groupby: boolean;
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
  trackingSlips?: TrackingSlipInfo[] | null;
  projectInfo: {
    projectId: number;
    name: string;
    totalBudget: number;
    budgetUsed: number;
    budgetRemaining: number;
    totalRequestCost: number;
    remainingAfterIssue: number;
    isOverBudget: boolean;
    actualFifoCost: number;
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

// dto cho kế toán
export interface AccountingReconciliationDto {
  parentIssueId: number;
  parentIssueCode: string;
  projectName: string;
  projectBudgetTotal: number;
  projectBudgetUsedBefore: number;
  totalFinalCost: number;
  projectBudgetUsedAfter: number;
  childSlips: ChildSlipAccountingDto[];
}

export interface ChildSlipAccountingDto {
  slipId: number;
  slipCode: string;
  slipType: string; // "Internal_IS" | "Direct_PO"
  status: string;
  actualTotal: number;
  liabilities: SupplierLiabilityDto[];
  details: AccountingDetailItemDto[];
}

export interface SupplierLiabilityDto {
  supplierId?: number;
  supplierName: string;
  amount: number;
}

export interface AccountingDetailItemDto {
  materialName: string;
  unit: string;
  requestedQty: number;
  finalUnitPrice: number;
  lineTotal: number;
  supplierName: string;
}

export const issueSlipApi = {
  
  getIssueSlips: async (): Promise<IssueSlip[]> => {
    const response = await axiosClient.get("/IssueSlips");
    let data = response.data; 
    const role = sessionStorage.getItem("role");
    if (role === 'ConstructionTeam') {
       const statusMap: Record<string, string> = {
        'Pending_Review': 'Request Submitted',
        'Pending_Admin_Approval': 'Processing',
        'Admin_Approved': 'Processing',
        'Pending_Warehouse_Approval': 'Processing',
        'Processed': 'Processing',
        'Draft_Issue_Note': 'Processing',
        'Forwarded_To_Purchasing': 'Purchasing',
        'Draft_Direct_PO': 'Purchasing',
        'Picking_In_Progress': 'Preparing Goods',
        'Ready_For_Delivery': 'In Transit',
        'Completed': 'Completed',
        'Rejected': 'Rejected',
        'Rejected_By_Admin': 'Rejected',
        'Cancelled': 'Cancelled'
      };
      
      data = data.map(item => ({
        ...item,
        status: statusMap[item.status] || item.status 
      }));
    }
   return data; 
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
    let data = response.data;
    const role = sessionStorage.getItem("role");
    if (role === 'ConstructionTeam' && data) {
      const statusMap: Record<string, string> = {
        'Pending_Review': 'Request Submitted',
        'Pending_Admin_Approval': 'Processing',
        'Admin_Approved': 'Processing',
        'Pending_Warehouse_Approval': 'Processing',
        'Processed': 'Processing',
        'Draft_Issue_Note': 'Processing',
        'Forwarded_To_Purchasing': 'Purchasing',
        'Draft_Direct_PO': 'Purchasing',
        'Picking_In_Progress': 'Preparing Goods',
        'Ready_For_Delivery': 'In Transit',
        'Completed': 'Completed',
        'Rejected': 'Rejected',
        'Rejected_By_Admin': 'Rejected',
        'Cancelled': 'Cancelled'
      };
      data.status = statusMap[data.status] || data.status;
      if (data.generatedSlips && Array.isArray(data.generatedSlips)) {
        data.generatedSlips = data.generatedSlips.map((slip: any) => ({
          ...slip,
          status: statusMap[slip.status] || slip.status
        }));
      }
    }

    data.groupby = false;

    // 2. FORMAT LẠI BẢNG VẬT TƯ
    if (data && data.details) {
      if (role === 'Accountant') {

      } else {
        // --- VIEW CÁC ROLE KHÁC: GỘP THEO MATERIAL ID ---
        const groupedObj = data.details.reduce((acc: Record<number, any>, current: any) => {
          const matId = current.materialId;

          if (!acc[matId]) {
            // Lần đầu gặp: Clone object và clone mảng fifo ra để không bị tham chiếu
            acc[matId] = { ...current };
            if (current.fifoSuggestedBatches && current.fifoSuggestedBatches.length > 0) {
              acc[matId].fifoSuggestedBatches = [ { ...current.fifoSuggestedBatches[0] } ];
            } else {
              acc[matId].fifoSuggestedBatches = [];
            }
          } else {
            // Đã có: CỘNG DỒN CÁI NGOÀI (Kệ nó, cứ cộng)
            acc[matId].requestedQuantity += current.requestedQuantity;
            acc[matId].lineTotal += current.lineTotal; 

            // GỘP VÀ CỘNG DỒN CÁI BÊN TRONG (fifoSuggestedBatches)
            const hasCurrBatch = current.fifoSuggestedBatches && current.fifoSuggestedBatches.length > 0;
            
            if (hasCurrBatch) {
              if (!acc[matId].fifoSuggestedBatches || acc[matId].fifoSuggestedBatches.length === 0) {
                acc[matId].fifoSuggestedBatches = [ { ...current.fifoSuggestedBatches[0] } ];
              } else {
                // Cộng dồn Số lượng lô và Tổng tiền lô
                const accBatch = acc[matId].fifoSuggestedBatches[0];
                const currBatch = current.fifoSuggestedBatches[0];
                
                accBatch.qtyToTake += currBatch.qtyToTake;
                accBatch.lineTotal += currBatch.lineTotal;
              }
            }
          }
          return acc;
        }, {});

        // CHUYỂN OBJECT THÀNH MẢNG VÀ TÍNH LẠI UNITPRICE "BÊN TRONG"
        data.details = Object.values(groupedObj).map((item: any) => {
          if (item.fifoSuggestedBatches && item.fifoSuggestedBatches.length > 0) {
            const batch = item.fifoSuggestedBatches[0];
            // Trung bình giá Lô = Tổng tiền các lô / Tổng số lượng
            batch.unitPrice = batch.qtyToTake > 0 
              ? (batch.lineTotal / batch.qtyToTake) 
              : 0;
          }
          return item;
        });
      }
    }
    console.log(data);
    return data;
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
  },

  getPickingList: async (issueId: number) => {
    const response = await axiosClient.get(`/IssueSlips/${issueId}/picking-list`);
    return response.data;
  },
  
  getAccountingReconciliation: async (issueId: number): Promise<AccountingReconciliationDto> => {
    const response = await axiosClient.get(`/IssueSlips/${issueId}/accounting-reconciliation`);
    return response.data;

    // return new Promise((resolve) => {
    //   setTimeout(() => {
    //     resolve({
    //       parentIssueId: issueId || 1,
    //       parentIssueCode: `REQ-2026-${issueId?.toString().padStart(4, '0') || '0089'}`,
    //       projectName: "Dự án Nâng cấp Hầm Thủ Thiêm - Giai đoạn 2",
    //       projectBudgetTotal: 1500000000,
    //       projectBudgetUsedBefore: 850000000,
    //       totalFinalCost: 112500000,
    //       projectBudgetUsedAfter: 962500000,
    //       childSlips: [
    //         {
    //           slipId: 101,
    //           slipCode: "DPO-2026-1102",
    //           slipType: "Direct_PO",
    //           status: "Đã nhận hàng",
    //           actualTotal: 75000000,
    //           liabilities: [
    //             { supplierName: "Công ty Thép Hòa Phát", amount: 45000000 },
    //             { supplierName: "Xi măng Hà Tiên", amount: 30000000 }
    //           ],
    //           details: [
    //             { materialName: "Thép Hòa Phát D10", unit: "Tấn", requestedQty: 2, finalUnitPrice: 22500000, lineTotal: 45000000, supplierName: "Công ty Thép Hòa Phát" },
    //             { materialName: "Xi măng PC40", unit: "Bao", requestedQty: 300, finalUnitPrice: 100000, lineTotal: 30000000, supplierName: "Xi măng Hà Tiên" }
    //           ]
    //         },
    //         {
    //           slipId: 102,
    //           slipCode: "IIS-2026-2204",
    //           slipType: "Internal_IS",
    //           status: "Đã xuất kho",
    //           actualTotal: 37500000,
    //           liabilities: [],
    //           details: [
    //             { materialName: "Bản mã thép 200x200", unit: "Cái", requestedQty: 50, finalUnitPrice: 750000, lineTotal: 37500000, supplierName: "Kho Nội Bộ" }
    //           ]
    //         }
    //       ]
    //     });
    //   }, 500);
    // });
  },
  
  finalizeAccounting: async (id: number, payload: {slipType: string, voucherNo: string; accountingDate: string; finalTotalAmount?: number }) => {
    const response = await axiosClient.post(`/IssueSlips/${id}/finalize-accounting`, payload);
    return response.data;
    
    // return new Promise((resolve) => {
    //   setTimeout(() => {
    //     resolve({ success: true, message: "Hạch toán thành công (Simulated)" });
    //   }, 800);
    // });
  }
};


