"use client";

import { useEffect, useState, useMemo, use } from "react";
import {
  X,
  Package,
  Warehouse,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Info,
  BarChart2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/custom/currency-input";
import { QuantityInput } from "@/components/ui/custom/quantity-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { showConfirmToast } from "@/hooks/confirm-toast";

import { getMaterialUnitLabel } from "@/lib/material-units";
import {
  getCategories,
  type CategoryItem,
} from "@/services/material-categories";
import { getWarehouses, type WarehouseDto } from "@/services/admin-warehouses";
import { getBins, type BinDto } from "@/services/admin-bins";
import {
  getMaterialById,
  updateMaterial,
  removeMaterial,
  type MaterialItem,
} from "@/services/admin-materials";
import {
  getInventoryByMaterial,
  createInventory,
  updateInventory,
  removeInventory,
  type InventoryGroup,
  type InventoryRow,
  type UpsertInventoryPayload,
} from "@/services/admin-inventory";

// --- TYPES ---
interface InvForm {
  warehouseId: number;
  binId: number;
  batchId?: number;
  batchCode: string;
  quantityOnHand: number;
  quantityAllocated: number;
}

const emptyInvForm: InvForm = {
  warehouseId: 0,
  binId: 0,
  batchId: undefined,
  batchCode: "",
  quantityOnHand: 0,
  quantityAllocated: 0,
};

const typeBadgeCls: Record<string, string> = {
  rack: "border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-900/30",
  shelf:
    "border-purple-100 bg-purple-50 text-purple-600 dark:border-purple-900 dark:bg-purple-900/30",
  floor:
    "border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-900/30",
  cold: "border-cyan-100 bg-cyan-50 text-cyan-600 dark:border-cyan-900 dark:bg-cyan-900/30",
};

const typeLabel: Record<string, string> = {
  rack: "Rack",
  shelf: "Shelf",
  floor: "Floor",
  cold: "Cold Storage",
};

export default function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: matIdStr } = use(params);
  const materialId = parseInt(matIdStr);

  const [material, setMaterial] = useState<MaterialItem | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [bins, setBins] = useState<BinDto[]>([]);
  const [inventoryGroups, setInventoryGroups] = useState<InventoryGroup[]>([]);

  const [loading, setLoading] = useState(true);
  const [invLoading, setInvLoading] = useState(false);

  const [invModal, setInvModal] = useState(false);
  const [editInvId, setEditInvId] = useState<number | null>(null);
  const [invForm, setInvForm] = useState<InvForm>(emptyInvForm);

  const [invPages, setInvPages] = useState<Record<number, number>>({});
  const invPageSize = 2;

  const [groupPage, setGroupPage] = useState(0);
  const groupPageSize = 2;

  const [deleting, setDeleting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<MaterialItem> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isNaN(materialId)) {
      toast.error(t("Invalid Material ID"));
      router.push("/admin/materials");
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [matData, catData, whData, binData, invData] = await Promise.all([
          getMaterialById(materialId),
          getCategories(),
          getWarehouses(),
          getBins(),
          getInventoryByMaterial(materialId),
        ]);
        setMaterial(matData);
        setCategories(catData.items ?? []);
        setWarehouses(Array.isArray(whData) ? whData : (whData.items ?? []));
        setBins(Array.isArray(binData) ? binData : (binData.items ?? []));
        setInventoryGroups(invData ?? []);
      } catch (error) {
        console.error("Failed to load material detail:", error);
        toast.error(t("Failed to load material details"));
        router.push("/admin/materials");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [materialId, router]);

  const refreshInventory = async () => {
    try {
      setInvLoading(true);
      const data = await getInventoryByMaterial(materialId);
      setInventoryGroups(data ?? []);
    } finally {
      setInvLoading(false);
    }
  };

  const openAddInv = () => {
    const firstWh = warehouses[0];
    const availableBins = bins.filter(
      (b) => b.warehouseId === (firstWh?.warehouseId ?? 0),
    );
    setInvForm({
      ...emptyInvForm,
      warehouseId: firstWh?.warehouseId ?? 0,
      binId: availableBins[0]?.binId ?? 0,
    });
    setEditInvId(null);
    setInvModal(true);
  };

  const openEditInv = (row: InventoryRow, whId: number) => {
    setInvForm({
      warehouseId: whId,
      binId: row.binId,
      batchId: row.batchId,
      batchCode: row.batchCode,
      quantityOnHand: row.quantityOnHand,
      quantityAllocated: row.quantityAllocated,
    });
    setEditInvId(row.id);
    setInvModal(true);
  };

  const saveInv = async () => {
    try {
      if (invForm.warehouseId === 0 || invForm.binId === 0) {
        toast.error(t("Please select warehouse and bin"));
        return;
      }

      setInvLoading(true);
      const payload: UpsertInventoryPayload = {
        warehouseId: invForm.warehouseId,
        binId: invForm.binId,
        batchId: invForm.batchId,
        batchCode: invForm.batchCode,
        quantityOnHand: invForm.quantityOnHand,
        quantityAllocated: invForm.quantityAllocated,
      };

      if (editInvId) {
        await updateInventory(materialId, editInvId, payload);
        toast.success(t("Update Successful"));
      } else {
        await createInventory(materialId, payload);
        toast.success(t("Add New Successful"));
      }
      setInvModal(false);
      refreshInventory();
    } catch (error) {
      toast.error(t("Save Failed"));
    } finally {
      setInvLoading(false);
    }
  };

  const deleteInv = async (invId: number) => {
    showConfirmToast({
      title: t("Are you sure?"),
      description: t("Are you sure you want to delete this position?"),
      onConfirm: async () => {
        try {
          setInvLoading(true);
          await removeInventory(materialId, invId);
          toast.success(t("Delete Successful"));
          refreshInventory();
        } catch (error) {
          toast.error(t("Delete Failed"));
        } finally {
          setInvLoading(false);
        }
      },
    });
  };

  // --- MATERIAL CRUD ---
  const handleDeleteMaterial = async () => {
    if (!material) return;
    showConfirmToast({
      title: t("Delete Material"),
      description: t(
        "Are you sure you want to delete this material? This action cannot be undone.",
      ),
      onConfirm: async () => {
        try {
          setDeleting(true);
          await removeMaterial(materialId);
          toast.success(t("Material Deleted"));
          router.push("/admin/master-data?tab=materials");
        } catch (error) {
          toast.error(
            t("Delete Failed, Item is already used in other modules"),
          );
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  const openEditMaterial = () => {
    if (!material) return;
    setEditForm({ ...material });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (isSaving) return;
    setEditModalOpen(false);
    setEditForm(null);
  };

  const handleSaveMaterial = async () => {
    if (!editForm) return;
    if (!editForm.code || !editForm.name || !editForm.unit) {
      toast.error(t("Please enter code, name and unit"));
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        code: editForm.code.toUpperCase(),
        name: editForm.name,
        unit: editForm.unit,
        massPerUnit: editForm.massPerUnit ?? null,
        minStockLevel: editForm.minStockLevel ?? null,
        maxStockLevel: editForm.maxStockLevel ?? null,
        categoryId: editForm.categoryId ?? null,
        unitPrice: editForm.unitPrice ?? null,
        technicalStandard: editForm.technicalStandard ?? "",
        specification: editForm.specification ?? "",
        isDecimalUnit: editForm.isDecimalUnit ?? false,
      };

      const updated = await updateMaterial(materialId, payload);
      setMaterial({ ...material!, ...updated });
      toast.success(t("Update Successful"));
      closeEditModal();
    } catch (error) {
      toast.error(t("Save Failed"));
    } finally {
      setIsSaving(false);
    }
  };

  const availableBins = useMemo(
    () => bins.filter((b) => b.warehouseId === invForm.warehouseId),
    [invForm.warehouseId, bins],
  );

  const stats = useMemo(() => {
    let onHand = 0,
      allocated = 0;
    inventoryGroups.forEach((g) => {
      onHand += g.totalOnHand;
      allocated += g.totalAllocated;
    });
    return { onHand, allocated, total: onHand - allocated };
  }, [inventoryGroups]);

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500">
        {t("Loading material details...")}
      </div>
    );
  if (!material) return null;

  const categoryName =
    categories.find((c) => c.categoryId === material.categoryId)?.name || "—";

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Material Details")} />
        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-start gap-4">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => router.back()}
                  className="mt-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="default"
                      className="bg-blue-600 hover:bg-blue-700 text-[10px] font-bold uppercase tracking-wider"
                    >
                      {material.code}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-bold"
                    >
                      {categoryName}
                    </Badge>
                    {material.isDecimalUnit && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-400"
                      >
                        {t("Decimal Unit")}
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {material.name}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDeleteMaterial}
                    disabled={deleting}
                    className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-red-50 hover:text-red-600 hover:border-red-100 dark:hover:bg-red-900/20 dark:hover:border-red-900/30 transition-all font-bold text-xs"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleting ? t("Deleting...") : t("Delete")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={openEditMaterial}
                    className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 dark:hover:bg-indigo-900/20 dark:hover:border-indigo-900/30 transition-all font-bold text-xs"
                  >
                    <Edit2 className="w-4 h-4 mr-2" /> {t("Edit Info")}
                  </Button>
                  <Separator
                    orientation="vertical"
                    className="h-6 mx-1 bg-slate-200 dark:bg-slate-800"
                  />
                  <Button
                    onClick={openAddInv}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                  >
                    <Plus className="w-4 h-4 mr-2" /> {t("Add Stock")}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Info Card */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="rounded-2xl border-gray-100 overflow-hidden pt-4">
                  <CardHeader className="px-6 py-4 border-b border-gray-50 flex flex-row items-center gap-2 space-y-0">
                    <Info className="w-4 h-4 text-blue-500" />
                    <CardTitle className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      {t("Detail Information")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4 py-0">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                          {t("Unit Price")}
                        </label>
                        <p className="font-semibold text-gray-900 dark:text-slate-200 uppercase">
                          {material.unitPrice?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                          {t("Unit")}
                        </label>
                        <p className="font-semibold text-gray-900 dark:text-slate-200 uppercase">
                          {getMaterialUnitLabel(material.unit)}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                          {t("Mass/Unit")}
                        </label>
                        <p className="font-semibold text-gray-900 dark:text-slate-200">
                          {material.massPerUnit ?? "—"}{" "}
                          <span className="text-xs text-gray-400 font-normal">
                            kg
                          </span>
                        </p>
                      </div>
                    </div>

                    <Separator className="bg-gray-50 dark:bg-slate-800" />

                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                        {t("Stock Levels")}
                      </label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-50 dark:bg-slate-900 p-2 rounded-lg border border-gray-100 dark:border-slate-800">
                          <span className="text-gray-400">{t("Min")}:</span>
                          <span className="ml-1 font-bold text-gray-700 dark:text-slate-300">
                            {material.minStockLevel ?? "0"}
                          </span>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-900 p-2 rounded-lg border border-gray-100 dark:border-slate-800">
                          <span className="text-gray-400">{t("Max")}:</span>
                          <span className="ml-1 font-bold text-gray-700 dark:text-slate-300">
                            {material.maxStockLevel ?? "∞"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-gray-50 dark:bg-slate-800" />

                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                        {t("Technical Standard")}
                      </label>
                      <p className="text-sm text-gray-600 dark:text-slate-400 italic leading-relaxed">
                        {material.technicalStandard || t("No information")}
                      </p>
                    </div>

                    <Separator className="bg-gray-50 dark:bg-slate-800" />

                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                        {t("Specification")}
                      </label>
                      <p className="text-sm text-gray-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                        {material.specification || t("No information")}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-600 dark:bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-blue-900/20 p-6 text-white overflow-hidden relative border-none">
                  <BarChart2 className="absolute -right-4 -bottom-4 w-32 h-32 text-blue-500/20 rotate-12" />
                  <h3 className="text-sm font-bold opacity-80 uppercase tracking-widest mb-4">
                    {t("Total Stock Level")}
                  </h3>
                  <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-end">
                      <span className="text-xs opacity-70">
                        {t("On Hand")}:
                      </span>
                      <span className="text-2xl font-black">
                        {stats.onHand.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-xs opacity-70">
                        {t("Allocated")}:
                      </span>
                      <span className="text-lg font-bold text-blue-200">
                        {stats.allocated.toLocaleString()}
                      </span>
                    </div>
                    <Separator className="bg-white/20" />
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-bold">
                        {t("Available")}:
                      </span>
                      <span className="text-3xl font-black">
                        {stats.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right: Inventory Management */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="rounded-2xl border-gray-100 overflow-hidden pt-4">
                  <CardHeader className="px-6 py-4 border-b border-gray-50 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                      <Warehouse className="w-4 h-4 text-emerald-500" />
                      <CardTitle className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {t("Warehouse Allocation & Batches")}
                      </CardTitle>
                    </div>
                    <Button
                      size="sm"
                      onClick={openAddInv}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md shadow-emerald-100 dark:shadow-none"
                    >
                      <Plus className="w-3.5 h-3.5 mr-2" /> {t("Add Position")}
                    </Button>
                  </CardHeader>

                  <CardContent className="p-6 py-0 min-h-[650px]">
                    {inventoryGroups.length === 0 ? (
                      <div className="py-12 text-center min-h-[650px]">
                        <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">
                          {t(
                            "No inventory information available at any warehouse",
                          )}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-8 min-h-[650px] flex flex-col">
                        <div className="flex-1 mb-0">
                          {inventoryGroups
                            .slice(
                              groupPage * groupPageSize,
                              (groupPage + 1) * groupPageSize,
                            )
                            .map((group) => {
                              const curPage = invPages[group.warehouseId] || 0;
                              const totalPages = Math.ceil(
                                group.rows.length / invPageSize,
                              );
                              const paginatedRows = group.rows.slice(
                                curPage * invPageSize,
                                (curPage + 1) * invPageSize,
                              );

                              return (
                                <div
                                  key={group.warehouseId}
                                  className="space-y-3 mb-10"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-slate-100">
                                      <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                                      {group.warehouseName}
                                    </div>
                                    <div className="flex gap-4 text-[10px] font-bold uppercase text-gray-400">
                                      <span>
                                        {t("On Hand")}:{" "}
                                        <span className="text-gray-900 dark:text-slate-300">
                                          {group.totalOnHand.toLocaleString()}
                                        </span>
                                      </span>
                                      <span>
                                        {t("Available")}:{" "}
                                        <span className="text-emerald-600 dark:text-emerald-400">
                                          {group.available.toLocaleString()}
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {paginatedRows.map((row) => (
                                      <div
                                        key={row.id}
                                        className="group relative bg-gray-50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 border border-gray-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 p-4 rounded-xl transition-all hover:shadow-md"
                                      >
                                        <div className="flex justify-between items-start mb-3">
                                          <div className="flex items-center gap-2">
                                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="text-sm font-bold text-gray-900 dark:text-slate-200">
                                              {row.binCode}
                                            </span>
                                            <Badge
                                              variant="outline"
                                              className={`text-[10px] font-medium border-none ${typeBadgeCls[row.binType] || "bg-gray-100"}`}
                                            >
                                              {t(row.binType)}
                                            </Badge>
                                          </div>
                                          <div className="flex gap-1 opacity-10 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                              variant="ghost"
                                              size="icon-sm"
                                              onClick={() =>
                                                openEditInv(
                                                  row,
                                                  group.warehouseId,
                                                )
                                              }
                                              className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon-sm"
                                              onClick={() => deleteInv(row.id)}
                                              className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                          </div>
                                        </div>
                                        <div className="text-[10px] text-gray-400 mb-3 uppercase font-bold tracking-tighter">
                                          {t("Batch Code")}:{" "}
                                          <span className="text-gray-700 dark:text-slate-300 font-mono">
                                            {row.batchCode}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center bg-white/50 dark:bg-slate-950/50 rounded-lg p-2 border border-gray-50 dark:border-slate-800">
                                          <div>
                                            <span className="block text-[8px] text-gray-400 uppercase font-black">
                                              {t("On Hand")}
                                            </span>
                                            <span className="font-bold text-gray-900 dark:text-slate-100">
                                              {row.quantityOnHand}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="block text-[8px] text-gray-400 uppercase font-black">
                                              {t("Allocated")}
                                            </span>
                                            <span className="font-bold text-orange-600 dark:text-orange-400">
                                              {row.quantityAllocated}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="block text-[8px] text-gray-400 uppercase font-black">
                                              {t("Available")}
                                            </span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                              {row.available}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {totalPages > 1 && (
                                    <div className="flex items-center justify-between px-2 py-2 bg-white/30 dark:bg-slate-900/30 rounded-lg border border-gray-50 dark:border-slate-800">
                                      <div className="text-[10px] font-bold text-gray-400 uppercase">
                                        {t("Page")} {curPage + 1} / {totalPages}
                                      </div>
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          disabled={curPage === 0}
                                          onClick={() =>
                                            setInvPages((prev) => ({
                                              ...prev,
                                              [group.warehouseId]: curPage - 1,
                                            }))
                                          }
                                          className="h-6 w-6 rounded-md"
                                        >
                                          <ChevronLeft className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          disabled={curPage >= totalPages - 1}
                                          onClick={() =>
                                            setInvPages((prev) => ({
                                              ...prev,
                                              [group.warehouseId]: curPage + 1,
                                            }))
                                          }
                                          className="h-6 w-6 rounded-md"
                                        >
                                          <ChevronRight className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                        <div>
                          {inventoryGroups.length > groupPageSize && (
                            <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={groupPage === 0}
                                onClick={() => setGroupPage((p) => p - 1)}
                                className="rounded-xl flex items-center gap-2 font-bold transition-all"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </Button>
                              <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                {t("Warehouse Group")} {groupPage + 1} /{" "}
                                {Math.ceil(
                                  inventoryGroups.length / groupPageSize,
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                  groupPage >=
                                  Math.ceil(
                                    inventoryGroups.length / groupPageSize,
                                  ) -
                                    1
                                }
                                onClick={() => setGroupPage((p) => p + 1)}
                                className="rounded-xl flex items-center gap-2 font-bold transition-all"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
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

      <Dialog open={invModal} onOpenChange={setInvModal}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl bg-white">
          <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
            <DialogTitle className="font-bold text-gray-900 dark:text-slate-100 py-4">
              {editInvId ? t("Edit Position") : t("Add New Position")}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 py-0 space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                {t("Storage Warehouse")} *
              </Label>
              <Select
                value={invForm.warehouseId.toString()}
                onValueChange={(val) => {
                  const id = Number(val);
                  const available = bins.filter((b) => b.warehouseId === id);
                  setInvForm({
                    ...invForm,
                    warehouseId: id,
                    binId: available[0]?.binId ?? 0,
                  });
                }}
              >
                <SelectTrigger className="w-full bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800">
                  <SelectValue placeholder={t("Select Warehouse")} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem
                      key={w.warehouseId}
                      value={w.warehouseId.toString()}
                    >
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                {t("Bin Position")} *
              </Label>
              <Select
                value={invForm.binId.toString()}
                onValueChange={(val) =>
                  setInvForm({ ...invForm, binId: Number(val) })
                }
              >
                <SelectTrigger className="w-full bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800">
                  <SelectValue placeholder={t("Select Bin")} />
                </SelectTrigger>
                <SelectContent>
                  {availableBins.map((b) => (
                    <SelectItem key={b.binId} value={b.binId.toString()}>
                      {b.code} — {t(b.type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                {t("Batch Code")} *
              </Label>
              <Input
                value={invForm.batchCode}
                onChange={(e) =>
                  setInvForm({ ...invForm, batchCode: e.target.value })
                }
                placeholder={t("e.g. LOT-2024-001")}
                className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {t("On Hand")}
                </Label>
                <Input
                  type="number"
                  value={invForm.quantityOnHand}
                  onChange={(e) =>
                    setInvForm({
                      ...invForm,
                      quantityOnHand: Number(e.target.value),
                    })
                  }
                  className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {t("Allocated")}
                </Label>
                <Input
                  type="number"
                  value={invForm.quantityAllocated}
                  onChange={(e) =>
                    setInvForm({
                      ...invForm,
                      quantityAllocated: Number(e.target.value),
                    })
                  }
                  className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800"
                />
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 flex justify-between items-center text-xs">
              <div className="flex flex-col">
                <span className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-tight">
                  {t("Expected Available")}
                </span>
                <span className="text-[10px] text-blue-400 dark:text-blue-500/70">
                  {t("After subtracting allocation")}
                </span>
              </div>
              <span
                className={`text-2xl font-black ${invForm.quantityOnHand - invForm.quantityAllocated < 0 ? "text-red-600" : "text-blue-700 dark:text-blue-400"}`}
              >
                {(
                  invForm.quantityOnHand - invForm.quantityAllocated
                ).toLocaleString()}
              </span>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
            <Button
              variant="ghost"
              onClick={() => setInvModal(false)}
              className="font-medium text-gray-500"
            >
              {t("Cancel")}
            </Button>
            <Button
              onClick={saveInv}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all"
            >
              {t("Save Changes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={editModalOpen}
        onOpenChange={(val) => !val && closeEditModal()}
      >
        {editForm && (
          <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950">
            <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
              <DialogTitle className="font-bold text-gray-900 dark:text-slate-100">
                {t("Edit Material Info")}
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {t("Code")} *
                  </Label>
                  <Input
                    value={editForm.code || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev!,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {t("Category")} *
                  </Label>
                  <Select
                    value={
                      editForm.categoryId ? String(editForm.categoryId) : ""
                    }
                    onValueChange={(val) =>
                      setEditForm((prev) => ({
                        ...prev!,
                        categoryId: Number(val),
                      }))
                    }
                  >
                    <SelectTrigger className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800 w-full">
                      <SelectValue placeholder={t("Select...")} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem
                          key={c.categoryId}
                          value={String(c.categoryId)}
                        >
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {t("Name")} *
                </Label>
                <Input
                  value={editForm.name || ""}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev!,
                      name: e.target.value,
                    }))
                  }
                  className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-1">
                  <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {t("Unit")} *
                  </Label>
                  <Input
                    value={editForm.unit || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev!,
                        unit: e.target.value,
                      }))
                    }
                    className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800"
                  />
                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="isDecimalUnitEdit"
                      checked={editForm.isDecimalUnit || false}
                      onCheckedChange={(val) =>
                        setEditForm((prev) => ({
                          ...prev!,
                          isDecimalUnit: !!val,
                        }))
                      }
                    />
                    <Label
                      htmlFor="isDecimalUnitEdit"
                      className="text-[10px] font-bold text-gray-400 uppercase cursor-pointer"
                    >
                      {t("Decimal Unit")}
                    </Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {t("Mass/Unit")} *
                  </Label>
                  <QuantityInput
                    value={editForm.massPerUnit}
                    onValueChange={(val) =>
                      setEditForm((prev) => ({ ...prev!, massPerUnit: val }))
                    }
                    className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {t("Price")} *
                  </Label>
                  <CurrencyInput
                    value={editForm.unitPrice}
                    onValueChange={(val) =>
                      setEditForm((prev) => ({ ...prev!, unitPrice: val }))
                    }
                    className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {t("Min Stock")} *
                  </Label>
                  <QuantityInput
                    value={editForm.minStockLevel}
                    onValueChange={(val) =>
                      setEditForm((prev) => ({ ...prev!, minStockLevel: val }))
                    }
                    precision={editForm.isDecimalUnit ? 3 : 0}
                    className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {t("Max Stock")}
                  </Label>
                  <QuantityInput
                    value={editForm.maxStockLevel}
                    onValueChange={(val) =>
                      setEditForm((prev) => ({ ...prev!, maxStockLevel: val }))
                    }
                    precision={editForm.isDecimalUnit ? 3 : 0}
                    className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {t("Technical Standard")}
                </Label>
                <Input
                  value={editForm.technicalStandard || ""}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev!,
                      technicalStandard: e.target.value,
                    }))
                  }
                  className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {t("Specification")}
                </Label>
                <Textarea
                  value={editForm.specification || ""}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev!,
                      specification: e.target.value,
                    }))
                  }
                  rows={2}
                  className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800 resize-none"
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
              <Button
                variant="ghost"
                onClick={closeEditModal}
                disabled={isSaving}
                className="font-medium text-gray-500"
              >
                {t("Cancel")}
              </Button>
              <Button
                onClick={handleSaveMaterial}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
              >
                {isSaving ? t("Saving...") : t("Save Changes")}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
