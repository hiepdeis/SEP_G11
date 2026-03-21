"use client";
import { useState, useMemo, Fragment } from "react";
import {
  Search, Plus, Edit2, Trash2, X, Package,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Warehouse, MapPin, Save,
} from "lucide-react";
import { toast } from "sonner";

// ─── Reference Data (matches DB) ───
const CATEGORIES = [
  { categoryId: 1, code: "RAW", name: "Nguyên vật liệu" },
  { categoryId: 2, code: "PKG", name: "Vật tư đóng gói" },
  { categoryId: 3, code: "CHM", name: "Hóa chất" },
  { categoryId: 4, code: "SPR", name: "Phụ tùng thay thế" },
  { categoryId: 5, code: "ELC", name: "Linh kiện điện tử" },
];

const WAREHOUSES_LIST = [
  { warehouseId: 1, name: "Kho chính Biên Hòa" },
  { warehouseId: 2, name: "Kho lạnh Q.9" },
  { warehouseId: 3, name: "Kho trung chuyển BD" },
  { warehouseId: 4, name: "Kho lưu trữ Long An" },
];

const BINS_LIST = [
  { binId: 1, code: "A-01-01", warehouseId: 1, type: "rack" },
  { binId: 2, code: "A-01-02", warehouseId: 1, type: "rack" },
  { binId: 3, code: "B-02-01", warehouseId: 1, type: "shelf" },
  { binId: 4, code: "COLD-01", warehouseId: 2, type: "cold" },
  { binId: 5, code: "FLOOR-01", warehouseId: 3, type: "floor" },
  { binId: 6, code: "A-02-01", warehouseId: 1, type: "rack" },
  { binId: 7, code: "STORE-01", warehouseId: 4, type: "shelf" },
];

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
interface InvItem {
  id: number;
  warehouseId: number;
  binId: number;
  materialId: number;
  batchCode: string; // lưu thẳng mã lô cho đơn giản
  quantityOnHand: number;
  quantityAllocated: number;
}

const initialMaterials: Material[] = [
  { materialId: 1, code: "STL-001", name: "Thép thanh A1", unit: "kg", massPerUnit: 1.0, minStockLevel: 500, categoryId: 1, unitPrice: 25000, technicalStandard: "TCVN 1651:2018", specification: "D16, dài 11.7m" },
  { materialId: 2, code: "COP-002", name: "Dây đồng B2", unit: "m", massPerUnit: 0.5, minStockLevel: 300, categoryId: 1, unitPrice: 45000, technicalStandard: "IEC 60228", specification: "2.5mm², cách điện PVC" },
  { materialId: 3, code: "PKG-001", name: "Thùng carton L", unit: "pcs", massPerUnit: 0.3, minStockLevel: 1000, categoryId: 2, unitPrice: 8000, technicalStandard: "", specification: "60x40x40cm, 5 lớp" },
  { materialId: 4, code: "RAW-003", name: "Hạt nhựa PP", unit: "kg", massPerUnit: 1.0, minStockLevel: 800, categoryId: 1, unitPrice: 12000, technicalStandard: "ASTM D4101", specification: "MFI 12g/10min" },
  { materialId: 5, code: "RAW-004", name: "Tấm nhôm", unit: "sheet", massPerUnit: 2.7, minStockLevel: 200, categoryId: 1, unitPrice: 180000, technicalStandard: "AA6061-T6", specification: "1220x2440x2mm" },
  { materialId: 6, code: "CHM-001", name: "Sơn xanh công nghiệp", unit: "L", massPerUnit: 1.2, minStockLevel: 100, categoryId: 3, unitPrice: 95000, technicalStandard: "ISO 12944", specification: "Epoxy 2 thành phần" },
  { materialId: 7, code: "ELC-001", name: "IC điều khiển STM32", unit: "pcs", massPerUnit: 0.01, minStockLevel: 50, categoryId: 5, unitPrice: 85000, technicalStandard: "", specification: "STM32F103C8T6, LQFP48" },
  { materialId: 8, code: "SPR-001", name: "Vòng bi 6205", unit: "pcs", massPerUnit: 0.15, minStockLevel: 100, categoryId: 4, unitPrice: 65000, technicalStandard: "ISO 15", specification: "25x52x15mm, SKF" },
];

