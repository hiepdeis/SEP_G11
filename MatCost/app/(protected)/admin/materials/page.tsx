"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search, Plus, Edit2, Trash2, X, Package,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { useTranslation } from "react-i18next";

import {
  MATERIAL_UNIT_OPTIONS,
  canonicalizeMaterialUnit,
  getMaterialUnitLabel,
} from "@/lib/material-units";
import { getCategories, type CategoryItem } from "@/services/material-categories";
import {
  getMaterials,
  createMaterial,
  updateMaterial,
  removeMaterial,
  type MaterialItem,
} from "@/services/admin-materials";

// --- TYPES ---
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

type MatForm = Omit<Material, "materialId">;

// --- CONSTANTS ---
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

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm";

// --- PAGE COMPONENT ---
export default function MaterialsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [matModal, setMatModal] = useState(false);
  const [editMatId, setEditMatId] = useState<number | null>(null);
  const [matForm, setMatForm] = useState<MatForm>(emptyMatForm);

  // --- LOADING DATA ---
  useEffect(() => {
    const loadRefs = async () => {
      try {
        const catData = await getCategories();
        setCategories(catData.items ?? []);
      } catch (error) {
        console.error("Refs failed:", error);
        toast.error(t("Failed to load reference data"));
      }
    };
    loadRefs();
    loadMaterials();
  }, []);

  async function loadMaterials() {
    try {
      setLoading(true);
      const res = await getMaterials({ page: 1, pageSize: 100 });
      setMaterials(res.items.map((item: MaterialItem) => ({
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
      })));
    } catch (err) {
      toast.error(t("Failed to load materials"));
    } finally {
      setLoading(false);
    }
  }

  // --- ACTIONS ---
  const openAddMat = () => { setMatForm({ ...emptyMatForm, categoryId: categories[0]?.categoryId ?? null }); setEditMatId(null); setMatModal(true); };
  const openEditMat = (m: Material) => {
    const normalized = canonicalizeMaterialUnit(m.unit);
    setMatForm({ code: m.code, name: m.name, unit: normalized ?? "", massPerUnit: m.massPerUnit, minStockLevel: m.minStockLevel, categoryId: m.categoryId, unitPrice: m.unitPrice, technicalStandard: m.technicalStandard, specification: m.specification });
    setEditMatId(m.materialId); setMatModal(true);
  };

  const saveMat = async () => {
    const normalized = canonicalizeMaterialUnit(matForm.unit);
    if (!matForm.code || !matForm.name || !normalized) { toast.error(t("Please enter code, name and a valid unit")); return; }
    try {
      const payload = { ...matForm, code: matForm.code.toUpperCase(), unit: normalized };
      if (editMatId !== null) await updateMaterial(editMatId, payload);
      else await createMaterial(payload);
      toast.success(t("Successfully saved")); setMatModal(false); loadMaterials();
    } catch (e) { toast.error(t("Failed to save material")); }
  };

  const deleteMat = async (id: number) => {
    if (!window.confirm(t("Delete this material?"))) return;
    try { await removeMaterial(id); toast.success(t("Delete Successful")); loadMaterials(); } catch (e) { toast.error(t("Delete Failed")); }
  };

  const getCategoryName = (id: number | null) => categories.find(c => c.categoryId === id)?.name || "—";

  const filtered = useMemo(() => materials.filter(m => (m.name.toLowerCase().includes(search.toLowerCase()) || m.code.toLowerCase().includes(search.toLowerCase())) && (catFilter === "all" || m.categoryId === Number(catFilter))), [materials, search, catFilter]);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage) || 1;

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Material Management")} />
        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
              <div><h1 className="text-2xl font-semibold text-gray-900">{t("Materials")}</h1><p className="text-sm text-gray-500 mt-1">{t("Manage materials & view stock levels")}</p></div>
              <button onClick={openAddMat} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"><Plus className="w-4 h-4" /> {t("Add Material")}</button>
            </div>

            <div className="flex gap-3 mt-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t("Search by code or name...")} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(1); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                <option value="all">{t("All categories")}</option>
                {categories.map((c) => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
              </select>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr className="text-[10px] text-gray-500 uppercase tracking-wider">
                      <th className="w-10 px-3 py-3"></th>
                      <th className="px-4 py-3">{t("Code")}</th>
                      <th className="px-4 py-3">{t("Material Name")}</th>
                      <th className="px-4 py-3">{t("Category")}</th>
                      <th className="px-4 py-3 text-center">{t("Unit")}</th>
                      <th className="px-4 py-3 text-right">{t("Unit Price")}</th>
                      <th className="px-4 py-3 text-right">{t("Standard")}</th>
                      <th className="px-4 py-3 text-center">{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {loading ? (
                      <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">{t("Loading data...")}</td></tr>
                    ) : paginated.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">{t("No materials found")}</td></tr>
                    ) : paginated.map((m) => (
                      <tr key={m.materialId} className="hover:bg-gray-50/50 cursor-pointer group" onClick={() => router.push(`/admin/materials/${m.materialId}`)}>
                        <td className="px-3 text-center text-gray-400 group-hover:text-blue-500"><Package className="w-4 h-4 mx-auto" /></td>
                        <td className="px-4 py-4"><span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 rounded text-gray-700 truncate">{m.code}</span></td>
                        <td className="px-4 py-4 font-medium text-gray-900">{m.name}</td>
                        <td className="px-4 py-4"><span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded font-bold underline decoration-blue-200">{getCategoryName(m.categoryId)}</span></td>
                        <td className="px-4 py-4 text-center text-gray-600 uppercase font-medium">{getMaterialUnitLabel(m.unit)}</td>
                        <td className="px-4 py-4 text-right font-bold text-slate-800">{m.unitPrice?.toLocaleString()} <span className="text-[10px] font-normal text-gray-400 underline lowercase">đ</span></td>
                        <td className="px-4 py-4 text-right text-gray-500 text-xs truncate max-w-[150px] italic">{m.technicalStandard || "—"}</td>
                        <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-center gap-1">
                            <button onClick={() => openEditMat(m)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteMat(m.materialId)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                <span>{filtered.length} {t("records")}</span>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(page - 1)} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="flex items-center font-medium">{page} / {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {matModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
             <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">{editMatId ? t("Edit Material") : t("Add Material")}</h3><button onClick={() => setMatModal(false)}><X className="w-5 h-5 text-gray-400" /></button></div>
             <div className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t("Material Code")} *</label><input value={matForm.code} onChange={e => setMatForm({...matForm, code: e.target.value.toUpperCase()})} className={inputCls} /></div>
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t("Category")}</label><select value={matForm.categoryId ?? ""} onChange={e => setMatForm({...matForm, categoryId: Number(e.target.value)})} className={inputCls}><option value="">{t("Select...")}</option>{categories.map(c => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}</select></div>
                </div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t("Material Name")} *</label><input value={matForm.name} onChange={e => setMatForm({...matForm, name: e.target.value})} className={inputCls} /></div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t("Unit")} *</label><select value={matForm.unit} onChange={e => setMatForm({...matForm, unit: e.target.value})} className={inputCls}><option value="">{t("Select...")}</option>{MATERIAL_UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t("Mass/Unit")}</label><input type="number" value={matForm.massPerUnit ?? ""} onChange={e => setMatForm({...matForm, massPerUnit: Number(e.target.value)})} className={inputCls} /></div>
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t("Min Stock")}</label><input type="number" value={matForm.minStockLevel ?? ""} onChange={e => setMatForm({...matForm, minStockLevel: Number(e.target.value)})} className={inputCls} /></div>
                </div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t("Price (VND)")}</label><input type="number" value={matForm.unitPrice ?? ""} onChange={e => setMatForm({...matForm, unitPrice: Number(e.target.value)})} className={inputCls} /></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t("Technical Standard")}</label><input value={matForm.technicalStandard} onChange={e => setMatForm({...matForm, technicalStandard: e.target.value})} className={inputCls} /></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t("Specification")}</label><textarea value={matForm.specification} onChange={e => setMatForm({...matForm, specification: e.target.value})} className={inputCls} rows={2} /></div>
             </div>
             <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100"><button onClick={() => setMatModal(false)} className="px-4 py-2 text-sm text-gray-600 font-medium">{t("Cancel")}</button><button onClick={saveMat} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">{t("Save Material")}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
