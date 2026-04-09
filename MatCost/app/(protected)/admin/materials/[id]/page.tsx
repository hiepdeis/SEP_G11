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
  Info,
  BarChart2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { useTranslation } from "react-i18next";

import { getMaterialUnitLabel } from "@/lib/material-units";
import {
  getCategories,
  type CategoryItem,
} from "@/services/material-categories";
import { getWarehouses, type WarehouseDto } from "@/services/admin-warehouses";
import { getBins, type BinDto } from "@/services/admin-bins";
import { getMaterialById, type MaterialItem } from "@/services/admin-materials";
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
  rack: "bg-blue-50 text-blue-600 border-blue-100",
  shelf: "bg-purple-50 text-purple-600 border-purple-100",
  floor: "bg-amber-50 text-amber-600 border-amber-100",
  cold: "bg-cyan-50 text-cyan-600 border-cyan-100",
};

const typeLabel: Record<string, string> = {
  rack: "Rack",
  shelf: "Shelf",
  floor: "Floor",
  cold: "Cold Storage",
};

const inputCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all";

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
      const payload: UpsertInventoryPayload = {
        ...invForm,
        batchCode: invForm.batchCode.trim().toUpperCase(),
      };
      if (editInvId !== null) {
        await updateInventory(materialId, editInvId, payload);
        toast.success(t("Inventory position updated"));
      } else {
        await createInventory(materialId, payload);
        toast.success(t("Inventory position added"));
      }
      setInvModal(false);
      refreshInventory();
    } catch (e) {
      toast.error(t("Failed to save"));
    }
  };

  const deleteInv = async (invId: number) => {
    if (!window.confirm(t("Are you sure you want to delete this inventory position?")))
      return;
    try {
      await removeInventory(materialId, invId);
      toast.success(t("Deleted"));
      refreshInventory();
    } catch (e) {
      toast.error(t("Failed to delete"));
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => router.push("/admin/materials")}
                  className="mt-1 p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-600 text-white rounded uppercase tracking-wider">
                      {material.code}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {categoryName}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {material.name}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">
                    {t("List Price")}
                  </span>
                  <span className="text-xl font-black text-blue-600">
                    {material.unitPrice?.toLocaleString()}{" "}
                    <span className="text-sm font-normal underline">đ</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              {/* Left: Info Card */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      {t("Detail Information")}
                    </span>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                          {t("Unit")}
                        </label>
                        <p className="font-semibold text-gray-900 uppercase">
                          {getMaterialUnitLabel(material.unit)}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                          {t("Mass/Unit")}
                        </label>
                        <p className="font-semibold text-gray-900">
                          {material.massPerUnit ?? "—"}{" "}
                          <span className="text-xs text-gray-400 font-normal">
                            kg
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-50">
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                        {t("Technical Standard")}
                      </label>
                      <p className="text-sm text-gray-600 italic leading-relaxed">
                        {material.technicalStandard || t("No information")}
                      </p>
                    </div>
                    <div className="pt-4 border-t border-gray-50">
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                        {t("Specification")}
                      </label>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {material.specification || t("No information")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 p-6 text-white overflow-hidden relative">
                  <BarChart2 className="absolute -right-4 -bottom-4 w-32 h-32 text-blue-500/20 rotate-12" />
                  <h3 className="text-sm font-bold opacity-80 uppercase tracking-widest mb-4">
                    {t("Total Stock Level")}
                  </h3>
                  <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-end">
                      <span className="text-xs opacity-70">{t("On Hand")}:</span>
                      <span className="text-2xl font-black">
                        {stats.onHand.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-xs opacity-70">{t("Allocated")}:</span>
                      <span className="text-lg font-bold text-blue-200">
                        {stats.allocated.toLocaleString()}
                      </span>
                    </div>
                    <div className="pt-4 border-t border-blue-500 flex justify-between items-end">
                      <span className="text-sm font-bold">{t("Available")}:</span>
                      <span className="text-3xl font-black">
                        {stats.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Inventory Management */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Warehouse className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {t("Warehouse Allocation & Batches")}
                      </span>
                    </div>
                    <button
                      onClick={openAddInv}
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-bold transition-all shadow-md shadow-emerald-100"
                    >
                      <Plus className="w-3.5 h-3.5" /> {t("Add Position")}
                    </button>
                  </div>

                  <div className="p-6">
                    {inventoryGroups.length === 0 ? (
                      <div className="py-12 text-center">
                        <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">
                          {t("No inventory information available at any warehouse")}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {inventoryGroups.map((group) => (
                          <div key={group.warehouseId} className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 font-bold text-gray-900">
                                <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                                {group.warehouseName}
                              </div>
                              <div className="flex gap-4 text-[10px] font-bold uppercase text-gray-400">
                                <span>
                                  {t("On Hand")}:{" "}
                                  <span className="text-gray-900">
                                    {group.totalOnHand.toLocaleString()}
                                  </span>
                                </span>
                                <span>
                                  {t("Available")}:{" "}
                                  <span className="text-emerald-600">
                                    {group.available.toLocaleString()}
                                  </span>
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {group.rows.map((row) => (
                                <div
                                  key={row.id}
                                  className="group relative bg-gray-50 hover:bg-white border border-gray-100 hover:border-blue-200 p-4 rounded-xl transition-all hover:shadow-md"
                                >
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                      <span className="text-sm font-bold text-gray-900">
                                        {row.binCode}
                                      </span>
                                      <span
                                        className={`text-[10px] px-2 py-0.5 border rounded-full font-medium ${typeBadgeCls[row.binType] || "bg-gray-100"}`}
                                      >
                                        {t(typeLabel[row.binType] || row.binType)}
                                      </span>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() =>
                                          openEditInv(row, group.warehouseId)
                                        }
                                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => deleteInv(row.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="text-[10px] text-gray-400 mb-3 uppercase font-bold tracking-tighter">
                                    {t("Batch Code")}:{" "}
                                    <span className="text-gray-700 font-mono">
                                      {row.batchCode}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-center bg-white/50 rounded-lg p-2 border border-gray-50">
                                    <div>
                                      <span className="block text-[8px] text-gray-400 uppercase font-black">
                                        {t("On Hand")}
                                      </span>
                                      <span className="font-bold text-gray-900">
                                        {row.quantityOnHand}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="block text-[8px] text-gray-400 uppercase font-black">
                                        {t("Allocated")}
                                      </span>
                                      <span className="font-bold text-orange-600">
                                        {row.quantityAllocated}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="block text-[8px] text-gray-400 uppercase font-black">
                                        {t("Available")}
                                      </span>
                                      <span className="font-bold text-emerald-600">
                                        {row.available}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal - same as previous but styled for detail page */}
      {invModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">
                {editInvId ? t("Edit Position") : t("Add New Position")}
              </h3>
              <button
                onClick={() => setInvModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  {t("Storage Warehouse")} *
                </label>
                <select
                  value={invForm.warehouseId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const available = bins.filter((b) => b.warehouseId === id);
                    setInvForm({
                      ...invForm,
                      warehouseId: id,
                      binId: available[0]?.binId ?? 0,
                    });
                  }}
                  className={inputCls}
                >
                  {warehouses.map((w) => (
                    <option key={w.warehouseId} value={w.warehouseId}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  {t("Bin Position")} *
                </label>
                <select
                  value={invForm.binId}
                  onChange={(e) =>
                    setInvForm({ ...invForm, binId: Number(e.target.value) })
                  }
                  className={inputCls}
                >
                  {availableBins.map((b) => (
                    <option key={b.binId} value={b.binId}>
                      {b.code} — {t(typeLabel[b.type] || b.type)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  {t("Batch Code")} *
                </label>
                <input
                  value={invForm.batchCode}
                  onChange={(e) =>
                    setInvForm({ ...invForm, batchCode: e.target.value })
                  }
                  placeholder={t("e.g. LOT-2024-001")}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                    {t("On Hand")}
                  </label>
                  <input
                    type="number"
                    value={invForm.quantityOnHand}
                    onChange={(e) =>
                      setInvForm({
                        ...invForm,
                        quantityOnHand: Number(e.target.value),
                      })
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                    {t("Allocated")}
                  </label>
                  <input
                    type="number"
                    value={invForm.quantityAllocated}
                    onChange={(e) =>
                      setInvForm({
                        ...invForm,
                        quantityAllocated: Number(e.target.value),
                      })
                    }
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center text-xs">
                <div className="flex flex-col">
                  <span className="text-blue-500 font-bold uppercase tracking-tighter">
                    {t("Expected Available")}
                  </span>
                  <span className="text-[10px] text-blue-400">
                    {t("After subtracting allocation")}
                  </span>
                </div>
                <span
                  className={`text-xl font-black ${invForm.quantityOnHand - invForm.quantityAllocated < 0 ? "text-red-600" : "text-blue-700"}`}
                >
                  {(
                    invForm.quantityOnHand - invForm.quantityAllocated
                  ).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => setInvModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {t("Cancel")}
              </button>
              <button
                onClick={saveInv}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
              >
                {t("Save Changes")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