const initialInventory: InvItem[] = [
  { id: 1,  warehouseId: 1, binId: 1, materialId: 1, batchCode: "B-2026-001", quantityOnHand: 500, quantityAllocated: 100 },
  { id: 2,  warehouseId: 1, binId: 2, materialId: 1, batchCode: "B-2026-001", quantityOnHand: 300, quantityAllocated: 0 },
  { id: 3,  warehouseId: 3, binId: 5, materialId: 1, batchCode: "B-2026-002", quantityOnHand: 400, quantityAllocated: 50 },
  { id: 4,  warehouseId: 1, binId: 3, materialId: 2, batchCode: "B-2026-003", quantityOnHand: 500, quantityAllocated: 80 },
  { id: 5,  warehouseId: 2, binId: 4, materialId: 2, batchCode: "B-2026-010", quantityOnHand: 300, quantityAllocated: 0 },
  { id: 6,  warehouseId: 1, binId: 1, materialId: 3, batchCode: "B-2026-004", quantityOnHand: 3000, quantityAllocated: 500 },
  { id: 7,  warehouseId: 3, binId: 5, materialId: 3, batchCode: "B-2026-004", quantityOnHand: 2000, quantityAllocated: 200 },
  { id: 8,  warehouseId: 1, binId: 6, materialId: 4, batchCode: "B-2026-005", quantityOnHand: 1800, quantityAllocated: 300 },
  { id: 9,  warehouseId: 4, binId: 7, materialId: 4, batchCode: "B-2026-005", quantityOnHand: 1200, quantityAllocated: 0 },
  { id: 10, warehouseId: 1, binId: 2, materialId: 5, batchCode: "B-2026-006", quantityOnHand: 250, quantityAllocated: 30 },
  { id: 11, warehouseId: 3, binId: 5, materialId: 5, batchCode: "B-2026-006", quantityOnHand: 150, quantityAllocated: 0 },
  { id: 12, warehouseId: 2, binId: 4, materialId: 6, batchCode: "B-2026-007", quantityOnHand: 250, quantityAllocated: 40 },
  { id: 13, warehouseId: 1, binId: 3, materialId: 7, batchCode: "B-2026-008", quantityOnHand: 120, quantityAllocated: 20 },
  { id: 14, warehouseId: 1, binId: 6, materialId: 8, batchCode: "B-2026-009", quantityOnHand: 200, quantityAllocated: 0 },
  { id: 15, warehouseId: 4, binId: 7, materialId: 8, batchCode: "B-2026-009", quantityOnHand: 80, quantityAllocated: 10 },
];

const getCategoryName = (id: number | null) => CATEGORIES.find((c) => c.categoryId === id)?.name || "—";
const getWhName = (id: number) => WAREHOUSES_LIST.find((w) => w.warehouseId === id)?.name || `Kho#${id}`;
const getBin = (id: number) => BINS_LIST.find((b) => b.binId === id);

const typeBadgeCls: Record<string, string> = {
  rack: "bg-blue-50 text-blue-600",
  shelf: "bg-purple-50 text-purple-600",
  floor: "bg-amber-50 text-amber-600",
  cold: "bg-cyan-50 text-cyan-600",
};
const typeLabel: Record<string, string> = { rack: "Giá kệ", shelf: "Kệ đơn", floor: "Sàn", cold: "Kho lạnh" };

type MatForm = Omit<Material, "materialId">;
const emptyMatForm: MatForm = { code: "", name: "", unit: "kg", massPerUnit: null, minStockLevel: null, categoryId: 1, unitPrice: null, technicalStandard: "", specification: "" };

