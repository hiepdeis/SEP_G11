import { ContractDto } from "@/services/admin-suppliers";

export interface BaseItem {
  _id: number;
}

export interface Role extends BaseItem {
  roleName: string;
}

export interface Category extends BaseItem {
  code: string;
  name: string;
  description: string;
}

export interface AdjReason extends BaseItem {
  code: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface SupplierItem extends BaseItem {
  code: string;
  name: string;
  taxCode: string;
  address: string;
  contracts: ContractDto[];
}

export interface WarehouseRow extends BaseItem {
  name: string;
  address: string;
}

export interface BinRow extends BaseItem {
  warehouseId: number;
  code: string;
  type: string;
}

export interface ProjectItem extends BaseItem {
  code: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  status: string | null;
  contracts: ContractDto[];
}

export interface Material extends BaseItem {
  materialId: number;
  code: string;
  name: string;
  unit: string;
  massPerUnit: number | null;
  minStockLevel: number | null;
  categoryId: number | null;
  unitPrice: number | null;
  technicalStandard: string;
  specification: string;
}
