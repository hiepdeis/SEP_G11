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
  FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

import {
  createSupplier,
  deleteSupplier,
  getSuppliers,
  updateSupplier,
  ContractDto,
} from "@/services/admin-suppliers";
import { SupplierItem } from "@/lib/master-data-types";
import {
  normalizeSearchValue,
  matchesContracts,
} from "@/lib/master-data-utils";

export function SuppliersTab({
  viewOnly = false,
  role = "admin",
}: {
  viewOnly?: boolean;
  role?: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<SupplierItem> | null>(null);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const perPage = 10;

  useEffect(() => {
    let mounted = true;
    getSuppliers()
      .then((data) => {
        if (mounted) {
          setItems(
            (data.items ?? []).map((s) => ({
              _id: s.supplierId,
              code: s.code ?? "",
              name: s.name ?? "",
              taxCode: s.taxCode ?? "",
              address: s.address ?? "",
              contracts: s.contracts ?? [],
            })),
          );
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error(t("Failed to load suppliers"));
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [t]);

  const filtered = useMemo(
    () =>
      items.filter((i) => {
        const q = search.toLowerCase();
        return (
          normalizeSearchValue(i.code).includes(q) ||
          normalizeSearchValue(i.name).includes(q) ||
          normalizeSearchValue(i.taxCode).includes(q) ||
          matchesContracts(i.contracts, q)
        );
      }),
    [items, search],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const openAdd = () => {
    setEditing({});
    setModalOpen(true);
  };

  const openEdit = (item: SupplierItem) => {
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
    const code = editing.code?.trim().toUpperCase(),
      name = editing.name?.trim(),
      taxCode = editing.taxCode?.trim() ?? "",
      address = editing.address?.trim() ?? "";

    if (!code || !name) {
      toast.error(t("Code and name cannot be empty"));
      return;
    }

    if (!taxCode) {
      toast.error(t("Tax code cannot be empty"));
      return;
    }

    if (!address) {
      toast.error(t("Address cannot be empty"));
      return;
    }

    try {
      setSaving(true);
      if (editing._id) {
        await updateSupplier(editing._id, { code, name, taxCode, address });
        setItems((prev) =>
          prev.map((i) =>
            i._id === editing._id ? { ...i, code, name, taxCode, address } : i,
          ),
        );
        toast.success(t("Update Successful"));
      } else {
        const created = await createSupplier({ code, name, taxCode, address });
        setItems((prev) => [
          ...prev,
          { _id: created.id, code, name, taxCode, address, contracts: [] },
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
          await deleteSupplier(id);
          setItems((prev) => prev.filter((i) => i._id !== id));
          toast.success(t("Delete Successful"));
        } catch (error) {
          toast.error(t("Delete Failed"));
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  if (loading)
    return (
      <div className="text-sm text-gray-500">{t("Loading suppliers...")}</div>
    );

  const renderContractCountBadge = (
    contracts: ContractDto[],
    t: (s: string) => string,
  ) => {
    const count = contracts.length;
    if (count === 0)
      return (
        <Badge
          variant="secondary"
          className="bg-slate-100 text-slate-500 font-normal"
        >
          {t("N/A")}
        </Badge>
      );
    return (
      <div className="flex flex-col gap-1">
        <Badge className="w-fit bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 shadow-none">
          {count} {t("contracts")}
        </Badge>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none flex flex-wrap items-center gap-3 sticky top-0 z-10 py-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("Search...")}
            className="pl-10 m-2 bg-white w-[99%]"
          />
        </div>
        {!viewOnly && (
          <Button
            onClick={openAdd}
            className="bg-indigo-600 hover:bg-indigo-700 mr-2"
          >
            <Plus className="w-4 h-4 mr-2" /> {t("Add New")}
          </Button>
        )}
      </div>

      <div className="flex-grow flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden min-h-0">
        <div className="flex-grow min-h-0 [&>div]:h-full [&>div]:overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-20 bg-gray-50 shadow-sm outline outline-1 outline-gray-200">
              <TableRow className="bg-gray-50 border-none">
                <TableHead className="sticky top-0 z-20 bg-gray-50 px-5 text-[10px] text-gray-500 uppercase tracking-wider">
                  {t("Code")}
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-gray-50 px-5 text-[10px] text-gray-500 uppercase tracking-wider">
                  {t("Supplier Name")}
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-gray-50 px-5 text-[10px] text-gray-500 uppercase tracking-wider">
                  {t("Tax Code")}
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-gray-50 px-5 text-[10px] text-gray-500 uppercase tracking-wider">
                  {t("Contracts")}
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
                    colSpan={5}
                    className="px-5 py-8 text-center text-gray-400 text-sm"
                  >
                    {t("No Data")}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((item) => (
                  <TableRow key={item._id} className="hover:bg-gray-50/50">
                    <TableCell className="px-5 py-3 text-sm">
                      <Badge
                        variant="outline"
                        className="font-mono bg-indigo-50/50 text-indigo-700 border-indigo-100"
                      >
                        {item.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-sm">
                      {item.name}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-sm">
                      {item.taxCode || "—"}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-sm">
                      {renderContractCountBadge(item.contracts, t)}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            role === "admin"
                              ? router.push(
                                  `/admin/master-data/suppliers/${item._id}`,
                                )
                              : router.push(`/${role}/suppliers/${item._id}`)
                          }
                          className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {!viewOnly && (
                          <>
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
                          </>
                        )}
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
          <DialogContent className="sm:max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900">
                {editing._id ? t("Edit Supplier") : t("Add New Supplier")}
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
                    <Label>{t("Tax Code")} *</Label>
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
                    <Label>{t("Address")} *</Label>
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
