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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { showConfirmToast } from "@/hooks/confirm-toast";

import {
  getSupplierById,
  type SupplierDto,
  updateSupplier,
  deleteSupplier,
} from "@/services/admin-suppliers";
import { ContractsExpandedContent } from "@/components/pages/admin/master-data/suppliers-tab";
import { formatMoney } from "@/lib/master-data-utils";

import { SupplierItem } from "@/lib/master-data-types";

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
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<SupplierItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        setSupplier(data);
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
    if (!supplier || !supplier.contracts)
      return { totalValue: 0, contractsCount: 0, materialCount: 0 };
    return {
      totalValue: supplier.contracts.reduce(
        (acc, c) => acc + (c.totalAmount || 0),
        0,
      ),
      contractsCount: supplier.contracts.length,
      materialCount: supplier.contracts.reduce(
        (acc, c) => acc + c.materialCount,
        0,
      ),
    };
  }, [supplier]);

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
            {/* HER0 / BREADCRUMB */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => router.back()}
                  className="mt-1 p-2 rounded-xl bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-500 transition-all hover:scale-105"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-600 text-white border-none shadow-md shadow-indigo-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                      {supplier.code}
                    </Badge>
                    <span className="text-xs font-medium text-slate-400">
                      ID: #{supplier.supplierId}
                    </span>
                  </div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-900">
                    {supplier.name}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={remove}
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 text-sm font-bold transition-all shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />{" "}
                  {deleting ? t("Deleting...") : t("Delete")}
                </button>
                <button
                  onClick={openEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-sm font-bold transition-all shadow-sm"
                >
                  <Edit2 className="w-4 h-4" /> {t("Edit Supplier Info")}
                </button>
              </div>
            </div>

            {/* KEY METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {t("Active Contracts")}
                  </p>
                  <h3 className="text-xl font-black text-slate-900">
                    {stats.contractsCount}
                  </h3>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {t("Total Value")}
                  </p>
                  <h3 className="text-xl font-black text-emerald-600">
                    {formatMoney(stats.totalValue)}
                  </h3>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {t("Items Supplied")}
                  </p>
                  <h3 className="text-xl font-black text-slate-900">
                    {stats.materialCount}
                  </h3>
                </div>
              </div>

              <div className="bg-indigo-600 p-5 rounded-3xl shadow-xl shadow-indigo-100 text-white flex flex-col justify-center">
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">
                  {t("Partner Status")}
                </p>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-lg font-black uppercase tracking-tight">
                    {t("Reliable")}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* LEFT: INFORMATION */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                      {t("Registration Info")}
                    </span>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-tighter">
                        {t("Tax Identification No.")}
                      </label>
                      <p className="text-lg font-bold text-slate-800 tracking-tight">
                        {supplier.taxCode || t("Not Provided")}
                      </p>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                        <MapPin className="w-3.5 h-3.5" />{" "}
                        {t("Business Address")}
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        {supplier.address || t("No address registered")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: CONTRACTS LIST */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                      <ClipboardList className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">
                        {t("Active Agreements")}
                      </h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {t("Contracts & Materials")}
                      </p>
                    </div>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-bold transition-all shadow-lg shadow-indigo-100">
                    <Plus className="w-3.5 h-3.5" /> {t("New Contract")}
                  </button>
                </div>

                <div className="bg-white/40 backdrop-blur-sm rounded-3xl p-2 border border-white/50">
                  <ContractsExpandedContent
                    contracts={supplier.contracts || []}
                    emptyMessage={t("This supplier has no active contracts.")}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={modalOpen} onOpenChange={(val) => !val && closeModal()}>
        {editing && (
          <DialogContent className="sm:max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900">
                {t("Edit Supplier")}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-grow overflow-y-auto px-1 py-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("Code")} *</Label>
                    <Input
                      value={editing.code || ""}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          code: e.target.value.toUpperCase(),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("Name")} *</Label>
                    <Input
                      value={editing.name || ""}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("Tax Code")}</Label>
                    <Input
                      value={editing.taxCode || ""}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          taxCode: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("Address")}</Label>
                    <Input
                      value={editing.address || ""}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 border-t pt-4">
              <Button variant="outline" onClick={closeModal} disabled={saving}>
                {t("Cancel")}
              </Button>
              <Button
                onClick={save}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {saving ? t("Saving...") : t("Save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
