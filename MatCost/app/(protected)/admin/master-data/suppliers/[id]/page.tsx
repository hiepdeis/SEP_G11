"use client";
import { useEffect, useState, useMemo, use } from "react";
import {
  X,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Info,
  Truck,
  Building2,
  CreditCard,
  MapPin,
  ClipboardList,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  DollarSign,
  Package,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { QuantityInput } from "@/components/ui/custom/quantity-input";
import { showConfirmToast } from "@/hooks/confirm-toast";

import {
  getSupplierById,
  type SupplierDto,
  updateSupplier,
  deleteSupplier,
} from "@/services/admin-suppliers";
import { formatMoney } from "@/lib/master-data-utils";

import { SupplierItem } from "@/lib/master-data-types";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { useTranslation } from "react-i18next";
import {
  getSupplierContractBySupplierId,
  createSupplierContract,
  updateSupplierContract,
  deleteSupplierContract,
  type SupplierContractDto,
  type UpsertSupplierContractDto,
} from "@/services/admin-supplier-contract";
import { formatDateTime } from "@/lib/format-date-time";
import {
  adminSupplierQuotationService,
  type SupplierQuotation,
  type UpsertSupplierQuotation,
} from "@/services/admin-supplier-quotation";
import { getMaterials, type MaterialItem } from "@/services/admin-materials";
import { CurrencyInput } from "@/components/ui/custom/currency-input";
import { DateTimePicker } from "@/components/ui/custom/date-time-picker";

export function ContractsExpandedContent({
  contracts,
  emptyMessage,
  onEdit,
  onDelete,
  showSupplierName = false,
}: {
  contracts: SupplierContractDto[];
  emptyMessage: string;
  onEdit?: (contract: SupplierContractDto) => void;
  onDelete?: (id: number) => void;
  showSupplierName?: boolean;
}) {
  const { t } = useTranslation();
  if (contracts.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
        {emptyMessage}
      </div>
    );

  return (
    <div className="space-y-4">
      {contracts.map((contract) => (
        <div
          key={`${contract.contractId}-${contract.contractCode}`}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col"
        >
          <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-start lg:justify-between border-b border-slate-50">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 border-indigo-100 shadow-none">
                  <FileText className="h-3.5 w-3.5" />
                  {contract.contractCode}
                </Badge>
                {contract.contractNumber && (
                  <Badge
                    variant="secondary"
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 font-normal"
                  >
                    {t("No.")}: {contract.contractNumber}
                  </Badge>
                )}
                <Badge
                  variant={contract.isActive ? "default" : "secondary"}
                  className={`rounded-full px-3 py-1 text-xs font-medium border-none shadow-none ${contract.isActive ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-600"}`}
                >
                  {t(contract.status)}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                {showSupplierName && contract.supplierName && (
                  <span>
                    {t("Supplier")}: {contract.supplierName}
                  </span>
                )}
                <span>
                  {t("Effective")}: {formatDateTime(contract.effectiveFrom)}
                </span>
                {contract.effectiveTo && (
                  <span>
                    {t("Expiry")}: {formatDateTime(contract.effectiveTo)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onEdit(contract)}
                  className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDelete(contract.contractId)}
                  className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {t("Lead Time")}
              </label>
              <p className="text-xs font-semibold text-slate-700">
                {contract.leadTimeDays
                  ? `${contract.leadTimeDays} ${t("days")}`
                  : "—"}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {t("Payment Terms")}
              </label>
              <p className="text-xs font-semibold text-slate-700 line-clamp-2">
                {contract.paymentTerms || "—"}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {t("Delivery Terms")}
              </label>
              <p className="text-xs font-semibold text-slate-700 line-clamp-2">
                {contract.deliveryTerms || "—"}
              </p>
            </div>
          </div>

          {contract.notes && (
            <div className="px-4 pb-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 italic">
                <span className="font-bold not-italic text-slate-400 mr-2 uppercase text-[9px]">
                  {t("Notes")}:
                </span>
                {contract.notes}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const resolvedParams = use(params);
  const supplierId = parseInt(resolvedParams.id);

  const [supplier, setSupplier] = useState<SupplierDto | null>(null);
  const [contracts, setContracts] = useState<SupplierContractDto[]>([]);
  const [quotations, setQuotations] = useState<SupplierQuotation[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<SupplierItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Collapsible state
  const [contractsOpen, setContractsOpen] = useState(true);
  const [quotationsOpen, setQuotationsOpen] = useState(true);

  // Contract pagination state
  const [cPage, setCPage] = useState(0);
  const cPageSize = 2;

  // Quotation pagination state
  const [qPage, setQPage] = useState(0);
  const qPageSize = 4;

  // Contract creation state
  const [cModalOpen, setCModalOpen] = useState(false);
  const [creatingC, setCreatingC] = useState(false);
  const [editingCId, setEditingCId] = useState<number | null>(null);
  const [cForm, setCForm] = useState<UpsertSupplierContractDto>({
    contractCode: "",
    contractNumber: "",
    supplierId: supplierId,
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveTo: null,
    leadTimeDays: 7,
    paymentTerms: "",
    deliveryTerms: "",
    status: "Active",
    isActive: true,
    notes: "",
  });

  // Quotation creation state
  const [qModalOpen, setQModalOpen] = useState(false);
  const [creatingQ, setCreatingQ] = useState(false);
  const [editingQId, setEditingQId] = useState<number | null>(null);
  const [qForm, setQForm] = useState<UpsertSupplierQuotation>({
    supplierId: supplierId,
    materialId: 0,
    price: 0,
    currency: "VND",
    validFrom: new Date().toISOString().split("T")[0],
    validTo: "",
    isActive: true,
  });

  useEffect(() => {
    if (isNaN(supplierId)) {
      toast.error(t("Invalid Supplier ID"));
      router.back();
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [data, contractsList, quotationsList, materialsRes] =
          await Promise.all([
            getSupplierById(supplierId),
            getSupplierContractBySupplierId(supplierId),
            adminSupplierQuotationService.getSupplierQuotationBySupplierId(
              supplierId,
            ),
            getMaterials({ page: 1, pageSize: 500 }),
          ]);
        setSupplier(data);
        setContracts(contractsList);
        setQuotations(Array.isArray(quotationsList) ? quotationsList : []);
        setMaterials(materialsRes.items || []);
      } catch (error) {
        console.error("Failed to load supplier detail:", error);
        toast.error(t("Failed to load supplier details"));
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [supplierId, router, t]);

  const openEdit = () => {
    if (!supplier) return;
    setEditing({
      _id: supplier.supplierId,
      code: supplier.code || "",
      name: supplier.name || "",
      taxCode: supplier.taxCode || "",
      address: supplier.address || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
  };

  const save = async () => {
    if (!editing || !supplier) return;
    const code = editing.code?.trim().toUpperCase(),
      name = editing.name?.trim(),
      taxCode = editing.taxCode?.trim() ?? "",
      address = editing.address?.trim() ?? "";

    if (!code || !name) {
      toast.error(t("Code and name cannot be empty"));
      return;
    }

    try {
      setSaving(true);
      await updateSupplier(supplier.supplierId, {
        code,
        name,
        taxCode,
        address,
      });
      setSupplier({ ...supplier, code, name, taxCode, address });
      toast.success(t("Update Successful"));
      closeModal();
    } catch (error) {
      toast.error(t("Save Failed"));
    } finally {
      setSaving(false);
    }
  };

  const openAddContract = () => {
    setCForm({
      contractCode: "",
      contractNumber: "",
      supplierId: supplierId,
      effectiveFrom: new Date().toISOString().split("T")[0],
      effectiveTo: null,
      leadTimeDays: 7,
      paymentTerms: "",
      deliveryTerms: "",
      status: "Active",
      isActive: true,
      notes: "",
    });
    setEditingCId(null);
    setCModalOpen(true);
  };

  const openEditContract = (c: SupplierContractDto) => {
    setCForm({
      contractCode: c.contractCode,
      contractNumber: c.contractNumber || "",
      supplierId: c.supplierId,
      effectiveFrom: c.effectiveFrom.split("T")[0],
      effectiveTo: c.effectiveTo ? c.effectiveTo.split("T")[0] : null,
      leadTimeDays: c.leadTimeDays || 0,
      paymentTerms: c.paymentTerms || "",
      deliveryTerms: c.deliveryTerms || "",
      status: c.status,
      isActive: c.status === "Active",
      notes: c.notes || "",
    });
    setEditingCId(c.contractId);
    setCModalOpen(true);
  };

  const handleSaveContract = async () => {
    if (!cForm.contractCode) {
      toast.error(t("Contract code is required"));
      return;
    }
    if (!cForm.effectiveFrom) {
      toast.error(t("Effective from is required"));
      return;
    }
    if (!cForm.effectiveTo) {
      toast.error(t("Effective to is required"));
      return;
    }
    if (cForm.effectiveTo < cForm.effectiveFrom) {
      toast.error(t("Effective to must be greater than effective from"));
      return;
    }

    try {
      setCreatingC(true);
      if (editingCId) {
        await updateSupplierContract(editingCId, {
          ...cForm,
          contractCode: cForm.contractCode.toUpperCase(),
        });
        toast.success(t("Contract updated successfully"));
      } else {
        await createSupplierContract({
          ...cForm,
          contractCode: cForm.contractCode.toUpperCase(),
        });
        toast.success(t("Contract created successfully"));
      }

      const updatedContractsList =
        await getSupplierContractBySupplierId(supplierId);
      setContracts(updatedContractsList);
      setCModalOpen(false);
    } catch (error: any) {
      console.error("Save contract error:", error);
      toast.error(
        error?.response?.data?.message || t("Failed to save contract"),
      );
    } finally {
      setCreatingC(false);
    }
  };

  const handleDeleteContract = async (id: number) => {
    showConfirmToast({
      title: t("Delete Contract"),
      description: t("Are you sure you want to delete this contract?"),
      onConfirm: async () => {
        try {
          await deleteSupplierContract(id);
          toast.success(t("Contract deleted successfully"));
          const updated = await getSupplierContractBySupplierId(supplierId);
          setContracts(updated);
        } catch (error) {
          toast.error(t("Failed to delete contract"));
        }
      },
    });
  };

  // ========= QUOTATION HANDLERS =========
  const openAddQuotation = () => {
    setQForm({
      supplierId,
      materialId: 0,
      price: 0,
      currency: "VND",
      validFrom: new Date().toISOString().split("T")[0],
      validTo: "",
      isActive: true,
    });
    setEditingQId(null);
    setQModalOpen(true);
  };

  const openEditQuotation = (q: SupplierQuotation) => {
    setQForm({
      supplierId: q.supplierId,
      materialId: q.materialId,
      price: q.price,
      currency: q.currency || "VND",
      validFrom: q.validFrom ? q.validFrom.split("T")[0] : "",
      validTo: q.validTo ? q.validTo.split("T")[0] : "",
      isActive: q.isActive,
    });
    setEditingQId(q.quoteId);
    setQModalOpen(true);
  };

  const handleSaveQuotation = async () => {
    if (!qForm.materialId) {
      toast.error(t("Material is required"));
      return;
    }
    const submitPrice = qForm.price ?? 0;
    if (submitPrice <= 0) {
      toast.error(t("Price must be greater than 0"));
      return;
    }
    if (!qForm.validFrom) {
      toast.error(t("Valid from is required"));
      return;
    }
    if (!qForm.validTo) {
      toast.error(t("Valid to is required"));
      return;
    }
    if (qForm.validTo < qForm.validFrom) {
      toast.error(t("Valid to must be greater than valid from"));
      return;
    }
    const payload = { ...qForm, price: submitPrice };

    try {
      setCreatingQ(true);
      if (editingQId) {
        await adminSupplierQuotationService.updateSupplierQuotation(
          editingQId,
          payload,
        );
        toast.success(t("Quotation updated successfully"));
      } else {
        await adminSupplierQuotationService.createSupplierQuotation(payload);
        toast.success(t("Quotation created successfully"));
      }
      const updated =
        await adminSupplierQuotationService.getSupplierQuotationBySupplierId(
          supplierId,
        );
      setQuotations(Array.isArray(updated) ? updated : []);
      setQModalOpen(false);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || t("Failed to save quotation"),
      );
    } finally {
      setCreatingQ(false);
    }
  };

  const handleDeleteQuotation = async (id: number) => {
    showConfirmToast({
      title: t("Delete Quotation"),
      description: t("Are you sure you want to delete this quotation?"),
      onConfirm: async () => {
        try {
          await adminSupplierQuotationService.deleteSupplierQuotation(id);
          toast.success(t("Quotation deleted successfully"));
          const updated =
            await adminSupplierQuotationService.getSupplierQuotationBySupplierId(
              supplierId,
            );
          setQuotations(Array.isArray(updated) ? updated : []);
        } catch (error) {
          toast.error(t("Failed to delete quotation"));
        }
      },
    });
  };

  const remove = async () => {
    if (!supplier) return;
    showConfirmToast({
      title: t("Are you sure?"),
      description: t("Are you sure you want to delete this record?"),
      onConfirm: async () => {
        try {
          setDeleting(true);
          await deleteSupplier(supplier.supplierId);
          toast.success(t("Delete Successful"));
          router.push("/admin/master-data?tab=suppliers");
        } catch (error) {
          toast.error(t("Delete Failed"));
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  const stats = useMemo(() => {
    if (!supplier || !contracts)
      return { totalValue: 0, contractsCount: 0, materialCount: 0 };
    return {
      totalValue: 0, // No longer in DTO
      contractsCount: contracts.length,
      materialCount: 0, // No longer in DTO
    };
  }, [supplier, contracts]);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500">
            {t("Loading supplier details...")}
          </p>
        </div>
      </div>
    );
  if (!supplier) return null;

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50 text-slate-900">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Supplier Details")} />
        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-8">
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
            {/* HERO Area */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => router.back()}
                  className="mt-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="default"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md shadow-indigo-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase"
                    >
                      {supplier.code}
                    </Badge>
                    <span className="text-xs font-medium text-slate-400">
                      ID: {supplier.supplierId}
                    </span>
                  </div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                    {supplier.name}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={remove}
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 rounded-xl font-bold transition-all shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />{" "}
                  {deleting ? t("Deleting...") : t("Delete")}
                </Button>
                <Button
                  variant="outline"
                  onClick={openEdit}
                  className="flex items-center gap-2 px-4 py-2 border-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all shadow-sm"
                >
                  <Edit2 className="w-4 h-4" /> {t("Edit Supplier Info")}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* LEFT: INFORMATION */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-950 gap-0 pb-0">
                  <CardHeader className="px-6 py-4 border-b border-slate-50 dark:border-slate-900 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-500" />
                      <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        {t("Registration Info")}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase block tracking-tighter">
                        {t("Tax Identification No.")}
                      </Label>
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                        {supplier.taxCode || t("Not Provided")}
                      </p>
                    </div>

                    <Separator className="bg-slate-50 dark:bg-slate-900" />

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                        <MapPin className="w-3.5 h-3.5" />{" "}
                        {t("Business Address")}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                        {supplier.address || t("No address registered")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* RIGHT: CONTRACTS & QUOTATIONS */}
              <div className="lg:col-span-2 space-y-4">
                {/* CONTRACTS - Collapsible */}
                <Card className="border-slate-100 shadow-sm overflow-hidden bg-white gap-0 pb-0 pt-4">
                  <CardHeader
                    className="px-6 py-4 border-b border-slate-50 cursor-pointer select-none"
                    onClick={() => setContractsOpen((v) => !v)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ClipboardList className="w-5 h-5 text-indigo-600" />
                        <div>
                          <CardTitle className="text-lg font-black text-slate-900 tracking-tight">
                            {t("Contracts")}
                          </CardTitle>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            {contracts.length} {t("records")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddContract();
                          }}
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1.5" /> {t("New")}
                        </Button>
                        <ChevronDown
                          className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${contractsOpen ? "rotate-0" : "-rotate-90"}`}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  {contractsOpen && (
                    <CardContent className="p-4">
                      <ContractsExpandedContent
                        contracts={
                          contracts?.slice(
                            cPage * cPageSize,
                            (cPage + 1) * cPageSize,
                          ) || []
                        }
                        onEdit={openEditContract}
                        onDelete={handleDeleteContract}
                        emptyMessage={t(
                          "This supplier has no active contracts.",
                        )}
                      />
                      {contracts && contracts.length > cPageSize && (
                        <div className="mt-4 flex items-center justify-between px-2 py-2 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {t("Page")} {cPage + 1} /{" "}
                            {Math.ceil(contracts.length / cPageSize)}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              disabled={cPage === 0}
                              onClick={() => setCPage((p) => p - 1)}
                              className="h-8 w-8 rounded-full"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              disabled={
                                cPage >=
                                Math.ceil(contracts.length / cPageSize) - 1
                              }
                              onClick={() => setCPage((p) => p + 1)}
                              className="h-8 w-8 rounded-full"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>

                {/* QUOTATIONS - Collapsible */}
                <Card className="border-slate-100 shadow-sm overflow-hidden bg-white gap-0 pb-0 pt-4">
                  <CardHeader
                    className="px-6 py-4 border-b border-slate-50 cursor-pointer select-none"
                    onClick={() => setQuotationsOpen((v) => !v)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        <div>
                          <CardTitle className="text-lg font-black text-slate-900 tracking-tight">
                            {t("Quotations")}
                          </CardTitle>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            {quotations.length} {t("records")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddQuotation();
                          }}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1.5" /> {t("New")}
                        </Button>
                        <ChevronDown
                          className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${quotationsOpen ? "rotate-0" : "-rotate-90"}`}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  {quotationsOpen && (
                    <CardContent className="p-4">
                      {quotations.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                          {t("No quotations found for this supplier.")}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {quotations
                            .slice(qPage * qPageSize, (qPage + 1) * qPageSize)
                            .map((q) => (
                              <div
                                key={q.quoteId}
                                className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="p-2 rounded-lg bg-emerald-50">
                                    <Package className="w-4 h-4 text-emerald-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate">
                                      {q.materialName}
                                    </p>
                                    <p className="text-[11px] text-slate-400 font-mono">
                                      {q.materialCode}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-black text-emerald-700">
                                    {q.price.toLocaleString("vi-VN")}{" "}
                                    <span className="text-[10px] font-medium text-slate-400">
                                      {q.currency}
                                    </span>
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    {q.validFrom
                                      ? formatDateTime(q.validFrom)
                                      : "—"}{" "}
                                    →{" "}
                                    {q.validTo
                                      ? formatDateTime(q.validTo)
                                      : "∞"}
                                  </p>
                                </div>
                                <Badge
                                  variant={q.isActive ? "default" : "secondary"}
                                  className={`text-[10px] shrink-0 ${q.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}
                                >
                                  {q.isActive ? t("Active") : t("Inactive")}
                                </Badge>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => openEditQuotation(q)}
                                    className="h-7 w-7 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() =>
                                      handleDeleteQuotation(q.quoteId)
                                    }
                                    className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                      {quotations.length > qPageSize && (
                        <div className="mt-4 flex items-center justify-between px-2 py-2 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {t("Page")} {qPage + 1} /{" "}
                            {Math.ceil(quotations.length / qPageSize)}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              disabled={qPage === 0}
                              onClick={() => setQPage((p) => p - 1)}
                              className="h-8 w-8 rounded-full"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              disabled={
                                qPage >=
                                Math.ceil(quotations.length / qPageSize) - 1
                              }
                              onClick={() => setQPage((p) => p + 1)}
                              className="h-8 w-8 rounded-full"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={modalOpen} onOpenChange={(val) => !val && closeModal()}>
        {editing && (
          <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950">
            <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
              <DialogTitle className="font-bold text-gray-900 dark:text-slate-100">
                {t("Edit Supplier")}
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {t("Code")} *
                  </Label>
                  <Input
                    value={editing.code || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {t("Name")} *
                  </Label>
                  <Input
                    value={editing.name || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {t("Tax Code")}
                  </Label>
                  <Input
                    value={editing.taxCode || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        taxCode: e.target.value,
                      }))
                    }
                    className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {t("Address")}
                  </Label>
                  <Input
                    value={editing.address || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
              <Button
                variant="ghost"
                onClick={closeModal}
                disabled={saving}
                className="font-medium text-gray-500"
              >
                {t("Cancel")}
              </Button>
              <Button
                onClick={save}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all hover:shadow-indigo-200 shadow-lg shadow-indigo-100"
              >
                {saving ? t("Saving...") : t("Save Changes")}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* NEW CONTRACT DIALOG */}
      <Dialog
        open={cModalOpen}
        onOpenChange={(val) => !val && setCModalOpen(false)}
      >
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950">
          <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
            <DialogTitle className="font-bold text-gray-900 dark:text-slate-100 py-4">
              {editingCId ? t("Edit Contract") : t("Register New Contract")}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {t("Contract Code")} *
                </Label>
                <Input
                  value={cForm.contractCode}
                  onChange={(e) =>
                    setCForm({ ...cForm, contractCode: e.target.value })
                  }
                  placeholder="EX: CONT-2024-001"
                  className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {t("Contract Number")}
                </Label>
                <Input
                  value={cForm.contractNumber || ""}
                  onChange={(e) =>
                    setCForm({ ...cForm, contractNumber: e.target.value })
                  }
                  placeholder={t("Internal reference number")}
                  className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {t("Effective From")} *
                </Label>
                <DateTimePicker
                  value={
                    cForm.effectiveFrom
                      ? new Date(cForm.effectiveFrom)
                      : undefined
                  }
                  onChange={(date) =>
                    setCForm({
                      ...cForm,
                      effectiveFrom: date ? date.toISOString() : "",
                    })
                  }
                  placeholder={t("Pick date")}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {t("Effective To")} *
                </Label>
                <DateTimePicker
                  value={
                    cForm.effectiveTo ? new Date(cForm.effectiveTo) : undefined
                  }
                  onChange={(date) =>
                    setCForm({
                      ...cForm,
                      effectiveTo: date ? date.toISOString() : "",
                    })
                  }
                  placeholder={t("Pick date")}
                  minDate={
                    cForm.effectiveFrom
                      ? new Date(cForm.effectiveFrom)
                      : undefined
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1 space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {t("Lead Time (Days)")}
                </Label>
                <QuantityInput
                  value={cForm.leadTimeDays}
                  onValueChange={(val) =>
                    setCForm({ ...cForm, leadTimeDays: val })
                  }
                  className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800"
                />
              </div>
              <div className="col-span-1 space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {t("Status")}
                </Label>
                <Select
                  value={cForm.status}
                  onValueChange={(val) =>
                    setCForm({
                      ...cForm,
                      status: val,
                      isActive: val === "Active",
                    })
                  }
                >
                  <SelectTrigger className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800 w-full">
                    <SelectValue placeholder={t("Select status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">{t("Active")}</SelectItem>
                    <SelectItem value="Inactive">{t("Inactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {t("Payment Terms")}
                </Label>
                <Textarea
                  value={cForm.paymentTerms || ""}
                  onChange={(e) =>
                    setCForm({ ...cForm, paymentTerms: e.target.value })
                  }
                  rows={2}
                  className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800 resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {t("Delivery Terms")}
                </Label>
                <Textarea
                  value={cForm.deliveryTerms || ""}
                  onChange={(e) =>
                    setCForm({ ...cForm, deliveryTerms: e.target.value })
                  }
                  rows={2}
                  className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800 resize-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                {t("Internal Notes")}
              </Label>
              <Textarea
                value={cForm.notes || ""}
                onChange={(e) => setCForm({ ...cForm, notes: e.target.value })}
                className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800"
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
            <Button
              variant="ghost"
              onClick={() => setCModalOpen(false)}
              disabled={creatingC}
              className="font-medium text-gray-500"
            >
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleSaveContract}
              disabled={creatingC}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-100 dark:shadow-none transition-all"
            >
              {creatingC
                ? editingCId
                  ? t("Updating...")
                  : t("Registering...")
                : editingCId
                  ? t("Save Changes")
                  : t("Create Contract")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QUOTATION DIALOG */}
      <Dialog
        open={qModalOpen}
        onOpenChange={(val) => !val && setQModalOpen(false)}
      >
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-none shadow-2xl bg-white">
          <DialogHeader className="px-6 py-4 border-b border-gray-100">
            <DialogTitle className="font-bold text-gray-900 py-4">
              {editingQId ? t("Edit Quotation") : t("New Quotation")}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                {t("Material")} *
              </Label>
              <Select
                value={qForm.materialId ? String(qForm.materialId) : ""}
                onValueChange={(val) =>
                  setQForm({ ...qForm, materialId: parseInt(val) })
                }
              >
                <SelectTrigger className="bg-gray-50 border-gray-200 w-full">
                  <SelectValue placeholder={t("Select material")} />
                </SelectTrigger>
                <SelectContent showSearch className="max-h-60">
                  {materials.map((m) => (
                    <SelectItem key={m.materialId} value={String(m.materialId)}>
                      <span className="font-mono text-xs mr-2">{m.code}</span>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {t("Price")} *
                </Label>
                <CurrencyInput
                  value={qForm.price}
                  onValueChange={(val) =>
                    setQForm({ ...qForm, price: val as number })
                  }
                  className="bg-gray-50 border-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {t("Currency")} *
                </Label>
                <Select
                  value={qForm.currency}
                  onValueChange={(val) => setQForm({ ...qForm, currency: val })}
                >
                  <SelectTrigger className="bg-gray-50 border-gray-200 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VND">VND</SelectItem>
                    {/* <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem> */}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {t("Valid From")} *
                </Label>
                <DateTimePicker
                  value={
                    qForm.validFrom ? new Date(qForm.validFrom) : undefined
                  }
                  onChange={(date) =>
                    setQForm({
                      ...qForm,
                      validFrom: date ? date.toISOString() : "",
                    })
                  }
                  placeholder={t("Pick date")}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {t("Valid To")} *
                </Label>
                <DateTimePicker
                  value={qForm.validTo ? new Date(qForm.validTo) : undefined}
                  onChange={(date) =>
                    setQForm({
                      ...qForm,
                      validTo: date ? date.toISOString() : "",
                    })
                  }
                  placeholder={t("Pick date")}
                  minDate={
                    qForm.validFrom ? new Date(qForm.validFrom) : undefined
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Checkbox
                checked={qForm.isActive}
                onCheckedChange={(val) =>
                  setQForm({ ...qForm, isActive: !!val })
                }
              />
              <Label className="text-sm font-medium text-slate-700 cursor-pointer">
                {t("Active")}
              </Label>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <Button
              variant="ghost"
              onClick={() => setQModalOpen(false)}
              disabled={creatingQ}
              className="font-medium text-gray-500"
            >
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleSaveQuotation}
              disabled={creatingQ}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-100 transition-all"
            >
              {creatingQ
                ? t("Saving...")
                : editingQId
                  ? t("Save Changes")
                  : t("Create Quotation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
