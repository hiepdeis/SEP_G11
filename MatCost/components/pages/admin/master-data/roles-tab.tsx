import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

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
  getRoles,
  updateRole,
  deleteRole,
  createRole,
} from "@/services/admin-users";
import { Role } from "@/lib/master-data-types";

export function RolesTab() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Role> | null>(null);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const perPage = 10;

  useEffect(() => {
    let mounted = true;
    getRoles()
      .then((data) => {
        if (mounted) {
          setItems(
            (data ?? []).map((r) => ({ _id: r.roleId, roleName: r.roleName })),
          );
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error(t("Failed to load roles list"));
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [t]);

  const filtered = useMemo(
    () => items.filter((i) => i.roleName.toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const openAdd = () => {
    setEditing({});
    setModalOpen(true);
  };

  const openEdit = (item: Role) => {
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
    const roleName = editing.roleName?.trim();
    if (!roleName) {
      toast.error(t("Role name cannot be empty"));
      return;
    }

    try {
      setSaving(true);
      if (editing._id) {
        await updateRole(editing._id, { roleName });
        setItems((prev) =>
          prev.map((i) => (i._id === editing._id ? { ...i, roleName } : i)),
        );
        toast.success(t("Update Successful"));
      } else {
        const created = await createRole({ roleName });
        setItems((prev) => [
          ...prev,
          { _id: created.roleId, roleName: created.roleName },
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
          await deleteRole(id);
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
    return <div className="text-sm text-gray-500">{t("Loading roles...")}</div>;

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
                <TableHead className="sticky top-0 z-20 bg-gray-50 px-5 text-[10px] text-gray-500 uppercase tracking-wider">
                  {t("Role ID")}
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-gray-50 px-5 text-[10px] text-gray-500 uppercase tracking-wider">
                  {t("Role Name")}
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
                    colSpan={3}
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
                        className="text-gray-500 bg-gray-50 font-mono"
                      >
                        #{item._id}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-sm">
                      <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 transition-colors">
                        {item.roleName}
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
                {editing._id ? t("Edit") : t("Add New")}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-grow overflow-y-auto px-1 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("Role Name")} *</Label>
                  <Input
                    value={editing.roleName || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        roleName: e.target.value,
                      }))
                    }
                    placeholder={t("e.g., Admin")}
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