interface InvForm {
  warehouseId: number;
  binId: number;
  batchCode: string;
  quantityOnHand: number;
  quantityAllocated: number;
}
const emptyInvForm: InvForm = { warehouseId: 1, binId: 1, batchCode: "", quantityOnHand: 0, quantityAllocated: 0 };

// ─────────────────────────────────────────
export default function MaterialsPage() {
  // ── Material state ──
  const [materials, setMaterials] = useState(initialMaterials);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [matModal, setMatModal] = useState(false);
  const [editMatId, setEditMatId] = useState<number | null>(null);
  const [matForm, setMatForm] = useState<MatForm>(emptyMatForm);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const perPage = 6;

  // ── Inventory state ──
  const [inventory, setInventory] = useState<InvItem[]>(initialInventory);
  const [invModal, setInvModal] = useState(false);
  const [editInvId, setEditInvId] = useState<number | null>(null);
  const [invMaterialId, setInvMaterialId] = useState<number | null>(null); // which material's inv we're editing
  const [invForm, setInvForm] = useState<InvForm>(emptyInvForm);

  // ── Filtered bins by selected warehouse ──
  const availableBins = useMemo(
    () => BINS_LIST.filter((b) => b.warehouseId === invForm.warehouseId),
    [invForm.warehouseId]
  );

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
  const openAddMat = () => { setMatForm({ ...emptyMatForm }); setEditMatId(null); setMatModal(true); };
  const openEditMat = (m: Material) => {
    setMatForm({ code: m.code, name: m.name, unit: m.unit, massPerUnit: m.massPerUnit, minStockLevel: m.minStockLevel, categoryId: m.categoryId, unitPrice: m.unitPrice, technicalStandard: m.technicalStandard, specification: m.specification });
    setEditMatId(m.materialId);
    setMatModal(true);
  };
  const saveMat = () => {
    if (!matForm.code || !matForm.name) { toast.error("Mã và Tên vật tư là bắt buộc"); return; }
    if (editMatId !== null) {
      setMaterials((prev) => prev.map((m) => m.materialId === editMatId ? { ...m, ...matForm } : m));
      toast.success("Cập nhật vật tư thành công");
    } else {
      setMaterials((prev) => [...prev, { ...matForm, materialId: Date.now() }]);
      toast.success("Thêm vật tư thành công");
    }
    setMatModal(false);
  };
  const deleteMat = (id: number) => {
    setMaterials((prev) => prev.filter((m) => m.materialId !== id));
    setInventory((prev) => prev.filter((i) => i.materialId !== id));
    if (expandedId === id) setExpandedId(null);
    toast.success("Xóa vật tư thành công");
  };

  // ── Inventory CRUD ──
  const openAddInv = (materialId: number) => {
    const firstBin = BINS_LIST[0];
    setInvForm({ ...emptyInvForm, warehouseId: firstBin.warehouseId, binId: firstBin.binId });
    setEditInvId(null);
    setInvMaterialId(materialId);
    setInvModal(true);
  };
  const openEditInv = (inv: InvItem) => {
    setInvForm({
      warehouseId: inv.warehouseId,
      binId: inv.binId,
      batchCode: inv.batchCode,
      quantityOnHand: inv.quantityOnHand,
      quantityAllocated: inv.quantityAllocated,
    });
    setEditInvId(inv.id);
    setInvMaterialId(inv.materialId);
    setInvModal(true);
  };
  const saveInv = () => {
    if (!invForm.batchCode.trim()) { toast.error("Mã lô hàng là bắt buộc"); return; }
    if (invForm.quantityAllocated > invForm.quantityOnHand) { toast.error("Số lượng phân bổ không được vượt quá tồn kho"); return; }
    if (editInvId !== null) {
      setInventory((prev) => prev.map((i) => i.id === editInvId ? {
        ...i,
        warehouseId: invForm.warehouseId,
        binId: invForm.binId,
        batchCode: invForm.batchCode.trim().toUpperCase(),
        quantityOnHand: invForm.quantityOnHand,
        quantityAllocated: invForm.quantityAllocated,
      } : i));
      toast.success("Cập nhật vị trí tồn kho thành công");
    } else {
      setInventory((prev) => [...prev, {
        id: Date.now(),
        materialId: invMaterialId!,
        warehouseId: invForm.warehouseId,
        binId: invForm.binId,
        batchCode: invForm.batchCode.trim().toUpperCase(),
        quantityOnHand: invForm.quantityOnHand,
        quantityAllocated: invForm.quantityAllocated,
      }]);
      toast.success("Thêm vị trí tồn kho thành công");
    }
    setInvModal(false);
  };
  const deleteInv = (id: number) => {
    setInventory((prev) => prev.filter((i) => i.id !== id));
    toast.success("Xóa vị trí tồn kho thành công");
  };

  // Handle warehouse change in inv form → reset bin to first available
  const handleInvWarehouseChange = (warehouseId: number) => {
    const firstBin = BINS_LIST.find((b) => b.warehouseId === warehouseId);
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
          {CATEGORIES.map((c) => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
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
                      <td className="px-4 py-3 text-sm text-gray-600">{m.unit}</td>
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
                          <button onClick={() => openEditMat(m)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600" title="Sửa vật tư">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteMat(m.materialId)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500" title="Xóa vật tư">
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
                                onClick={(e) => { e.stopPropagation(); openAddInv(m.materialId); }}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" /> Thêm vị trí
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
                                          {wh.rows.map((row) => (
                                            <tr key={row.invId} className="hover:bg-gray-50/60 group">
                                              <td className="px-4 py-2">
                                                <div className="flex items-center gap-1.5">
                                                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                                  <span className="text-sm text-gray-700">{row.binCode}</span>
                                                </div>
                                              </td>
                                              <td className="px-4 py-2">
                                                <span className={`text-xs px-2 py-0.5 rounded ${typeBadgeCls[row.binType] || "bg-gray-100 text-gray-600"}`}>
                                                  {typeLabel[row.binType] || row.binType}
                                                </span>
                                              </td>
                                              <td className="px-4 py-2 text-sm text-gray-600 font-mono">{row.batchCode}</td>
                                              <td className="px-4 py-2 text-sm text-gray-900 text-right">{row.qtyOnHand.toLocaleString()}</td>
                                              <td className="px-4 py-2 text-sm text-orange-600 text-right">{row.qtyAllocated.toLocaleString()}</td>
                                              <td className="px-4 py-2 text-sm text-emerald-600 text-right">{row.available.toLocaleString()}</td>
                                              <td className="px-4 py-2">
                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      const invItem = inventory.find((i) => i.id === row.invId)!;
                                                      openEditInv(invItem);
                                                    }}
                                                    className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                                                    title="Sửa vị trí"
                                                  >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button
                                                    onClick={(e) => { e.stopPropagation(); deleteInv(row.invId); }}
                                                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Xóa vị trí"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
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
                    {CATEGORIES.map((c) => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tên vật tư *</label>
                <input value={matForm.name} onChange={(e) => setMatForm({ ...matForm, name: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Đơn vị tính</label>
                  <input value={matForm.unit} onChange={(e) => setMatForm({ ...matForm, unit: e.target.value })} className={inputCls} placeholder="kg" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Khối lượng/ĐVT</label>
                  <input type="number" step="0.01" value={matForm.massPerUnit ?? ""} onChange={(e) => setMatForm({ ...matForm, massPerUnit: e.target.value ? Number(e.target.value) : null })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Tồn tối thiểu</label>
                  <input type="number" value={matForm.minStockLevel ?? ""} onChange={(e) => setMatForm({ ...matForm, minStockLevel: e.target.value ? Number(e.target.value) : null })} className={inputCls} />
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
                  {WAREHOUSES_LIST.map((w) => (
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
                    value={invForm.quantityAllocated}
                    onChange={(e) => setInvForm({ ...invForm, quantityAllocated: Number(e.target.value) })}
                    className={inputCls}
                  />
                </div>
              </div>

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