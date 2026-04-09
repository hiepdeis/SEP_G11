"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Layers,
  ClipboardList,
  Truck,
  Warehouse,
  MapPin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Shield,
  FolderKanban,
  FileText,
  Package,
  Bell,
  AlertCircle,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { showConfirmToast } from "@/hooks/confirm-toast";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { useTranslation } from "react-i18next";
import {
  getRoles,
  updateRole,
  deleteRole,
  createRole,
} from "@/services/admin-users";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "@/services/material-categories";
import {
  getAdjustmentReasons,
  createAdjustmentReason,
  updateAdjustmentReason,
  deleteAdjustmentReason,
} from "@/services/adjustment-reasons";
import {
  createSupplier,
  deleteSupplier,
  getSuppliers,
  updateSupplier,
  type ContractDto,
} from "@/services/admin-suppliers";
import {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from "@/services/admin-warehouses";
import {
  createBin,
  deleteBin,
  getBins,
  updateBin,
} from "@/services/admin-bins";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from "@/services/admin-projects";
import { formatDateTime } from "@/lib/format-date-time";

// --- TYPES & INTERFACES ---
interface BaseItem {
  _id: number;
}

interface Role extends BaseItem {
  roleName: string;
}

interface Category extends BaseItem {
  code: string;
  name: string;
  description: string;
}

interface AdjReason extends BaseItem {
  code: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface SupplierItem extends BaseItem {
  code: string;
  name: string;
  taxCode: string;
  address: string;
  contracts: ContractDto[];
}

interface WarehouseRow extends BaseItem {
  name: string;
  address: string;
}

interface BinRow extends BaseItem {
  warehouseId: number;
  code: string;
  type: string;
}

interface ProjectItem extends BaseItem {
  code: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  status: string | null;
  contracts: ContractDto[];
}

// --- TABS DEFINITION ---
const tabs = [
  { key: "roles", label: "Roles", icon: Shield },
  { key: "categories", label: "Material Categories", icon: Layers },
  { key: "reasons", label: "Adjustment Reasons", icon: ClipboardList },
  { key: "suppliers", label: "Suppliers", icon: Truck },
  { key: "warehouses", label: "Warehouses", icon: Warehouse },
  { key: "bins", label: "Bin Locations", icon: MapPin },
  { key: "projects", label: "Projects", icon: FolderKanban },
] as const;
type TabKey = (typeof tabs)[number]["key"];

// --- GENERIC COMPONENTS & UTILS ---

const moneyFormatter = (locale: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });

const quantityFormatter = (locale: string) =>
  new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  });

const normalizeSearchValue = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const formatMoney = (value?: number | null, locale: string = "vi-VN") =>
  value == null ? "—" : moneyFormatter(locale).format(value);

const formatQuantity = (
  value?: number | null,
  unit?: string | null,
  locale: string = "vi-VN",
) => {
  if (value == null) return "—";
  const suffix = unit ? ` ${unit}` : "";
  return `${quantityFormatter(locale).format(value)}${suffix}`;
};

const matchesContracts = (contracts: ContractDto[], keyword: string) =>
  contracts.some(
    (contract) =>
      [
        contract.contractCode,
        contract.contractNumber,
        contract.status,
        contract.supplierName,
      ].some((value) => normalizeSearchValue(value).includes(keyword)) ||
      contract.materials.some((material) =>
        [material.code, material.name, material.unit].some((value) =>
          normalizeSearchValue(value).includes(keyword),
        ),
      ),
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
      <span className="text-[10px] text-slate-400">
        {t("Click arrow to view details")}
      </span>
    </div>
  );
};

