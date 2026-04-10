import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Package,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
import { showConfirmToast } from "@/hooks/confirm-toast";
import { CurrencyInput } from "@/components/ui/custom/currency-input";
import { QuantityInput } from "@/components/ui/custom/quantity-input";

import {
  getMaterials,
  createMaterial,
  updateMaterial,
  removeMaterial,
  type MaterialItem,
} from "@/services/admin-materials";
import {
  getCategories,
  type CategoryItem,
} from "@/services/material-categories";
import {
  MATERIAL_UNIT_OPTIONS,
  canonicalizeMaterialUnit,
  getMaterialUnitLabel,
} from "@/lib/material-units";
import { formatCurrency } from "@/lib/format-currency";
import { Material } from "@/lib/master-data-types";

export function MaterialsTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<Material[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Material> | null>(null);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const perPage = 10;

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const [catData, matData] = await Promise.all([
          getCategories(),
          getMaterials({ page: 1, pageSize: 100 }),
        ]);
        if (mounted) {
          setCategories(catData.items ?? []);
          setItems(
            (matData.items ?? []).map((item: MaterialItem) => ({
              _id: item.materialId,
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
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        toast.error(t("Failed to load materials data"));
        if (mounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, [t]);

  const getCategoryName = (id: number | null) =>
    categories.find((c) => c.categoryId === id)?.name || "—";

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (i.name.toLowerCase().includes(search.toLowerCase()) ||
            i.code.toLowerCase().includes(search.toLowerCase())) &&
          (catFilter === "all" || i.categoryId === Number(catFilter)),
      ),
    [items, search, catFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const openAdd = () => {
    setEditing({
      categoryId: categories[0]?.categoryId || null,
      unit: MATERIAL_UNIT_OPTIONS[0].value,
    });
    setModalOpen(true);
  };

  const openEdit = (item: Material) => {
    setEditing({ ...item });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
  };

  const save = async () => {
    if (!editing) return;
    const normalized = canonicalizeMaterialUnit(editing.unit ?? "");
    if (!editing.code || !editing.name || !normalized) {
      toast.error(t("Please enter code, name and a valid unit"));
      return;
    }

    const payload = {
      code: editing.code.toUpperCase(),
      name: editing.name,
      unit: normalized,
      massPerUnit: editing.massPerUnit ?? null,
      minStockLevel: editing.minStockLevel ?? null,
      categoryId: editing.categoryId ?? null,
      unitPrice: editing.unitPrice ?? null,
      technicalStandard: editing.technicalStandard ?? "",
      specification: editing.specification ?? "",
    };

    try {
      setSaving(true);
      if (editing._id) {
        await updateMaterial(editing._id, payload);
        setItems((prev) =>
          prev.map((i) => (i._id === editing._id ? { ...i, ...payload } : i)),
        );
        toast.success(t("Update Successful"));
      } else {
        const created = await createMaterial(payload);
        setItems((prev) => [
          ...prev,
          {
            _id: created.materialId,
            materialId: created.materialId,
            ...payload,
          },
        ]);
        toast.success(t("Add New Successful"));
      }
      closeModal();
    } catch (error) {
      toast.error(t("Save Failed"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    showConfirmToast({
      title: t("Are you sure?"),
      description: t("Are you sure you want to delete this record?"),
      onConfirm: async () => {
        try {
          setDeletingId(id);
          await removeMaterial(id);
          setItems((prev) => prev.filter((i) => i._id !== id));
          toast.success(t("Delete Successful"));
        } catch (error) {
          toast.error(
            t("Delete Failed, Item is already used in other modules"),
          );
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  if (loading)
    return (
      <div className="text-sm text-gray-500">{t("Loading materials...")}</div>
    );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none flex flex-wrap items-center gap-3 sticky top-0 z-10 bg-slate-50 py-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("Search...")}
            className="pl-10 m-2 bg-white"
          />
        </div>

        <Select value={catFilter} onValueChange={setCatFilter}>
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

        <Button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> {t("Add New")}
        </Button>
      </div>

      <div className="flex-grow flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden min-h-0">
        <div className="flex-grow min-h-0 [&>div]:h-full [&>div]:overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-20 bg-gray-50 shadow-sm outline outline-1 outline-gray-200">
              <TableRow className="bg-gray-50 border-none">
                <TableHead className="sticky top-0 z-20 bg-gray-50 w-10"></TableHead>
                <TableHead className="sticky top-0 z-20 bg-gray-50 px-5 text-[10px] text-gray-500 uppercase tracking-wider">
                  {t("Code")}
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-gray-50 px-5 text-[10px] text-gray-500 uppercase tracking-wider">
                  {t("Material Name")}
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-gray-50 px-5 text-[10px] text-gray-500 uppercase tracking-wider">
                  {t("Category")}
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-gray-50 px-5 text-[10px] text-gray-500 uppercase tracking-wider">
                  {t("Unit")}
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-gray-50 px-5 text-[10px] text-gray-500 uppercase tracking-wider">
                  {t("Unit Price")}
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-gray-50 px-5 text-[10px] text-gray-500 uppercase tracking-wider text-right">
                  {t("Actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="px-5 py-8 text-center text-gray-400 text-sm"
                  >
                    {t("No Data")}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((item) => (
                  <TableRow key={item._id} className="hover:bg-gray-50/50">
                    <TableCell className="px-5 py-3">
                      <Package className="w-4 h-4 text-gray-400" />
                    </TableCell>
                    <TableCell className="px-5 py-3 text-sm">
                      <Badge
                        variant="outline"
                        className="font-mono bg-indigo-50/50 text-indigo-700 border-indigo-100 shadow-none"
                      >
                        {item.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-sm">
                      <span
                        className="font-medium hover:text-indigo-600 cursor-pointer"
                        onClick={() =>
                          router.push(
                            `/admin/master-data/materials/${item.materialId}`,
                          )
                        }
                      >
                        {item.name}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-sm">
                      <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 shadow-none font-bold">
                        {getCategoryName(item.categoryId)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-sm">
                      <Badge
                        variant="secondary"
                        className="font-medium bg-slate-100 text-slate-600 border-none uppercase"
                      >
                        {getMaterialUnitLabel(item.unit)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-sm font-bold text-slate-800">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            router.push(
                              `/admin/master-data/materials/${item.materialId}`,
                            )
                          }
                          className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(item)}
                          disabled={deletingId === item._id}
                          className="h-8 w-8 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(item._id)}
                          disabled={deletingId === item._id}
                          className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex-none flex items-center justify-between px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
          <span>
            {filtered.length} {t("records")}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="h-8 w-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="h-8 w-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={(val) => !val && closeModal()}>
        {editing && (
          <DialogContent className="sm:max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900">
                {editing._id ? t("Edit Material") : t("Add New Material")}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-grow overflow-y-auto px-1 py-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-500 uppercase">
                      {t("Material Code")} *
                    </Label>
                    <Input
                      value={editing.code || ""}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          code: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="EX: MAT001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-500 uppercase">
                      {t("Category")} *
                    </Label>
                    <Select
                      value={
                        editing.categoryId ? String(editing.categoryId) : ""
                      }
                      onValueChange={(val) =>
                        setEditing((prev) => ({
                          ...prev,
                          categoryId: Number(val),
                        }))
                      }
                    >
                      <SelectTrigger className="w-full border border-slate-300">
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
                    value={editing.name || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
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
                      value={editing.unit || ""}
                      onValueChange={(val) =>
                        setEditing((prev) => ({
                          ...prev,
                          unit: val,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full border border-slate-300">
                        <SelectValue placeholder={t("Select...")} />
                      </SelectTrigger>
                      <SelectContent showSearch>
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
                      {t("Mass/Unit")} *
                    </Label>
                    <QuantityInput
                      value={editing.massPerUnit}
                      onValueChange={(val) =>
                        setEditing((prev) => ({ ...prev!, massPerUnit: val }))
                      }
                      placeholder={t("Enter mass...")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-500 uppercase">
                      {t("Min Stock")} *
                    </Label>
                    <QuantityInput
                      value={editing.minStockLevel}
                      onValueChange={(val) =>
                        setEditing((prev) => ({ ...prev!, minStockLevel: val }))
                      }
                      maxLength={12}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 uppercase">
                    {t("Price (VND)")} *
                  </Label>
                  <CurrencyInput
                    value={editing.unitPrice}
                    onValueChange={(val) =>
                      setEditing((prev) => ({ ...prev!, unitPrice: val }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 uppercase">
                    {t("Technical Standard")}
                  </Label>
                  <Input
                    value={editing.technicalStandard || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        technicalStandard: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-500 uppercase">
                    {t("Specification")}
                  </Label>
                  <Textarea
                    value={editing.specification || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        specification: e.target.value,
                      }))
                    }
                    rows={3}
                    className="resize-none border border-slate-300"
                  />
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
