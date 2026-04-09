"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { showConfirmToast } from "@/hooks/confirm-toast";
import { formatCurrency } from "@/lib/format-currency";

import {
  MATERIAL_UNIT_OPTIONS,
  canonicalizeMaterialUnit,
  getMaterialUnitLabel,
} from "@/lib/material-units";
import {
  getCategories,
  type CategoryItem,
} from "@/services/material-categories";
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
  specification: "",
};


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
      setMaterials(
        res.items.map((item: MaterialItem) => ({
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
        })),
      );
    } catch (err) {
      toast.error(t("Failed to load materials"));
    } finally {
      setLoading(false);
    }
  }

  // --- ACTIONS ---
  const openAddMat = () => {
    setMatForm({
      ...emptyMatForm,
      categoryId: categories[0]?.categoryId ?? null,
    });
    setEditMatId(null);
    setMatModal(true);
  };
  const openEditMat = (m: Material) => {
    const normalized = canonicalizeMaterialUnit(m.unit);
    setMatForm({
      code: m.code,
      name: m.name,
      unit: normalized ?? "",
      massPerUnit: m.massPerUnit,
      minStockLevel: m.minStockLevel,
      categoryId: m.categoryId,
      unitPrice: m.unitPrice,
      technicalStandard: m.technicalStandard,
      specification: m.specification,
    });
    setEditMatId(m.materialId);
    setMatModal(true);
  };

  const saveMat = async () => {
    const normalized = canonicalizeMaterialUnit(matForm.unit);
    if (!matForm.code || !matForm.name || !normalized) {
      toast.error(t("Please enter code, name and a valid unit"));
      return;
    }
    try {
      const payload = {
        ...matForm,
        code: matForm.code.toUpperCase(),
        unit: normalized,
      };
      if (editMatId !== null) await updateMaterial(editMatId, payload);
      else await createMaterial(payload);
      toast.success(t("Successfully saved"));
      setMatModal(false);
      loadMaterials();
    } catch (e) {
      toast.error(t("Failed to save material"));
    }
  };

  const deleteMat = async (id: number) => {
    showConfirmToast({
      title: t("Are you sure?"),
      description: t("Delete this material?"),
      onConfirm: async () => {
        try {
          await removeMaterial(id);
          toast.success(t("Delete Successful"));
          loadMaterials();
        } catch (e) {
          toast.error(t("Delete Failed"));
        }
      },
    });
  };

  const getCategoryName = (id: number | null) =>
    categories.find((c) => c.categoryId === id)?.name || "—";

  const filtered = useMemo(
    () =>
      materials.filter(
        (m) =>
          (m.name.toLowerCase().includes(search.toLowerCase()) ||
            m.code.toLowerCase().includes(search.toLowerCase())) &&
          (catFilter === "all" || m.categoryId === Number(catFilter)),
      ),
    [materials, search, catFilter],
  );
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
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t("Materials")}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {t("Manage materials & view stock levels")}
                </p>
              </div>
              <Button
                onClick={openAddMat}
                className="bg-indigo-600 hover:bg-indigo-700 font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" /> {t("Add Material")}
              </Button>
            </div>

            <div className="flex gap-3 mt-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder={t("Search by code or name...")}
                  className="pl-10 bg-white"
                />
              </div>
              <Select
                value={catFilter}
                onValueChange={(val) => {
                  setCatFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder={t("All categories")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All categories")}</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.categoryId} value={String(c.categoryId)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mt-6">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow className="text-[10px] text-gray-500 uppercase tracking-wider hover:bg-transparent">
                    <TableHead className="w-10 px-3 py-3"></TableHead>
                    <TableHead className="px-4 py-3">{t("Code")}</TableHead>
                    <TableHead className="px-4 py-3">
                      {t("Material Name")}
                    </TableHead>
                    <TableHead className="px-4 py-3">{t("Category")}</TableHead>
                    <TableHead className="px-4 py-3 text-center">
                      {t("Unit")}
                    </TableHead>
                    <TableHead className="px-4 py-3 text-right">
                      {t("Unit Price")}
                    </TableHead>
                    <TableHead className="px-4 py-3 text-right">
                      {t("Standard")}
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center">
                      {t("Actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="px-4 py-10 text-center text-gray-500"
                      >
                        {t("Loading data...")}
                      </TableCell>
                    </TableRow>
                  ) : paginated.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="px-4 py-10 text-center text-gray-500"
                      >
                        {t("No materials found")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((m) => (
                      <TableRow
                        key={m.materialId}
                        className="hover:bg-indigo-50/30 cursor-pointer group transition-colors"
                        onClick={() =>
                          router.push(`/admin/materials/${m.materialId}`)
                        }
                      >
                        <TableCell className="px-3 text-center text-gray-400 group-hover:text-indigo-600 transition-colors">
                          <Package className="w-4 h-4 mx-auto" />
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <Badge
                            variant="outline"
                            className="font-mono bg-indigo-50/50 text-indigo-700 border-indigo-100 shadow-none"
                          >
                            {m.code}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-4 font-medium text-gray-900">
                          {m.name}
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 shadow-none font-bold">
                            {getCategoryName(m.categoryId)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-center">
                          <Badge variant="secondary" className="font-medium bg-slate-100 text-slate-600 border-none uppercase">
                            {getMaterialUnitLabel(m.unit)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-right font-bold text-slate-800">
                          {formatCurrency(m.unitPrice)}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-right text-gray-500 text-xs truncate max-w-[150px] italic">
                          {m.technicalStandard || "—"}
                        </TableCell>
                        <TableCell
                          className="px-4 py-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditMat(m)}
                              className="h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMat(m.materialId)}
                              className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-500">
                <span>
                  {filtered.length} {t("records")}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="h-8 w-8 bg-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 px-3 bg-white font-medium"
                    disabled
                  >
                    {page} / {totalPages}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="h-8 w-8 bg-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={matModal} onOpenChange={setMatModal}>
        <DialogContent className="sm:max-w-lg overflow-hidden flex flex-col max-h-[90vh] p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-xl font-bold text-gray-900">
              {editMatId ? t("Edit Material") : t("Add Material")}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-grow overflow-y-auto px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase">
                  {t("Material Code")} *
                </Label>
                <Input
                  value={matForm.code}
                  onChange={(e) =>
                    setMatForm({
                      ...matForm,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="EX: MAT001"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase">
                  {t("Category")}
                </Label>
                <Select
                  value={matForm.categoryId ? String(matForm.categoryId) : ""}
                  onValueChange={(val) =>
                    setMatForm({
                      ...matForm,
                      categoryId: Number(val),
                    })
                  }
                >
                  <SelectTrigger>
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
              <Label className="text-xs font-bold text-gray-500 uppercase">
                {t("Material Name")} *
              </Label>
              <Input
                value={matForm.name}
                onChange={(e) =>
                  setMatForm({ ...matForm, name: e.target.value })
                }
                placeholder={t("Enter material name")}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase">
                  {t("Unit")} *
                </Label>
                <Select
                  value={matForm.unit}
                  onValueChange={(val) =>
                    setMatForm({ ...matForm, unit: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("Select...")} />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_UNIT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase">
                  {t("Mass/Unit")}
                </Label>
                <Input
                  type="number"
                  value={matForm.massPerUnit ?? ""}
                  onChange={(e) =>
                    setMatForm({
                      ...matForm,
                      massPerUnit: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase">
                  {t("Min Stock")}
                </Label>
                <Input
                  type="number"
                  value={matForm.minStockLevel ?? ""}
                  onChange={(e) =>
                    setMatForm({
                      ...matForm,
                      minStockLevel: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">
                {t("Price (VND)")}
              </Label>
              <Input
                type="number"
                value={matForm.unitPrice ?? ""}
                onChange={(e) =>
                  setMatForm({
                    ...matForm,
                    unitPrice: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">
                {t("Technical Standard")}
              </Label>
              <Input
                value={matForm.technicalStandard}
                onChange={(e) =>
                  setMatForm({
                    ...matForm,
                    technicalStandard: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">
                {t("Specification")}
              </Label>
              <Textarea
                value={matForm.specification}
                onChange={(e) =>
                  setMatForm({ ...matForm, specification: e.target.value })
                }
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setMatModal(false)}
              className="px-4 py-2 text-sm font-medium"
            >
              {t("Cancel")}
            </Button>
            <Button
              onClick={saveMat}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-indigo-100"
            >
              {t("Save Material")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
