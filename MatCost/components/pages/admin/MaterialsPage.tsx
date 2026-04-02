"use client";
import { useEffect, useState, useMemo, Fragment } from "react";
import {
  Search, Plus, Edit2, Trash2, X, Package,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Warehouse, MapPin, Save,
} from "lucide-react";
import { toast } from "sonner";

import {
  MATERIAL_UNIT_OPTIONS,
  getMaterialQuantityRuleText,
  canonicalizeMaterialUnit,
  getMaterialUnitLabel,
  requiresWholeMaterialQuantity,
} from "@/lib/material-units";
import { getCategories, type CategoryItem } from "@/services/material-categories";
import { getWarehouses, type WarehouseDto } from "@/services/admin-warehouses";
import { getBins, type BinDto } from "@/services/admin-bins";
import {
  getMaterials,
  createMaterial,
  updateMaterial,
  removeMaterial,
  type MaterialItem,
  type UpsertMaterialPayload,
} from "@/services/admin-materials";
import { createInventory, getInventoryByMaterial, removeInventory, updateInventory, UpsertInventoryPayload, type InventoryGroup } from "@/services/admin-inventory";
// ─── Reference Data (matches DB) ───


// ─── DB: Materials ───
interface Material {
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

// ─── DB: InventoryCurrent ───
// MaterialsPage.tsx

interface InvItem {
  id: number;
  warehouseId: number;
  binId: number;
  materialId: number;
  batchId: number;
  batchCode: string;
  quantityOnHand: number;
  quantityAllocated: number;
}
interface InvForm {
  warehouseId: number;
  binId: number;
  batchId: number | null;       // thêm
  batchCode: string;
  quantityOnHand: number;
  quantityAllocated: number;
}





const typeBadgeCls: Record<string, string> = {
  rack: "bg-blue-50 text-blue-600",
  shelf: "bg-purple-50 text-purple-600",
  floor: "bg-amber-50 text-amber-600",
  cold: "bg-cyan-50 text-cyan-600",
};
const typeLabel: Record<string, string> = { rack: "Giá kệ", shelf: "Kệ đơn", floor: "Sàn", cold: "Kho lạnh" };

type MatForm = Omit<Material, "materialId">;
const emptyMatForm: MatForm = {
  code: "",
  name: "",
  unit: "kg",
  massPerUnit: null,
  minStockLevel: null,
  categoryId: null,
  unitPrice: null,
  technicalStandard: "",
  specification: ""
};
interface InvForm {
  warehouseId: number;
  binId: number;
  batchId: number | null;       // thêm
  batchCode: string;
  quantityOnHand: number;
  quantityAllocated: number;
}

const emptyInvForm: InvForm = {
  warehouseId: 1,
  binId: 1,
  batchId: null,
  batchCode: "",
  quantityOnHand: 0,
  quantityAllocated: 0,
};

// ─────────────────────────────────────────
export default function MaterialsPage() {
  //fixx
const [categories, setCategories] = useState<CategoryItem[]>([]);
const [categoriesLoading, setCategoriesLoading] = useState(true);
useEffect(() => {
  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const res = await getCategories();
      setCategories(res.items ?? []);
    } catch (error) {
      console.error("Load categories failed:", error);
      toast.error("Không tải được danh mục vật tư");
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  loadCategories();
}, []);
const getCategoryName = (id: number | null) =>
  categories.find((c) => c.categoryId === id)?.name || "—";
const getWhName = (warehouseId: number) =>
  warehouses.find((w) => w.warehouseId === warehouseId)?.name || `Kho #${warehouseId}`;
//warehouses
const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
const [warehousesLoading, setWarehousesLoading] = useState(true);
useEffect(() => {
  const loadWarehouses = async () => {
    try {
      setWarehousesLoading(true);
      const data = await getWarehouses();
      setWarehouses(Array.isArray(data) ? data : data.items ?? []);
    } catch (error) {
      console.error("Load warehouses failed:", error);
      toast.error("Không tải được danh sách kho");
      setWarehouses([]);
    } finally {
      setWarehousesLoading(false);
    }
  };

  loadWarehouses();
}, []);
//bins
const [bins, setBins] = useState<BinDto[]>([]);
const [binsLoading, setBinsLoading] = useState(true);
const getBin = (binId: number) => bins.find((b) => b.binId === binId);
const getBinsByWarehouse = (warehouseId: number) =>
  bins.filter((b) => b.warehouseId === warehouseId);
useEffect(() => {
  const loadBins = async () => {
    try {
      setBinsLoading(true);
      const data = await getBins();
      setBins(Array.isArray(data) ? data : data.items ?? []);
    } catch (error) {
      console.error("Load bins failed:", error);
      toast.error("Không tải được danh sách vị trí lưu trữ");
      setBins([]);
    } finally {
      setBinsLoading(false);
    }
  };

  loadBins();
}, []);

  // ── Material state ──
  // const [materials, setMaterials] = useState(initialMaterials);
const [materials, setMaterials] = useState<Material[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
async function loadMaterials() {
  try {
    setLoading(true);
    setError(null);

    const res = await getMaterials({
      page: 1,
      pageSize: 100,
    });

    const mapped: Material[] = res.items.map((item: MaterialItem) => ({
      materialId: item.materialId,
      code: item.code,
      name: item.name,
      unit: item.unit ?? "",
      massPerUnit: item.massPerUnit ?? null,
      minStockLevel: item.minStockLevel ?? null,
      categoryId: item.categoryId ?? null,
      unitPrice: item.unitPrice ?? null,
      technicalStandard: item.technicalStandard ?? "",
      specification: item.specification ?? "",
    }));

    setMaterials(mapped);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Không tải được vật tư");
  } finally {
    setLoading(false);
  }
}

useEffect(() => {
  loadMaterials();
}, []);
useEffect(() => {
  const loadInventory = async () => {
    if (materials.length === 0) {
      setInventory([]);
      return;
    }

    try {
      setInventoryLoading(true);

      const results = await Promise.allSettled(
        materials.map(async (m) => {
          const groups = await getInventoryByMaterial(m.materialId);
          return mapInventoryGroupsToItems(m.materialId, groups ?? []);
        })
      );

      const merged: InvItem[] = results
        .filter(
          (r): r is PromiseFulfilledResult<InvItem[]> => r.status === "fulfilled"
        )
        .flatMap((r) => r.value);

      setInventory(merged);

      const failedCount = results.filter((r) => r.status === "rejected").length;
      if (failedCount > 0) {
        console.error("Some inventory requests failed:", results);
        toast.error(`Không tải được tồn kho của ${failedCount} vật tư`);
      }
    } catch (error) {
      console.error("Load inventory failed:", error);
      toast.error("Không tải được dữ liệu tồn kho");
      setInventory([]);
    } finally {
      setInventoryLoading(false);
    }
  };

  loadInventory();
}, [materials]);
// Load materials from API
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [matModal, setMatModal] = useState(false);
  const [editMatId, setEditMatId] = useState<number | null>(null);
  const [matForm, setMatForm] = useState<MatForm>(emptyMatForm);
  const [unitWarning, setUnitWarning] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const perPage = 6;

  // ── Inventory state ──


const [inventory, setInventory] = useState<InvItem[]>([]);
const [inventoryLoading, setInventoryLoading] = useState(false);
  const [invModal, setInvModal] = useState(false);
  const [editInvId, setEditInvId] = useState<number | null>(null);
  const [invMaterialId, setInvMaterialId] = useState<number | null>(null); // which material's inv we're editing
  const [invForm, setInvForm] = useState<InvForm>(emptyInvForm);

  // ── Filtered bins by selected warehouse ──
  const availableBins = useMemo(
    () => bins.filter((b) => b.warehouseId === invForm.warehouseId),
    [invForm.warehouseId]
  );
  const selectedInventoryMaterial = useMemo(
    () => materials.find((m) => m.materialId === invMaterialId) ?? null,
    [materials, invMaterialId]
  );
  const inventoryRequiresWholeQuantity = selectedInventoryMaterial
    ? requiresWholeMaterialQuantity(selectedInventoryMaterial.unit)
    : false;
  const inventoryQuantityRuleText = selectedInventoryMaterial
    ? getMaterialQuantityRuleText(selectedInventoryMaterial.unit)
    : null;

  // ── Material totals (derived from state) ──
  const getTotalOnHand = (materialId: number) =>
    inventory.filter((i) => i.materialId === materialId).reduce((s, i) => s + i.quantityOnHand, 0);
  const getTotalAllocated = (materialId: number) =>
    inventory.filter((i) => i.materialId === materialId).reduce((s, i) => s + i.quantityAllocated, 0);

  // ── Group inventory by warehouse ──
  const getInventoryByWarehouse = (materialId: number) => {
    const items = inventory.filter((i) => i.materialId === materialId);
    const grouped: Record<number, {
      warehouseName: string;
      rows: { invId: number; binId: number; binCode: string; binType: string; batchCode: string; qtyOnHand: number; qtyAllocated: number; available: number }[];
      totalOnHand: number; totalAllocated: number;
    }> = {};
    items.forEach((item) => {
      if (!grouped[item.warehouseId]) {
        grouped[item.warehouseId] = { warehouseName: getWhName(item.warehouseId), rows: [], totalOnHand: 0, totalAllocated: 0 };
      }
      const bin = getBin(item.binId);
      grouped[item.warehouseId].rows.push({
        invId: item.id,
        binId: item.binId,
        binCode: bin?.code || `BIN#${item.binId}`,
        binType: bin?.type || "—",
        batchCode: item.batchCode,
        qtyOnHand: item.quantityOnHand,
        qtyAllocated: item.quantityAllocated,
        available: item.quantityOnHand - item.quantityAllocated,
      });
      grouped[item.warehouseId].totalOnHand += item.quantityOnHand;
      grouped[item.warehouseId].totalAllocated += item.quantityAllocated;
    });
    return Object.entries(grouped).map(([whId, data]) => ({ warehouseId: Number(whId), ...data }));
  };

  // ── Material CRUD ──
  const openAddMat = () => {
  setMatForm({
    ...emptyMatForm,
    categoryId: categories[0]?.categoryId ?? null,
  });
  setUnitWarning(null);
  setEditMatId(null);
  setMatModal(true);
};
  const openEditMat = (m: Material) => {
    const normalizedUnit = canonicalizeMaterialUnit(m.unit);
    setMatForm({ code: m.code, name: m.name, unit: normalizedUnit ?? "", massPerUnit: m.massPerUnit, minStockLevel: m.minStockLevel, categoryId: m.categoryId, unitPrice: m.unitPrice, technicalStandard: m.technicalStandard, specification: m.specification });
    setUnitWarning(
      normalizedUnit
        ? null
        : (m.unit.trim()
            ? `Đơn vị hiện tại "${m.unit}" không còn hợp lệ. Vui lòng chọn lại trước khi lưu.`
            : "Vật tư này chưa có đơn vị tính hợp lệ. Vui lòng chọn lại trước khi lưu.")
    );
    setEditMatId(m.materialId);
    setMatModal(true);
  };
 const toMaterialPayload = (unit: string): UpsertMaterialPayload => ({
  code: matForm.code.trim().toUpperCase(),
  name: matForm.name.trim(),
  unit,
  massPerUnit: matForm.massPerUnit,
  minStockLevel: matForm.minStockLevel,
  categoryId: matForm.categoryId,
  unitPrice: matForm.unitPrice,
  technicalStandard: matForm.technicalStandard.trim(),
  specification: matForm.specification.trim(),
});

const saveMat = async () => {
  if (!matForm.code.trim() || !matForm.name.trim()) {
    toast.error("Mã và Tên vật tư là bắt buộc");
    return;
  }

  const normalizedUnit = canonicalizeMaterialUnit(matForm.unit);
  if (!normalizedUnit) {
    setUnitWarning("Vui lòng chọn đơn vị tính hợp lệ trong danh sách.");
    toast.error("Đơn vị tính không hợp lệ");
    return;
  }

  if (matForm.minStockLevel != null) {
    if (matForm.minStockLevel < 0) {
      toast.error("Tồn tối thiểu không được âm");
      return;
    }

    if (!Number.isInteger(matForm.minStockLevel)) {
      toast.error(
        requiresWholeMaterialQuantity(normalizedUnit)
          ? `Đơn vị tính "${normalizedUnit}" chỉ chấp nhận tồn tối thiểu là số nguyên`
          : "Tồn tối thiểu hiện chỉ hỗ trợ số nguyên"
      );
      return;
    }
  }

  try {
    const payload = toMaterialPayload(normalizedUnit);

    if (editMatId !== null) {
      await updateMaterial(editMatId, payload);
      toast.success("Cập nhật vật tư thành công");
    } else {
      await createMaterial(payload);
      toast.success("Thêm vật tư thành công");
    }

    setMatModal(false);
    setEditMatId(null);
    setMatForm(emptyMatForm);
    setUnitWarning(null);
    await loadMaterials();
  } catch (error) {
    console.error("Save material failed:", error);
    toast.error(error instanceof Error ? error.message : "Lưu vật tư thất bại");
  }
};
const deleteMat = async (id: number) => {
  try {
    await removeMaterial(id);
    toast.success("Xóa vật tư thành công");

    if (expandedId === id) setExpandedId(null);
    await loadMaterials();
  } catch (error) {
    console.error("Delete material failed:", error);
    toast.error(error instanceof Error ? error.message : "Xóa vật tư thất bại");
  }
};

  // ── Inventory CRUD ──
const openAddInv = (materialId: number) => {
  const firstBin = bins[0];

  setInvForm({
    ...emptyInvForm,
    warehouseId: firstBin?.warehouseId ?? 0,
    binId: firstBin?.binId ?? 0,
    batchId: null,
    batchCode: "",
  });

  setEditInvId(null);
  setInvMaterialId(materialId);
  setInvModal(true);
};

const openEditInv = (inv: InvItem) => {
  setInvForm({
    warehouseId: inv.warehouseId,
    binId: inv.binId,
    batchId: inv.batchId,
    batchCode: inv.batchCode,
    quantityOnHand: inv.quantityOnHand,
    quantityAllocated: inv.quantityAllocated,
  });
  setEditInvId(inv.id);
  setInvMaterialId(inv.materialId);
  setInvModal(true);
};
const mapInventoryGroupsToItems = (
  materialId: number,
  groups: InventoryGroup[]
): InvItem[] => {
  return groups.flatMap((group) =>
    (group.rows ?? []).map((row) => ({
      id: row.id,
      warehouseId: row.warehouseId,
      binId: row.binId,
      materialId,
      batchId: row.batchId,
      batchCode: row.batchCode,
      quantityOnHand: Number(row.quantityOnHand ?? 0),
      quantityAllocated: Number(row.quantityAllocated ?? 0),
    }))
  );
};
const refreshInventoryForMaterial = async (materialId: number) => {
  const groups = await getInventoryByMaterial(materialId);
  const items = mapInventoryGroupsToItems(materialId, groups ?? []);

  setInventory((prev) => [
    ...prev.filter((i) => i.materialId !== materialId),
    ...items,
  ]);
};
const saveInv = async () => {
  if (invMaterialId === null) {
    toast.error("Không xác định được vật tư");
    return;
  }

  if (!invForm.batchCode.trim()) {
    toast.error("Mã lô hàng là bắt buộc");
    return;
  }

  if (invForm.quantityAllocated > invForm.quantityOnHand) {
    toast.error("Số lượng phân bổ không được vượt quá tồn kho");
    return;
  }

  if (invForm.quantityOnHand < 0 || invForm.quantityAllocated < 0) {
    toast.error("Số lượng không được âm");
    return;
  }

  if (selectedInventoryMaterial && inventoryRequiresWholeQuantity) {
    if (!Number.isInteger(invForm.quantityOnHand)) {
      toast.error(`Đơn vị tính "${getMaterialUnitLabel(selectedInventoryMaterial.unit)}" chỉ chấp nhận tồn kho là số nguyên`);
      return;
    }

    if (!Number.isInteger(invForm.quantityAllocated)) {
      toast.error(`Đơn vị tính "${getMaterialUnitLabel(selectedInventoryMaterial.unit)}" chỉ chấp nhận số lượng phân bổ là số nguyên`);
      return;
    }
  }

  try {
    const payload: UpsertInventoryPayload = {
      warehouseId: invForm.warehouseId,
      binId: invForm.binId,
      batchCode: invForm.batchCode.trim().toUpperCase(),
      quantityOnHand: invForm.quantityOnHand,
      quantityAllocated: invForm.quantityAllocated,
      ...(editInvId !== null && invForm.batchId != null
        ? { batchId: invForm.batchId }
        : {}),
    };

    if (editInvId !== null) {
      await updateInventory(invMaterialId, editInvId, payload);
      toast.success("Cập nhật vị trí tồn kho thành công");
    } else {
      await createInventory(invMaterialId, payload);
      toast.success("Thêm vị trí tồn kho thành công");
    }

    await refreshInventoryForMaterial(invMaterialId);
    setInvModal(false);
    setEditInvId(null);
    setInvMaterialId(null);
    setInvForm(emptyInvForm);
  } catch (error) {
    console.error("Save inventory failed:", error);
    toast.error(error instanceof Error ? error.message : "Lưu vị trí tồn kho thất bại");
  }
};
  const deleteInv = async (id: number) => {
  const item = inventory.find((i) => i.id === id);
  if (!item) {
    toast.error("Không tìm thấy bản ghi tồn kho");
    return;
  }

  try {
    await removeInventory(item.materialId, id);
    await refreshInventoryForMaterial(item.materialId);
    toast.success("Xóa vị trí tồn kho thành công");
  } catch (error) {
    console.error("Delete inventory failed:", error);
    toast.error(error instanceof Error ? error.message : "Xóa vị trí tồn kho thất bại");
  }
};

  // Handle warehouse change in inv form → reset bin to first available
  const handleInvWarehouseChange = (warehouseId: number) => {
    const firstBin = bins.find((b) => b.warehouseId === warehouseId);
    setInvForm((f) => ({ ...f, warehouseId, binId: firstBin?.binId ?? 0 }));
  };

  // ── Pagination ──
  const filtered = useMemo(() =>
    materials.filter((m) => {
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.code.toLowerCase().includes(search.toLowerCase());
      const matchCat = catFilter === "all" || m.categoryId === Number(catFilter);
      return matchSearch && matchCat;
    }),
    [materials, search, catFilter]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const toggleExpand = (id: number) => setExpandedId(expandedId === id ? null : id);

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-gray-900">Vật tư</h1>
          <p className="text-gray-500 mt-1">Danh mục vật tư & phân bổ tồn kho theo Kho / Vị trí kệ</p>
        </div>
        <button onClick={openAddMat} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
          <Plus className="w-4 h-4" /> Thêm vật tư
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm theo mã hoặc tên..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(1); }} className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm outline-none">
          <option value="all">Tất cả danh mục</option>
          {categories.map((c) => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
        </select>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="w-10 px-3 py-3"></th>
                {["Mã", "Tên vật tư", "Danh mục", "ĐVT", "Đơn giá", "Tồn kho", "Đã phân bổ", "Khả dụng", "Tồn TT", "Thao tác"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((m) => {
                const totalOnHand = getTotalOnHand(m.materialId);
                const totalAllocated = getTotalAllocated(m.materialId);
                const available = totalOnHand - totalAllocated;
                const isLow = m.minStockLevel != null && available <= m.minStockLevel;
                const isExpanded = expandedId === m.materialId;
                const warehouseData = isExpanded ? getInventoryByWarehouse(m.materialId) : [];

                return (
                  <Fragment key={m.materialId}>
                    {/* Material row */}
                    <tr
                      className={`hover:bg-gray-50/50 cursor-pointer ${isExpanded ? "bg-blue-50/30" : ""}`}
                      onClick={() => toggleExpand(m.materialId)}
                    >
                      <td className="px-3 py-3 text-center">
                        <button className="p-0.5 text-gray-400 hover:text-gray-600">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-700">{m.code}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-900">{m.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">{getCategoryName(m.categoryId)}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{getMaterialUnitLabel(m.unit)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{m.unitPrice?.toLocaleString() ?? "—"}đ</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{totalOnHand.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-orange-600">{totalAllocated.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${isLow ? "text-red-600" : "text-emerald-600"}`}>
                          {available.toLocaleString()}
                        </span>
                        {isLow && <span className="ml-1 text-xs text-red-500">(Thấp)</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{m.minStockLevel?.toLocaleString() ?? "—"}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                         <button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    openEditMat(m);
  }}
  className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600"
  title="Sửa vật tư"
>
  <Edit2 className="w-4 h-4" />
</button>

<button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    deleteMat(m.materialId);
  }}
  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500"
  title="Xóa vật tư"
>
  <Trash2 className="w-4 h-4" />
</button>
                        </div>
                      </td>
                    </tr>

                    {/* ── Expanded: Inventory by Warehouse → Bin → Batch ── */}
                    {isExpanded && (
                      <tr key={`exp-${m.materialId}`}>
                        <td colSpan={11} className="px-0 py-0">
                          <div className="bg-blue-50/20 border-t border-b border-blue-100">

                            {/* Nút thêm vị trí */}
                          <div className="flex items-center justify-between px-6 pt-3 pb-1">
  <span className="text-xs text-blue-600 uppercase tracking-wider">Vị trí tồn kho</span>
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      openAddInv(m.materialId);
    }}
    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    title="Thêm vị trí"
  >
    <Plus className="w-3.5 h-3.5" />
    Thêm vị trí
  </button>
</div>
                            {warehouseData.length === 0 ? (
                              <div className="px-8 py-4 text-sm text-gray-400 italic">Chưa có dữ liệu tồn kho cho vật tư này</div>
                            ) : (
                              <div className="divide-y divide-gray-100">
                                {warehouseData.map((wh) => (
                                  <div key={wh.warehouseId} className="px-6 py-3">
                                    {/* Warehouse header */}
                                    <div className="flex items-center gap-2 mb-2">
                                      <Warehouse className="w-4 h-4 text-blue-500" />
                                      <span className="text-sm text-gray-800">{wh.warehouseName}</span>
                                      <span className="ml-auto text-xs text-gray-500">
                                        Tồn kho: <span className="text-gray-800">{wh.totalOnHand.toLocaleString()}</span>
                                        {" · "}Đã phân bổ: <span className="text-orange-600">{wh.totalAllocated.toLocaleString()}</span>
                                        {" · "}Khả dụng: <span className="text-emerald-600">{(wh.totalOnHand - wh.totalAllocated).toLocaleString()}</span>
                                      </span>
                                    </div>

                                    {/* Bin detail table */}
                                    <div className="ml-6 bg-white rounded-lg border border-gray-100 overflow-hidden">
                                      <table className="w-full">
                                        <thead>
                                          <tr className="bg-gray-50/70">
                                            <th className="text-left px-4 py-2 text-xs text-gray-500 uppercase">Vị trí kệ</th>
                                            <th className="text-left px-4 py-2 text-xs text-gray-500 uppercase">Loại</th>
                                            <th className="text-left px-4 py-2 text-xs text-gray-500 uppercase">Mã lô</th>
                                            <th className="text-right px-4 py-2 text-xs text-gray-500 uppercase">Tồn kho</th>
                                            <th className="text-right px-4 py-2 text-xs text-gray-500 uppercase">Đã phân bổ</th>
                                            <th className="text-right px-4 py-2 text-xs text-gray-500 uppercase">Khả dụng</th>
                                            <th className="text-center px-4 py-2 text-xs text-gray-500 uppercase">Thao tác</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                         {wh.rows.map((row) => {
  const invId = row.invId;

  return (
    <tr key={invId} className="hover:bg-gray-50/60 group">
      <td className="px-4 py-2">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-sm text-gray-700">{row.binCode}</span>
        </div>
      </td>

      <td className="px-4 py-2">
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            typeBadgeCls[row.binType] || "bg-gray-100 text-gray-600"
          }`}
        >
          {typeLabel[row.binType] || row.binType}
        </span>
      </td>

      <td className="px-4 py-2 text-sm text-gray-600 font-mono">{row.batchCode}</td>
      <td className="px-4 py-2 text-sm text-gray-900 text-right">
        {row.qtyOnHand.toLocaleString()}
      </td>
      <td className="px-4 py-2 text-sm text-orange-600 text-right">
        {row.qtyAllocated.toLocaleString()}
      </td>
      <td className="px-4 py-2 text-sm text-emerald-600 text-right">
        {row.available.toLocaleString()}
      </td>

     <td className="px-4 py-2">
  <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();

        const invId = row.invId;
        const invItem = inventory.find((i) => i.id === invId);

        if (!invItem) {
          toast.error("Không tìm thấy bản ghi tồn kho");
          return;
        }

        openEditInv(invItem);
      }}
      className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
      title="Sửa vị trí"
    >
      <Edit2 className="w-3.5 h-3.5" />
    </button>

    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        deleteInv(row.invId);
      }}
      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
      title="Xóa vị trí"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  </div>
</td>
    </tr>
  );
})}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Specs summary */}
                            <div className="px-6 py-3 border-t border-gray-200 bg-white/60">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-400 text-xs uppercase">Khối lượng/ĐVT</span>
                                  <p className="text-gray-700">{m.massPerUnit ?? "—"} kg</p>
                                </div>
                                <div>
                                  <span className="text-gray-400 text-xs uppercase">Tiêu chuẩn kỹ thuật</span>
                                  <p className="text-gray-700">{m.technicalStandard || "—"}</p>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-gray-400 text-xs uppercase">Quy cách</span>
                                  <p className="text-gray-700">{m.specification || "—"}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
          <span>{filtered.length} vật tư</span>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <span className="px-2 py-1">{page}/{totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* ══ Modal: Thêm / Sửa Vật tư ══ */}
      {matModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h3 className="text-gray-900">{editMatId !== null ? "Chỉnh sửa vật tư" : "Thêm vật tư mới"}</h3>
              <button onClick={() => setMatModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Mã vật tư *</label>
                  <input value={matForm.code} onChange={(e) => setMatForm({ ...matForm, code: e.target.value.toUpperCase() })} className={inputCls} placeholder="STL-001" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Danh mục</label>
                  <select value={matForm.categoryId ?? ""} onChange={(e) => setMatForm({ ...matForm, categoryId: e.target.value ? Number(e.target.value) : null })} className={inputCls}>
                    <option value="">Không có</option>
                    {categories.map((c) => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tên vật tư *</label>
                <input value={matForm.name} onChange={(e) => setMatForm({ ...matForm, name: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Đơn vị tính *</label>
                  <select
                    value={matForm.unit}
                    onChange={(e) => {
                      setMatForm({ ...matForm, unit: e.target.value });
                      setUnitWarning(null);
                    }}
                    className={inputCls}
                  >
                    <option value="">Chọn đơn vị tính</option>
                    {MATERIAL_UNIT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {unitWarning && <p className="mt-1 text-xs text-amber-600">{unitWarning}</p>}
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Khối lượng/ĐVT</label>
                  <input type="number" step="0.01" value={matForm.massPerUnit ?? ""} onChange={(e) => setMatForm({ ...matForm, massPerUnit: e.target.value ? Number(e.target.value) : null })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Tồn tối thiểu</label>
                  <input type="number" min={0} step={1} value={matForm.minStockLevel ?? ""} onChange={(e) => setMatForm({ ...matForm, minStockLevel: e.target.value ? Number(e.target.value) : null })} className={inputCls} />
                  <p className="mt-1 text-xs text-gray-500">Tồn tối thiểu hiện chỉ nhận số nguyên.</p>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Đơn giá (VNĐ)</label>
                <input type="number" value={matForm.unitPrice ?? ""} onChange={(e) => setMatForm({ ...matForm, unitPrice: e.target.value ? Number(e.target.value) : null })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tiêu chuẩn kỹ thuật</label>
                <input value={matForm.technicalStandard} onChange={(e) => setMatForm({ ...matForm, technicalStandard: e.target.value })} className={inputCls} placeholder="TCVN, ISO, ASTM..." />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Quy cách</label>
                <textarea value={matForm.specification} onChange={(e) => setMatForm({ ...matForm, specification: e.target.value })} rows={2} className={`${inputCls} resize-none`} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setMatModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Hủy</button>
              <button onClick={saveMat} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Save className="w-4 h-4" />{editMatId !== null ? "Cập nhật" : "Thêm mới"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal: Thêm / Sửa Vị trí tồn kho ══ */}
      {invModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-blue-500" />
                <h3 className="text-gray-900">{editInvId !== null ? "Sửa vị trí tồn kho" : "Thêm vị trí tồn kho"}</h3>
              </div>
              <button onClick={() => setInvModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">

              {/* Kho */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Kho hàng *</label>
                <select
                  value={invForm.warehouseId}
                  onChange={(e) => handleInvWarehouseChange(Number(e.target.value))}
                  className={inputCls}
                >
                  {warehouses.map((w) => (
                    <option key={w.warehouseId} value={w.warehouseId}>{w.name}</option>
                  ))}
                </select>
              </div>

              {/* Vị trí kệ – lọc theo kho đã chọn */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Vị trí kệ *</label>
                <select
                  value={invForm.binId}
                  onChange={(e) => setInvForm({ ...invForm, binId: Number(e.target.value) })}
                  className={inputCls}
                >
                  {availableBins.length === 0 ? (
                    <option value="">Không có vị trí</option>
                  ) : availableBins.map((b) => (
                    <option key={b.binId} value={b.binId}>
                      {b.code} — {typeLabel[b.type] || b.type}
                    </option>
                  ))}
                </select>
                {availableBins.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Kho này chưa có vị trí kệ nào. Vui lòng thêm trong Danh mục → Vị trí kệ.</p>
                )}
              </div>

              {/* Mã lô */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Mã lô hàng *</label>
                <input
                  value={invForm.batchCode}
                  onChange={(e) => setInvForm({ ...invForm, batchCode: e.target.value })}
                  className={inputCls}
                  placeholder="VD: B-2026-001"
                />
              </div>

              {/* Số lượng */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Tồn kho (SL thực)</label>
                  <input
                    type="number"
                    min={0}
                    step={inventoryRequiresWholeQuantity ? 1 : "0.001"}
                    value={invForm.quantityOnHand}
                    onChange={(e) => setInvForm({ ...invForm, quantityOnHand: Number(e.target.value) })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Đã phân bổ</label>
                  <input
                    type="number"
                    min={0}
                    step={inventoryRequiresWholeQuantity ? 1 : "0.001"}
                    value={invForm.quantityAllocated}
                    onChange={(e) => setInvForm({ ...invForm, quantityAllocated: Number(e.target.value) })}
                    className={inputCls}
                  />
                </div>
              </div>
              {inventoryQuantityRuleText && (
                <p className="text-xs text-gray-500">{inventoryQuantityRuleText}</p>
              )}

              {/* Khả dụng preview */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-100">
                <span className="text-sm text-gray-500">Khả dụng (tự tính):</span>
                <span className={`text-sm ${invForm.quantityOnHand - invForm.quantityAllocated < 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {(invForm.quantityOnHand - invForm.quantityAllocated).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setInvModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Hủy</button>
              <button onClick={saveInv} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Save className="w-4 h-4" />{editInvId !== null ? "Cập nhật" : "Thêm vị trí"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
