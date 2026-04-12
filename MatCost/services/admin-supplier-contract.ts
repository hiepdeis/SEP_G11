import axiosClient from "@/lib/axios-client";

export type SupplierContractDto = {
  contractId: number;
  contractCode: string;
  contractNumber?: string | null;
  supplierId: number;
  supplierName?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  leadTimeDays?: number | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  status: string;
  isActive: boolean;
  notes?: string | null;
};

export type UpsertSupplierContractDto = {
  contractCode: string;
  contractNumber?: string | null;
  supplierId: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  leadTimeDays?: number | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  status: string;
  isActive: boolean;
  notes?: string | null;
};

export type SupplierContractPagedResult = {
  items: SupplierContractDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export function getSupplierContracts() {
  return axiosClient
    .get<SupplierContractPagedResult>("/admin/master-data/supplier-contracts")
    .then((res) => res.data);
}

export function getSupplierContractById(id: number) {
  return axiosClient
    .get<SupplierContractDto>(`/admin/master-data/supplier-contracts/${id}`)
    .then((res) => res.data);
}

export function createSupplierContract(body: UpsertSupplierContractDto) {
  return axiosClient
    .post<UpsertSupplierContractDto>(
      "/admin/master-data/supplier-contracts",
      body,
    )
    .then((res) => res.data);
}

export function updateSupplierContract(
  id: number,
  body: UpsertSupplierContractDto,
) {
  return axiosClient
    .put<void>(`/admin/master-data/supplier-contracts/${id}`, body)
    .then((res) => res.data);
}

export function deleteSupplierContract(id: number) {
  return axiosClient
    .delete<void>(`/admin/master-data/supplier-contracts/${id}`)
    .then((res) => res.data);
}

export function getSupplierContractBySupplierId(supplierId: number) {
  return axiosClient
    .get<
      SupplierContractDto[]
    >(`/admin/master-data/supplier-contracts/supplier/${supplierId}`)
    .then((res) => res.data);
}
