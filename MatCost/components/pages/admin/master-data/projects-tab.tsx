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

export function ProjectsTab() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
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
            startDate: p.startDate ? String(p.startDate).slice(0, 10) : "",
            endDate: p.endDate ? String(p.endDate).slice(0, 10) : "",
            budget: p.budget ?? null,
            status: p.status ?? "Planned",
            contracts: p.contracts ?? [],
          })),
        );
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast.error(t("Failed to load projects"));
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
    setEditing({
      status: "Planned",
      startDate: "",
      endDate: "",
      contracts: [],
    });
    setModalOpen(true);
  };

  const openEdit = (item: ProjectItem) => {
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
    const { code, name, startDate, endDate, budget, status } =
      editing as ProjectItem;
    if (!code || !name) {
      toast.error(t("Code and name cannot be empty"));
      return;
    }

    const payload = {
      code,
      name,
      startDate: startDate || null,
      endDate: endDate || null,
      budget,
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
          await deleteProject(id);
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
      <div className="text-sm text-gray-500">{t("Loading projects...")}</div>
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
        <Button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> {t("Add New")}
        </Button>
      </div>

      <div className="flex-grow flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden min-h-0">
        <div className="flex-grow min-h-0 [&>div]:h-full [&>div]:overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-20 bg-gray-50 shadow-sm outline outline-1 outline-gray-200">
              <TableRow className="bg-gray-50 border-none">
                <TableHead className="sticky top-0 z-20 bg-gray-50 w-14 px-5 text-[10px] text-gray-500 uppercase tracking-wider">
                  {t("Details")}
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-gray-50 px-5 text-[10px] text-gray-500 uppercase tracking-wider">
                  {t("Project Code")}
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-gray-50 px-5 text-[10px] text-gray-500 uppercase tracking-wider">
                  {t("Project Name")}
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-gray-50 px-5 text-[10px] text-gray-500 uppercase tracking-wider">
                  {t("Status")}
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
                    colSpan={6}
                    className="px-5 py-8 text-center text-gray-400 text-sm"
                  >
                    {t("No Data")}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((item) => {
                  const expanded = expandedIds.has(item._id);
                  const canExpand = item.contracts.length > 0;
                  return (
                    <Fragment key={item._id}>
                      <TableRow
                        className={
                          expanded ? "bg-indigo-50/30" : "hover:bg-gray-50/50"
                        }
                      >
                        <TableCell className="px-5 py-3 text-sm">
                          {canExpand && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleExpand(item._id)}
                              className="h-8 w-8 text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${expanded ? "" : "-rotate-90"}`}
                              />
                            </Button>
                          )}
                        </TableCell>
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
                        <TableCell className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-1">
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
          <DialogContent className="sm:max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900">
                {editing._id ? t("Edit Project") : t("Add New Project")}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-grow overflow-y-auto px-1 py-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("Project Code")} *</Label>
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
                    <Label>{t("Status")}</Label>
                    <Select
                      value={editing.status || "Active"}
                      onValueChange={(val) =>
                        setEditing((prev) => ({
                          ...prev,
                          status: val,
                        }))
                      }
                    >
                      <SelectTrigger>
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
                    <Input
                      type="date"
                      value={editing.startDate || ""}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          startDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("End Date")}</Label>
                    <Input
                      type="date"
                      value={editing.endDate || ""}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          endDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("Budget")}</Label>
                  <Input
                    type="number"
                    value={editing.budget ?? ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        budget: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
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