function ContractsExpandedContent({
  contracts,
  emptyMessage,
  showSupplierName = false,
}: {
  contracts: ContractDto[];
  emptyMessage: string;
  showSupplierName?: boolean;
}) {
  const { t } = useTranslation();
  if (contracts.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  return (
    <div className="space-y-4">
      {contracts.map((contract) => (
        <div
          key={`${contract.contractId}-${contract.contractCode}`}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 border-indigo-100 shadow-none">
                  <FileText className="h-3.5 w-3.5" />
                  {contract.contractCode}
                </Badge>
                {contract.contractNumber && (
                  <Badge
                    variant="secondary"
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 font-normal"
                  >
                    {t("No.")}: {contract.contractNumber}
                  </Badge>
                )}
                <Badge
                  variant={contract.isActive ? "default" : "secondary"}
                  className={`rounded-full px-3 py-1 text-xs font-medium border-none shadow-none ${contract.isActive ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-600"}`}
                >
                  {t(contract.status)}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                {showSupplierName && contract.supplierName && (
                  <span>
                    {t("Supplier")}: {contract.supplierName}
                  </span>
                )}
                <span>
                  {t("Effective")}: {formatDateTime(contract.effectiveFrom)}
                </span>
                <span>
                  {t("Expiry")}: {formatDateTime(contract.effectiveTo)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  PO
                </div>
                <div className="font-medium text-slate-900">
                  {contract.purchaseOrderCount}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  {t("Materials")}
                </div>
                <div className="font-medium text-slate-900">
                  {contract.materialCount}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  {t("Total Value")}
                </div>
                <div className="font-medium text-slate-900">
                  {formatMoney(contract.totalAmount)}
                </div>
              </div>
            </div>
          </div>
          <div className="px-4 py-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-800">
              <Package className="h-4 w-4 text-slate-500" />
              {t("Materials List")}
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <Table className="text-xs text-left">
                <TableHeader className="bg-slate-50 text-slate-500 font-medium">
                  <TableRow>
                    <TableHead className="px-4 h-10 uppercase tracking-wider">
                      {t("Material Code")}
                    </TableHead>
                    <TableHead className="px-4 h-10 uppercase tracking-wider">
                      {t("Material Name")}
                    </TableHead>
                    <TableHead className="px-4 h-10 uppercase tracking-wider">
                      {t("Unit")}
                    </TableHead>
                    <TableHead className="px-4 h-10 uppercase tracking-wider">
                      {t("Quantity")}
                    </TableHead>
                    <TableHead className="px-4 h-10 uppercase tracking-wider">
                      {t("Total")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white">
                  {contract.materials.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="px-4 py-8 text-center text-slate-400 h-24"
                      >
                        {t("This contract has no materials.")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    contract.materials.map((material) => (
                      <TableRow
                        key={`${contract.contractId}-${material.materialId}`}
                        className="text-slate-700"
                      >
                        <TableCell className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className="font-mono bg-slate-50"
                          >
                            {material.code}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 font-medium">
                          {material.name}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-slate-500">
                          {material.unit || "—"}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {formatQuantity(
                            material.orderedQuantity,
                            material.unit,
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 font-semibold text-indigo-600">
                          {formatMoney(material.totalAmount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function GenericTable<T extends BaseItem>({
  items,
  setItems,
  columns,
  renderForm,
  searchFn,
  onSaveItem,
  onDeleteItem,
  renderExpandedContent,
  isRowExpanded,
  onToggleExpand,
  canExpandRow,
}: {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  columns: {
    key: string;
    label: string;
    render: (item: T) => React.ReactNode;
  }[];
  renderForm: (
    item: Partial<T>,
    onChange: (patch: Partial<T>) => void,
  ) => React.ReactNode;
  idGen: () => number;
  searchFn: (item: T, q: string) => boolean;
  onSaveItem?: (item: Partial<T>) => Promise<Partial<T> | void>;
  onDeleteItem?: (id: number) => Promise<void>;
  renderExpandedContent?: (item: T) => React.ReactNode;
  isRowExpanded?: (item: T) => boolean;
  onToggleExpand?: (item: T) => void;
  canExpandRow?: (item: T) => boolean;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<T> | null>(null);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const perPage = 5;

  const filtered = useMemo(
    () => items.filter((i) => searchFn(i, search.toLowerCase())),
    [items, search, searchFn],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const hasExpandableRows = Boolean(
    renderExpandedContent && isRowExpanded && onToggleExpand,
  );

  const openAdd = () => {
    setEditing({} as Partial<T>);
    setModalOpen(true);
  };
  const openEdit = (item: T) => {
    setEditing({ ...item });
    setModalOpen(true);
  };
  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
  };

  const save = async () => {
    const currentEditing = editing;
    if (!currentEditing) return;
    try {
      setSaving(true);
      const saved =
        (onSaveItem ? await onSaveItem(currentEditing) : currentEditing) ??
        currentEditing;
      const resolved = { ...currentEditing, ...saved } as T;
      if (currentEditing._id) {
        setItems((prev) =>
          prev.map((i) =>
            i._id === currentEditing._id ? ({ ...i, ...resolved } as T) : i,
          ),
        );
        toast.success(t("Update Successful"));
      } else {
        if (typeof resolved._id !== "number" || Number.isNaN(resolved._id))
          throw new Error(t("ID received for new record is invalid"));
        setItems((prev) => [...prev, resolved]);
        toast.success(t("Add New Successful"));
      }
      closeModal();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : t("Save Failed"));
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
          if (onDeleteItem) await onDeleteItem(id);
          setItems((prev) => prev.filter((i) => i._id !== id));
          toast.success(t("Delete Successful"));
        } catch (error) {
          console.error(error);
          toast.error(
            error instanceof Error ? error.message : t("Delete Failed"),
          );
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
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

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              {hasExpandableRows && (
                <TableHead className="w-14 px-5 text-[10px] text-gray-500 uppercase tracking-wider">
                  {t("Details")}
                </TableHead>
              )}
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  className="px-5 text-[10px] text-gray-500 uppercase tracking-wider"
                >
                  {c.label}
                </TableHead>
              ))}
              <TableHead className="px-5 text-[10px] text-gray-500 uppercase tracking-wider text-right">
                {t("Actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1 + (hasExpandableRows ? 1 : 0)}
                  className="px-5 py-8 text-center text-gray-400 text-sm"
                >
                  {t("No Data")}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((item) => {
                const rowCanExpand = canExpandRow ? canExpandRow(item) : true;
                const expanded =
                  rowCanExpand && isRowExpanded ? isRowExpanded(item) : false;
                return (
                  <Fragment key={item._id}>
                    <TableRow
                      className={
                        expanded ? "bg-indigo-50/30" : "hover:bg-gray-50/50"
                      }
                    >
                      {hasExpandableRows && (
                        <TableCell className="px-5 py-3">
                          {rowCanExpand && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onToggleExpand?.(item)}
                              className="h-8 w-8 text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              {expanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                      )}
                      {columns.map((c) => (
                        <TableCell
                          key={c.key}
                          className="px-5 py-3 text-sm text-gray-700"
                        >
                          {c.render(item)}
                        </TableCell>
                      ))}
                      <TableCell className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(item)}
                            disabled={deletingId === item._id}
                            className="h-8 w-8 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-40"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(item._id)}
                            disabled={deletingId === item._id}
                            className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {hasExpandableRows && expanded && (
                      <TableRow className="bg-indigo-50/30">
                        <TableCell
                          colSpan={
                            columns.length + 1 + (hasExpandableRows ? 1 : 0)
                          }
                          className="px-5 py-4"
                        >
                          {renderExpandedContent?.(item)}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
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
              {renderForm(editing, (patch) =>
                setEditing((prev) => (prev ? { ...prev, ...patch } : prev)),
              )}
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
    </>
  );
}

// --- TAB COMPONENTS ---
function RolesTab() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
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
  }, []);
  if (loading)
    return <div className="text-sm text-gray-500">{t("Loading roles...")}</div>;
  return (
    <GenericTable
      items={items}
      setItems={setItems}
      idGen={() => Date.now()}
      searchFn={(i, q) => i.roleName.toLowerCase().includes(q)}
      onSaveItem={async (item) => {
        const roleName = item.roleName?.trim();
        if (!roleName) throw new Error(t("Role name cannot be empty"));
        if (item._id) {
          await updateRole(item._id, { roleName });
          return { _id: item._id, roleName };
        }
        const created = await createRole({ roleName });
        return { _id: created.roleId, roleName: created.roleName };
      }}
      onDeleteItem={deleteRole}
      columns={[
        {
          key: "id",
          label: t("Role ID"),
          render: (i) => (
            <Badge
              variant="outline"
              className="text-gray-500 bg-gray-50 font-mono"
            >
              #{i._id}
            </Badge>
          ),
        },
        {
          key: "name",
          label: t("Role Name"),
          render: (i) => (
            <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 transition-colors">
              {i.roleName}
            </Badge>
          ),
        },
      ]}
      renderForm={(item, onChange) => (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("Role Name")} *</Label>
            <Input
              value={item.roleName || ""}
              onChange={(e) => onChange({ roleName: e.target.value })}
              placeholder={t("e.g., Admin")}
            />
          </div>
        </div>
      )}
    />
  );
}

function CategoriesTab() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    getCategories()
      .then((data) => {
        if (mounted) {
          setItems(
            (data.items ?? []).map((c) => ({
              _id: c.categoryId,
              code: c.code ?? "",
              name: c.name ?? "",
              description: c.description ?? "",
            })),
          );
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error(t("Failed to load material categories"));
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  if (loading)
    return (
      <div className="text-sm text-gray-500">{t("Loading categories...")}</div>
    );
  return (
    <GenericTable
      items={items}
      setItems={setItems}
      idGen={() => Date.now()}
      searchFn={(i, q) =>
        i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q)
      }
      onSaveItem={async (item) => {
        const code = item.code?.trim().toUpperCase();
        const name = item.name?.trim();
        const description = item.description?.trim() ?? "";
        if (!code || !name) throw new Error(t("Code and name cannot be empty"));
        if (item._id) {
          await updateCategory(item._id, { code, name, description });
          return { _id: item._id, code, name, description };
        }
        const created = await createCategory({ code, name, description });
        return { _id: created.id, code, name, description };
      }}
      onDeleteItem={deleteCategory}
      columns={[
        {
          key: "code",
          label: t("Code"),
          render: (i) => (
            <Badge
              variant="outline"
              className="font-mono bg-indigo-50/50 text-indigo-700 border-indigo-100"
            >
              {i.code}
            </Badge>
          ),
        },
        { key: "name", label: t("Category Name"), render: (i) => i.name },
        {
          key: "desc",
          label: t("Description"),
          render: (i) => i.description || "—",
        },
      ]}
      renderForm={(item, onChange) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("Code")} *</Label>
              <Input
                value={item.code || ""}
                onChange={(e) =>
                  onChange({ code: e.target.value.toUpperCase() })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("Name")} *</Label>
              <Input
                value={item.name || ""}
                onChange={(e) => onChange({ name: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("Description")}</Label>
            <Textarea
              value={item.description || ""}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      )}
    />
  );
}

function ReasonsTab() {
  const { t } = useTranslation();
  const [items, setItems] = useState<AdjReason[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    getAdjustmentReasons()
      .then((data) => {
        if (mounted) {
          setItems(
            (data.items ?? []).map((r) => ({
              _id: r.reasonId,
              code: r.code ?? "",
              name: r.name ?? "",
              description: r.description ?? "",
              isActive: Boolean(r.isActive),
            })),
          );
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error(t("Failed to load adjustment reasons"));
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  if (loading)
    return (
      <div className="text-sm text-gray-500">{t("Loading reasons...")}</div>
    );
  return (
    <GenericTable
      items={items}
      setItems={setItems}
      idGen={() => Date.now()}
      searchFn={(i, q) =>
        i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q)
      }
      onSaveItem={async (item) => {
        const code = item.code?.trim().toUpperCase(),
          name = item.name?.trim(),
          description = item.description?.trim() ?? "",
          isActive = item.isActive ?? true;
        if (!code || !name) throw new Error(t("Code and name cannot be empty"));
        if (item._id) {
          await updateAdjustmentReason(item._id, {
            code,
            name,
            description,
            isActive,
          });
          return { _id: item._id, code, name, description, isActive };
        }
        const created = await createAdjustmentReason({
          code,
          name,
          description,
          isActive,
        });
        return { _id: created.id, code, name, description, isActive };
      }}
      onDeleteItem={deleteAdjustmentReason}
      columns={[
        {
          key: "code",
          label: t("Code"),
          render: (i) => (
            <Badge
              variant="outline"
              className="font-mono bg-gray-50 text-gray-700"
            >
              {i.code}
            </Badge>
          ),
        },
        {
          key: "name",
          label: t("Adjustment Reason Name"),
          render: (i) => i.name,
        },
        {
          key: "desc",
          label: t("Description"),
          render: (i) => i.description || "—",
        },
        {
          key: "active",
          label: t("Status"),
          render: (i) => (
            <Badge
              variant={i.isActive ? "default" : "outline"}
              className={
                i.isActive
                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none shadow-none"
                  : "bg-gray-50 text-gray-500 border-none shadow-none"
              }
            >
              {i.isActive ? t("Active") : t("Inactive")}
            </Badge>
          ),
        },
      ]}
      renderForm={(item, onChange) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("Code")} *</Label>
              <Input
                value={item.code || ""}
                onChange={(e) =>
                  onChange({ code: e.target.value.toUpperCase() })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("Name")} *</Label>
              <Input
                value={item.name || ""}
                onChange={(e) => onChange({ name: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("Description")}</Label>
            <Input
              value={item.description || ""}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("Status")}</Label>
            <Select
              value={item.isActive === false ? "false" : "true"}
              onValueChange={(val) => onChange({ isActive: val === "true" })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t("Active")}</SelectItem>
                <SelectItem value="false">{t("Inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    />
  );
}

function SuppliersTab() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
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
  }, []);
  if (loading)
    return (
      <div className="text-sm text-gray-500">{t("Loading suppliers...")}</div>
    );
  return (
    <GenericTable
      items={items}
      setItems={setItems}
      idGen={() => Date.now()}
      searchFn={(i, q) =>
        normalizeSearchValue(i.code).includes(q) ||
        normalizeSearchValue(i.name).includes(q) ||
        normalizeSearchValue(i.taxCode).includes(q) ||
        matchesContracts(i.contracts, q)
      }
      onSaveItem={async (item) => {
        const code = item.code?.trim().toUpperCase(),
          name = item.name?.trim(),
          taxCode = item.taxCode?.trim() ?? "",
          address = item.address?.trim() ?? "";
        if (!code || !name) throw new Error(t("Code and name cannot be empty"));
        if (item._id) {
          await updateSupplier(item._id, { code, name, taxCode, address });
          return {
            ...item,
            code,
            name,
            taxCode,
            address,
          } as Partial<SupplierItem>;
        }
        const created = await createSupplier({ code, name, taxCode, address });
        return { _id: created.id, code, name, taxCode, address, contracts: [] };
      }}
      onDeleteItem={deleteSupplier}
      canExpandRow={(item) => item.contracts.length > 0}
      renderExpandedContent={(item) => (
        <ContractsExpandedContent
          contracts={item.contracts}
          emptyMessage={t("No contracts available for this supplier.")}
        />
      )}
      isRowExpanded={(item) => expandedIds.has(item._id)}
      onToggleExpand={(item) =>
        setExpandedIds((prev) => {
          const next = new Set(prev);
          if (next.has(item._id)) next.delete(item._id);
          else next.add(item._id);
          return next;
        })
      }
      columns={[
        {
          key: "code",
          label: t("Code"),
          render: (i) => (
            <Badge
              variant="outline"
              className="font-mono bg-indigo-50/50 text-indigo-700 border-indigo-100"
            >
              {i.code}
            </Badge>
          ),
        },
        { key: "name", label: t("Supplier Name"), render: (i) => i.name },
        {
          key: "taxCode",
          label: t("Tax Code"),
          render: (i) => i.taxCode || "—",
        },
        {
          key: "contracts",
          label: t("Contracts"),
          render: (i) => renderContractCountBadge(i.contracts, t),
        },
      ]}
      renderForm={(item, onChange) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("Code")} *</Label>
              <Input
                value={item.code || ""}
                onChange={(e) =>
                  onChange({ code: e.target.value.toUpperCase() })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("Name")} *</Label>
              <Input
                value={item.name || ""}
                onChange={(e) => onChange({ name: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("Tax Code")}</Label>
              <Input
                value={item.taxCode || ""}
                onChange={(e) => onChange({ taxCode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("Address")}</Label>
              <Input
                value={item.address || ""}
                onChange={(e) => onChange({ address: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}
    />
  );
}

function WarehousesTab() {
  const { t } = useTranslation();
  const [items, setItems] = useState<WarehouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getWarehouses()
      .then((data) => {
        const rows = Array.isArray(data) ? data : (data.items ?? []);
        setItems(
          rows.map((w) => ({
            _id: w.warehouseId,
            name: w.name ?? "",
            address: w.address ?? "",
          })),
        );
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast.error(t("Failed to load warehouses"));
        setLoading(false);
      });
  }, []);
  if (loading)
    return (
      <div className="text-sm text-gray-500">{t("Loading warehouses...")}</div>
    );
  return (
    <GenericTable
      items={items}
      setItems={setItems}
      idGen={() => Date.now()}
      searchFn={(i, q) =>
        i.name.toLowerCase().includes(q) || i.address.toLowerCase().includes(q)
      }
      onSaveItem={async (item) => {
        const name = item.name?.trim(),
          address = item.address?.trim() ?? "";
        if (!name) throw new Error(t("Warehouse name cannot be empty"));
        if (item._id) {
          await updateWarehouse(item._id, { name, address });
          return { _id: item._id, name, address };
        }
        const created = await createWarehouse({ name, address });
        return { _id: created.id, name, address };
      }}
      onDeleteItem={deleteWarehouse}
      columns={[
        { key: "name", label: t("Warehouse Name"), render: (i) => i.name },
        {
          key: "address",
          label: t("Address"),
          render: (i) => i.address || "—",
        },
      ]}
      renderForm={(item, onChange) => (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("Warehouse Name")} *</Label>
            <Input
              value={item.name || ""}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("Address")}</Label>
            <Input
              value={item.address || ""}
              onChange={(e) => onChange({ address: e.target.value })}
            />
          </div>
        </div>
      )}
    />
  );
}

function BinsTab() {
  const { t } = useTranslation();
  const [items, setItems] = useState<BinRow[]>([]);
  const [warehouses, setWarehouses] = useState<
    { warehouseId: number; name: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([getBins(), getWarehouses()])
      .then(([binData, warehouseData]) => {
        const binRows = Array.isArray(binData)
          ? binData
          : (binData.items ?? []);
        const warehouseRows = Array.isArray(warehouseData)
          ? warehouseData
          : (warehouseData.items ?? []);
        setItems(
          binRows.map((b, idx) => ({
            _id: Number(b.binId ?? idx + 1),
            warehouseId: Number(b.warehouseId ?? 0),
            code: b.code ?? "",
            type: b.type ?? "",
          })),
        );
        setWarehouses(
          warehouseRows.map((w) => ({
            warehouseId: w.warehouseId,
            name: w.name ?? "",
          })),
        );
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast.error(t("Failed to load bins"));
        setLoading(false);
      });
  }, []);
  const getWarehouseName = (id: number) =>
    warehouses.find((w) => w.warehouseId === id)?.name ||
    `${t("Warehouse")} #${id}`;
  if (loading)
    return <div className="text-sm text-gray-500">{t("Loading bins...")}</div>;
  return (
    <GenericTable
      items={items}
      setItems={setItems}
      idGen={() => Date.now()}
      searchFn={(i, q) =>
        i.code.toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q) ||
        getWarehouseName(i.warehouseId).toLowerCase().includes(q)
      }
      onSaveItem={async (item) => {
        const warehouseId = Number(item.warehouseId ?? 0),
          code = item.code?.trim().toUpperCase(),
          type = item.type?.trim();
        if (!warehouseId || !code || !type)
          throw new Error(t("Data cannot be empty"));
        if (item._id) {
          await updateBin(item._id, { warehouseId, code, type });
          return { _id: item._id, warehouseId, code, type };
        }
        const created = await createBin({ warehouseId, code, type });
        return { _id: created.id, warehouseId, code, type };
      }}
      onDeleteItem={deleteBin}
      columns={[
        {
          key: "warehouse",
          label: t("Warehouse"),
          render: (i) => getWarehouseName(i.warehouseId),
        },
        {
          key: "code",
          label: t("Bin Code"),
          render: (i) => (
            <Badge
              variant="outline"
              className="font-mono bg-indigo-50/50 text-indigo-700 border-indigo-100"
            >
              {i.code}
            </Badge>
          ),
        },
        { key: "type", label: t("Type"), render: (i) => i.type },
      ]}
      renderForm={(item, onChange) => (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("Warehouse")} *</Label>
            <Select
              value={item.warehouseId ? String(item.warehouseId) : ""}
              onValueChange={(val) => onChange({ warehouseId: Number(val) })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("Select warehouse")} />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.warehouseId} value={String(w.warehouseId)}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("Bin Code")} *</Label>
              <Input
                value={item.code || ""}
                onChange={(e) =>
                  onChange({ code: e.target.value.toUpperCase() })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("Type")} *</Label>
              <Input
                value={item.type || ""}
                onChange={(e) => onChange({ type: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}
    />
  );
}

function ProjectsTab() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
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
  }, []);
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
  if (loading)
    return (
      <div className="text-sm text-gray-500">{t("Loading projects...")}</div>
    );
  return (
    <GenericTable
      items={items}
      setItems={setItems}
      idGen={() => Date.now()}
      searchFn={(i, q) =>
        normalizeSearchValue(i.name).includes(q) ||
        normalizeSearchValue(i.code).includes(q) ||
        matchesContracts(i.contracts, q)
      }
      onSaveItem={async (item) => {
        const { code, name, startDate, endDate, budget, status } =
          item as ProjectItem;
        if (!code || !name) throw new Error(t("Code and name cannot be empty"));
        const payload = {
          code,
          name,
          startDate: startDate || null,
          endDate: endDate || null,
          budget,
          status: status || "Planned",
        };
        if (item._id) {
          await updateProject(item._id, payload);
          return { ...item, ...payload } as Partial<ProjectItem>;
        }
        const created = await createProject(payload);
        return { _id: created.id, ...payload, contracts: [] };
      }}
      onDeleteItem={deleteProject}
      canExpandRow={(item) => item.contracts.length > 0}
      renderExpandedContent={(item) => (
        <ContractsExpandedContent
          contracts={item.contracts}
          emptyMessage={t("No contracts available for this project.")}
          showSupplierName
        />
      )}
      isRowExpanded={(item) => expandedIds.has(item._id)}
      onToggleExpand={(item) =>
        setExpandedIds((prev) => {
          const next = new Set(prev);
          if (next.has(item._id)) next.delete(item._id);
          else next.add(item._id);
          return next;
        })
      }
      columns={[
        {
          key: "code",
          label: t("Project Code"),
          render: (i) => (
            <Badge
              variant="outline"
              className="font-mono bg-indigo-50/50 text-indigo-700 border-indigo-100"
            >
              {i.code}
            </Badge>
          ),
        },
        { key: "name", label: t("Project Name"), render: (i) => i.name },
        {
          key: "status",
          label: t("Status"),
          render: (i) => {
            const status = i.status || "Planned";
            return (
              <Badge
                variant="outline"
                className={`border-none shadow-none ${statusProjCls[status] || "bg-gray-100 text-gray-600"}`}
              >
                {statusProjLabel[status] || status}
              </Badge>
            );
          },
        },
        {
          key: "contracts",
          label: t("Contracts"),
          render: (i) => renderContractCountBadge(i.contracts, t),
        },
      ]}
      renderForm={(item, onChange) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("Project Code")} *</Label>
              <Input
                value={item.code || ""}
                onChange={(e) =>
                  onChange({ code: e.target.value.toUpperCase() })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("Status")}</Label>
              <Select
                value={item.status || "Active"}
                onValueChange={(val) => onChange({ status: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("Status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">{t("Active")}</SelectItem>
                  <SelectItem value="Planned">{t("Planned")}</SelectItem>
                  <SelectItem value="Completed">{t("Completed")}</SelectItem>
                  <SelectItem value="Cancelled">{t("Cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("Project Name")} *</Label>
            <Input
              value={item.name || ""}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("Start Date")}</Label>
              <Input
                type="date"
                value={item.startDate || ""}
                onChange={(e) => onChange({ startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("End Date")}</Label>
              <Input
                type="date"
                value={item.endDate || ""}
                onChange={(e) => onChange({ endDate: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("Budget")}</Label>
            <Input
              type="number"
              value={item.budget ?? ""}
              onChange={(e) =>
                onChange({
                  budget: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
        </div>
      )}
    />
  );
}

// --- MAIN PAGE ---
export default function MasterDataPage() {
  const [tab, setTab] = useState<TabKey>("roles");
  const { t } = useTranslation();
  const ActiveTab = useMemo(() => {
    switch (tab) {
      case "roles":
        return RolesTab;
      case "categories":
        return CategoriesTab;
      case "reasons":
        return ReasonsTab;
      case "suppliers":
        return SuppliersTab;
      case "warehouses":
        return WarehousesTab;
      case "bins":
        return BinsTab;
      case "projects":
        return ProjectsTab;
      default:
        return RolesTab;
    }
  }, [tab]);

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Master Data Management")} />
        <div className="flex-grow overflow-hidden flex flex-col p-6 lg:p-10">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {t("Master Data Management")}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t(
                "Configure and manage system-wide parameters and reference data.",
              )}
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-gray-100/80 rounded-xl w-fit mb-6 overflow-x-auto no-scrollbar max-w-full border shadow-inner">
            {tabs.map((T) => (
              <Button
                key={T.key}
                variant={tab === T.key ? "default" : "ghost"}
                size="sm"
                onClick={() => setTab(T.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  tab === T.key
                    ? "bg-white text-indigo-600 shadow-sm hover:bg-white"
                    : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/50"
                }`}
              >
                <T.icon className="w-4 h-4" />
                {t(T.label)}
              </Button>
            ))}
          </div>

          <div className="flex-grow overflow-y-auto">
            <ActiveTab />
          </div>
        </div>
      </main>
    </div>
  );
}
