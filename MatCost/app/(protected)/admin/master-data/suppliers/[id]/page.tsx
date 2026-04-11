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
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<SupplierItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Contract pagination state
  const [cPage, setCPage] = useState(0);
  const cPageSize = 2;

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

  useEffect(() => {
    if (isNaN(supplierId)) {
      toast.error(t("Invalid Supplier ID"));
      router.back();
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const data = await getSupplierById(supplierId);
        const contractsList = await getSupplierContractBySupplierId(supplierId);
        setSupplier(data);
        setContracts(contractsList);
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
    if (!cForm.contractCode || !cForm.effectiveFrom) {
      toast.error(t("Contract code and start date are required"));
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
    } catch (error) {
      console.error("Save contract error:", error);
      toast.error(t("Failed to save contract"));
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
                  className="flex items-center gap-2 px-4 py-2 border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl font-bold transition-all shadow-sm"
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

              {/* RIGHT: CONTRACTS LIST */}
              <div className="lg:col-span-2">
                <Card className="border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-950 gap-0 pb-0">
                  <CardHeader className="px-6 py-4 border-b border-slate-50 dark:border-slate-900 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ClipboardList className="w-5 h-5 text-indigo-600" />
                        <div>
                          <CardTitle className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                            {t("Active Agreements")}
                          </CardTitle>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            {t("Contracts & Materials")}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={openAddContract}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                      >
                        <Plus className="w-3.5 h-3.5 mr-2" />{" "}
                        {t("New Contract")}
                      </Button>
                    </div>
                  </CardHeader>
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
                      emptyMessage={t("This supplier has no active contracts.")}
                    />

                    {contracts && contracts.length > cPageSize && (
                      <div className="mt-4 flex items-center justify-between px-2 py-2 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800">
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
            <DialogTitle className="font-bold text-gray-900 dark:text-slate-100">
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
                <Input
                  type="date"
                  value={cForm.effectiveFrom}
                  onChange={(e) =>
                    setCForm({ ...cForm, effectiveFrom: e.target.value })
                  }
                  className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {t("Expiry Date")}
                </Label>
                <Input
                  type="date"
                  value={cForm.effectiveTo || ""}
                  onChange={(e) =>
                    setCForm({ ...cForm, effectiveTo: e.target.value })
                  }
                  className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800"
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
    </div>
  );
}
