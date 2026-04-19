import React, { useEffect, useState, useMemo, Fragment } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { DateTimePicker } from "@/components/ui/custom/date-time-picker";
import { CurrencyInput } from "@/components/ui/custom/currency-input";

import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from "@/services/admin-projects";
import { ProjectItem } from "@/lib/master-data-types";
import {
  normalizeSearchValue,
  matchesContracts,
} from "@/lib/master-data-utils";
import { formatMoney } from "@/lib/master-data-utils";
import { formatCurrency } from "@/lib/format-currency";
import { QuantityInput } from "@/components/ui/custom/quantity-input";

export function ProjectsTab({
  viewOnly = false,
  role = "admin",
}: {
  viewOnly?: boolean;
  role?: string;
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");
  const [editing, setEditing] = useState<Partial<ProjectItem> | null>(null);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const perPage = 10;

  useEffect(() => {
    getProjects()
      .then((data) => {
        const rows = Array.isArray(data) ? data : (data.items ?? []);
        setItems(
          rows.map((p) => ({
            _id: Number(p.projectId ?? 0),
            code: p.code ?? "",
            name: p.name ?? "",
            startDate: p.startDate ?? "",
            endDate: p.endDate ?? "",
            budget: p.budget ?? null,
            budgetUsed: p.budgetUsed ?? null,
            overBudgetAllowance: p.overBudgetAllowance ?? null,
            status: p.status ?? "Planned",
            contracts: p.contracts ?? [],
          })),
        );
        setLoading(false);
      })
      .catch((err: any) => {
        toast.error(
          err.response?.data?.message || t("Failed to load projects"),
        );
        setLoading(false);
      });
  }, [t]);

  const statusProjCls: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700",
    Completed: "bg-blue-50 text-blue-700",
    Planned: "bg-amber-50 text-amber-700",
    Cancelled: "bg-red-50 text-red-700",
  };

  const statusProjLabel: Record<string, string> = {
    Active: t("Active"),
    Completed: t("Completed"),
    Planned: t("Planned"),
    Cancelled: t("Cancelled"),
  };

  const filtered = useMemo(
    () =>
      items.filter((i) => {
        const q = search.toLowerCase();
        return (
          normalizeSearchValue(i.name).includes(q) ||
          normalizeSearchValue(i.code).includes(q) ||
          matchesContracts(i.contracts, q)
        );
      }),
    [items, search],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const openAdd = () => {
    setModalMode("add");
    setEditing({
      status: "Planned",
      startDate: "",
      endDate: "",
      contracts: [],
    });
    setModalOpen(true);
  };

  const openEdit = (item: ProjectItem) => {
    setModalMode("edit");
    setEditing({ ...item });
    setModalOpen(true);
  };

  const openView = (item: ProjectItem) => {
    setModalMode("view");
    setEditing({ ...item });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    if (!editing) return;
    const { code, name, startDate, endDate, budget, budgetUsed, status } =
      editing as ProjectItem;
    if (!code || !name) {
      toast.error(t("Code and name cannot be empty"));
      return;
    }

    if (!budget || budgetUsed === null) {
      console.log(budgetUsed, budget);
      toast.error(t("Budget used and budget cannot be empty"));
      return;
    }

    if (budgetUsed && budget && budgetUsed > budget) {
      toast.error(t("Budget used cannot be greater than budget"));
      return;
    }

    const payload = {
      code,
      name,
      startDate: startDate || null,
      endDate: endDate || null,
      budget,
      budgetUsed: editing.budgetUsed ?? null,
      overBudgetAllowance: editing.overBudgetAllowance ?? null,
      status: status || "Planned",
    };

    try {
      setSaving(true);
      if (editing._id) {
        await updateProject(editing._id, payload);
        setItems((prev) =>
          prev.map((i) => (i._id === editing._id ? { ...i, ...payload } : i)),
        );
        toast.success(t("Update Successful"));
      } else {
        const created = await createProject(payload);
        setItems((prev) => [
          ...prev,
          { _id: created.id, ...payload, contracts: [] },
        ]);
        toast.success(t("Add New Successful"));
      }
      closeModal();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("Save Failed"));
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
          await deleteProject(id);
          setItems((prev) => prev.filter((i) => i._id !== id));
          toast.success(t("Delete Successful"));
        } catch (error: any) {
          toast.error(error.response?.data?.message || t("Delete Failed"));
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  if (loading)
    return (
      <div className="text-sm text-gray-500">{t("Loading projects...")}</div>
    );

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
                  {t("Project Code")}
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-gray-50 px-5 text-[10px] text-gray-500 uppercase tracking-wider">
                  {t("Project Name")}
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-gray-50 px-5 text-[10px] text-gray-500 uppercase tracking-wider">
                  {t("Status")}
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-gray-50 px-5 text-[10px] text-gray-500 uppercase tracking-wider text-right">
                  {t("Budget")}
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-gray-50 px-5 text-[10px] text-gray-500 uppercase tracking-wider text-right">
                  {t("Budget Used")}
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
                    colSpan={6}
                    className="px-5 py-8 text-center text-gray-400 text-sm"
                  >
                    {t("No Data")}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((item) => {
                  const expanded = expandedIds.has(item._id);
                  return (
                    <Fragment key={item._id}>
                      <TableRow
                        className={
                          expanded ? "bg-indigo-50/30" : "hover:bg-gray-50/50"
                        }
                      >
                        <TableCell className="px-5 py-3 text-sm">
                          <Badge
                            variant="outline"
                            className="font-mono bg-indigo-50/50 text-indigo-700 border-indigo-100"
                          >
                            {item.code}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-5 py-3 text-sm font-medium">
                          {item.name}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-sm">
                          <Badge
                            variant="outline"
                            className={`border-none shadow-none ${statusProjCls[item.status || "Planned"] || "bg-gray-100 text-gray-600"}`}
                          >
                            {statusProjLabel[item.status || "Planned"] ||
                              item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-5 py-3 text-sm font-semibold text-slate-700 text-right">
                          {formatCurrency(item.budget)}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-sm font-semibold text-indigo-600 text-right">
                          {formatCurrency(item.budgetUsed)}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openView(item)}
                              className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                              title={t("View")}
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
                    </Fragment>
                  );
                })
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
          <DialogContent className="sm:max-w-lg overflow-hidden flex flex-col max-h-[90vh] bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900">
                {modalMode === "view"
                  ? t("Project Details")
                  : editing._id
                    ? t("Edit Project")
                    : t("Add New Project")}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-grow overflow-y-auto px-1 py-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("Project Code")} *</Label>
                    <Input
                      disabled={modalMode === "view"}
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
                    <Label>{t("Status")}</Label>
                    <Select
                      disabled={modalMode === "view"}
                      value={editing.status || "Active"}
                      onValueChange={(val) =>
                        setEditing((prev) => ({
                          ...prev,
                          status: val,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full border border-slate-300">
                        <SelectValue placeholder={t("Status")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">{t("Active")}</SelectItem>
                        <SelectItem value="Planned">{t("Planned")}</SelectItem>
                        <SelectItem value="Completed">
                          {t("Completed")}
                        </SelectItem>
                        <SelectItem value="Cancelled">
                          {t("Cancelled")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("Project Name")} *</Label>
                  <Input
                    disabled={modalMode === "view"}
                    value={editing.name || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("Start Date")}</Label>
                    <DateTimePicker
                      disabled={modalMode === "view"}
                      value={
                        editing.startDate
                          ? new Date(editing.startDate)
                          : undefined
                      }
                      onChange={(date) =>
                        setEditing((prev) => ({
                          ...prev,
                          startDate: date ? date.toISOString() : "",
                        }))
                      }
                      placeholder={
                        modalMode === "view" ? "" : t("Pick start date")
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("End Date")}</Label>
                    <DateTimePicker
                      disabled={modalMode === "view"}
                      value={
                        editing.endDate ? new Date(editing.endDate) : undefined
                      }
                      onChange={(date) =>
                        setEditing((prev) => ({
                          ...prev,
                          endDate: date ? date.toISOString() : "",
                        }))
                      }
                      minDate={
                        editing.startDate
                          ? new Date(editing.startDate)
                          : undefined
                      }
                      placeholder={
                        modalMode === "view" ? "" : t("Pick end date")
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("Limit Budget")}</Label>
                    <CurrencyInput
                      disabled={modalMode === "view"}
                      value={editing.budget}
                      onValueChange={(val) =>
                        setEditing((prev) => ({ ...prev!, budget: val }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("Budget Used")}</Label>
                    <Input
                      type="number"
                      disabled={modalMode === "view"}
                      value={editing?.budgetUsed ?? ""}
                      onChange={(e) => {
                        let val = e.target.value;
                        val = val.replace(/^0+(?=\d)/, "");
                        val = val.replace(/[^\d]/g, "");
                        val = val.slice(0, 12);
                        e.target.value = val;
                        setEditing((prev) => ({
                          ...prev!,
                          budgetUsed: val === "" ? null : Number(val),
                        }));
                      }}
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("Over Budget Allowance")}</Label>
                  <Input
                    type="number"
                    disabled={modalMode === "view"}
                    value={editing?.overBudgetAllowance ?? ""}
                    onChange={(e) => {
                      let val = e.target.value;
                      val = val.replace(/^0+(?=\d)/, "");
                      val = val.replace(/[^\d]/g, "");
                      val = val.slice(0, 12);
                      e.target.value = val;
                      setEditing((prev) => ({
                        ...prev!,
                        overBudgetAllowance: val === "" ? null : Number(val),
                      }));
                    }}
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 border-t pt-4">
              <Button variant="outline" onClick={closeModal} disabled={saving}>
                {modalMode === "view" ? t("Close") : t("Cancel")}
              </Button>
              {modalMode !== "view" && (
                <Button
                  onClick={save}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {saving ? t("Saving...") : t("Save")}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
