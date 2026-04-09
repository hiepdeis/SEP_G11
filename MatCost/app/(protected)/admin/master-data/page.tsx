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
  { key: "roles", label: "Vai trò", icon: Shield },
  { key: "categories", label: "Danh mục vật tư", icon: Layers },
  { key: "reasons", label: "Lý do điều chỉnh", icon: ClipboardList },
  { key: "suppliers", label: "Nhà cung cấp", icon: Truck },
  { key: "warehouses", label: "Kho hàng", icon: Warehouse },
  { key: "bins", label: "Vị trí kệ", icon: MapPin },
  { key: "projects", label: "Dự án", icon: FolderKanban },
] as const;
type TabKey = (typeof tabs)[number]["key"];

// --- GENERIC COMPONENTS & UTILS ---
const inputCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm";

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
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
        {t("N/A")}
      </span>
    );
  return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
        {count} {t("contracts")}
      </span>
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
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  <FileText className="h-3.5 w-3.5" />
                  {contract.contractCode}
                </span>
                {contract.contractNumber && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    {t("No.")}: {contract.contractNumber}
                  </span>
                )}
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${contract.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                >
                  {t(contract.status)}
                </span>
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
                  Vật liệu
                </div>
                <div className="font-medium text-slate-900">
                  {contract.materialCount}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  Tổng giá trị
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
              <table className="min-w-full divide-y divide-slate-100 text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-4 py-3 uppercase tracking-wider">
                      {t("Material Code")}
                    </th>
                    <th className="px-4 py-3 uppercase tracking-wider">
                      {t("Material Name")}
                    </th>
                    <th className="px-4 py-3 uppercase tracking-wider">
                      {t("Unit")}
                    </th>
                    <th className="px-4 py-3 uppercase tracking-wider">
                      {t("Quantity")}
                    </th>
                    <th className="px-4 py-3 uppercase tracking-wider">
                      {t("Total")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {contract.materials.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-5 text-center text-slate-400"
                      >
                        Hợp đồng này chưa có vật liệu.
                      </td>
                    </tr>
                  ) : (
                    contract.materials.map((material) => (
                      <tr
                        key={`${contract.contractId}-${material.materialId}`}
                        className="text-slate-700"
                      >
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700">
                            {material.code}
                          </span>
                        </td>
                        <td className="px-4 py-3">{material.name}</td>
                        <td className="px-4 py-3">{material.unit || "—"}</td>
                        <td className="px-4 py-3">
                          {formatQuantity(
                            material.orderedQuantity,
                            material.unit,
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {formatMoney(material.totalAmount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
    if (!editing) return;
    try {
      setSaving(true);
      const saved =
        (onSaveItem ? await onSaveItem(editing) : editing) ?? editing;
      const resolved = { ...editing, ...saved } as T;
      if (editing._id) {
        setItems((prev) =>
          prev.map((i) =>
            i._id === editing._id ? ({ ...i, ...resolved } as T) : i,
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
    if (!window.confirm(t("Are you sure you want to delete this record?")))
      return;
    try {
      setDeletingId(id);
      if (onDeleteItem) await onDeleteItem(id);
      setItems((prev) => prev.filter((i) => i._id !== id));
      toast.success(t("Delete Successful"));
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : t("Delete Failed"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("Search...")}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> {t("Add New")}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {hasExpandableRows && (
                  <th className="w-14 px-3 py-3 text-left text-[10px] text-gray-500 uppercase tracking-wider">
                    {t("Details")}
                  </th>
                )}
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className="text-left px-5 py-3 text-[10px] text-gray-500 uppercase tracking-wider"
                  >
                    {c.label}
                  </th>
                ))}
                <th className="text-left px-5 py-3 text-[10px] text-gray-500 uppercase tracking-wider">
                  {t("Actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1 + (hasExpandableRows ? 1 : 0)}
                    className="px-5 py-8 text-center text-gray-400 text-sm"
                  >
                    {t("No Data")}
                  </td>
                </tr>
              ) : (
                paginated.map((item) => {
                  const rowCanExpand = canExpandRow ? canExpandRow(item) : true;
                  const expanded =
                    rowCanExpand && isRowExpanded ? isRowExpanded(item) : false;
                  return (
                    <Fragment key={item._id}>
                      <tr
                        className={
                          expanded ? "bg-slate-50/80" : "hover:bg-gray-50/50"
                        }
                      >
                        {hasExpandableRows && (
                          <td className="px-3 py-3 align-top">
                            {rowCanExpand && (
                              <button
                                type="button"
                                onClick={() => onToggleExpand?.(item)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                              >
                                {expanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </td>
                        )}
                        {columns.map((c) => (
                          <td
                            key={c.key}
                            className="px-5 py-3 text-sm text-gray-700"
                          >
                            {c.render(item)}
                          </td>
                        ))}
                        <td className="px-5 py-3 align-top flex gap-1">
                          <button
                            onClick={() => openEdit(item)}
                            disabled={deletingId === item._id}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-40"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => remove(item._id)}
                            disabled={deletingId === item._id}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors disabled:opacity-40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      {hasExpandableRows && expanded && (
                        <tr className="bg-slate-50/80">
                          <td
                            colSpan={
                              columns.length + 1 + (hasExpandableRows ? 1 : 0)
                            }
                            className="px-5 py-4"
                          >
                            {renderExpandedContent?.(item)}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
          <span>
            {filtered.length} {t("records")}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                {editing._id ? t("Edit") : t("Add New")}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {renderForm(editing, (patch) =>
                setEditing({ ...editing, ...patch }),
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg disabled:opacity-40"
              >
                {t("Cancel")}
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
              >
                {saving ? t("Saving...") : t("Save")}
              </button>
            </div>
          </div>
        </div>
      )}
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
        toast.error("Không tải được danh sách vai trò");
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
            <span className="text-xs text-gray-500">#{i._id}</span>
          ),
        },
        {
          key: "name",
          label: t("Role Name"),
          render: (i) => (
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
              {i.roleName}
            </span>
          ),
        },
      ]}
      renderForm={(item, onChange) => (
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            {t("Role Name")} *
          </label>
          <input
            value={item.roleName || ""}
            onChange={(e) => onChange({ roleName: e.target.value })}
            className={inputCls}
            placeholder={t("e.g., Admin")}
          />
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
        toast.error("Không tải được danh mục vật tư");
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  if (loading)
    return <div className="text-sm text-gray-500">Đang tải danh mục...</div>;
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
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium">
              {i.code}
            </span>
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
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {t("Code")} *
              </label>
              <input
                value={item.code || ""}
                onChange={(e) =>
                  onChange({ code: e.target.value.toUpperCase() })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {t("Name")} *
              </label>
              <input
                value={item.name || ""}
                onChange={(e) => onChange({ name: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              {t("Description")}
            </label>
            <input
              value={item.description || ""}
              onChange={(e) => onChange({ description: e.target.value })}
              className={inputCls}
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
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-medium">
              {i.code}
            </span>
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
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${i.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
            >
              {i.isActive ? t("Active") : t("Inactive")}
            </span>
          ),
        },
      ]}
      renderForm={(item, onChange) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {t("Code")} *
              </label>
              <input
                value={item.code || ""}
                onChange={(e) =>
                  onChange({ code: e.target.value.toUpperCase() })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {t("Name")} *
              </label>
              <input
                value={item.name || ""}
                onChange={(e) => onChange({ name: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              {t("Description")}
            </label>
            <input
              value={item.description || ""}
              onChange={(e) => onChange({ description: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              {t("Status")}
            </label>
            <select
              value={item.isActive === false ? "false" : "true"}
              onChange={(e) =>
                onChange({ isActive: e.target.value === "true" })
              }
              className={inputCls}
            >
              <option value="true">{t("Active")}</option>
              <option value="false">{t("Inactive")}</option>
            </select>
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
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium">
              {i.code}
            </span>
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
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {t("Code")} *
              </label>
              <input
                value={item.code || ""}
                onChange={(e) =>
                  onChange({ code: e.target.value.toUpperCase() })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {t("Name")} *
              </label>
              <input
                value={item.name || ""}
                onChange={(e) => onChange({ name: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {t("Tax Code")}
              </label>
              <input
                value={item.taxCode || ""}
                onChange={(e) => onChange({ taxCode: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {t("Address")}
              </label>
              <input
                value={item.address || ""}
                onChange={(e) => onChange({ address: e.target.value })}
                className={inputCls}
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
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              {t("Warehouse Name")} *
            </label>
            <input
              value={item.name || ""}
              onChange={(e) => onChange({ name: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              {t("Address")}
            </label>
            <input
              value={item.address || ""}
              onChange={(e) => onChange({ address: e.target.value })}
              className={inputCls}
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
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-medium">
              {i.code}
            </span>
          ),
        },
        { key: "type", label: t("Type"), render: (i) => i.type },
      ]}
      renderForm={(item, onChange) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              {t("Warehouse")} *
            </label>
            <select
              value={item.warehouseId || ""}
              onChange={(e) =>
                onChange({ warehouseId: Number(e.target.value) })
              }
              className={inputCls}
            >
              <option value="">{t("Select warehouse")}</option>
              {warehouses.map((w) => (
                <option key={w.warehouseId} value={w.warehouseId}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {t("Bin Code")} *
              </label>
              <input
                value={item.code || ""}
                onChange={(e) =>
                  onChange({ code: e.target.value.toUpperCase() })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {t("Type")} *
              </label>
              <input
                value={item.type || ""}
                onChange={(e) => onChange({ type: e.target.value })}
                className={inputCls}
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
            <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-medium">
              {i.code}
            </span>
          ),
        },
        { key: "name", label: t("Project Name"), render: (i) => i.name },
        {
          key: "status",
          label: t("Status"),
          render: (i) => (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${(i.status && statusProjCls[i.status]) || "bg-gray-100 text-gray-600"}`}
            >
              {(i.status && statusProjLabel[i.status]) || i.status || "—"}
            </span>
          ),
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
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {t("Project Code")} *
              </label>
              <input
                value={item.code || ""}
                onChange={(e) =>
                  onChange({ code: e.target.value.toUpperCase() })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {t("Status")}
              </label>
              <select
                value={item.status || "Active"}
                onChange={(e) => onChange({ status: e.target.value })}
                className={inputCls}
              >
                <option value="Active">{t("Active")}</option>
                <option value="Planned">{t("Planned")}</option>
                <option value="Completed">{t("Completed")}</option>
                <option value="Cancelled">{t("Cancelled")}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              {t("Project Name")} *
            </label>
            <input
              value={item.name || ""}
              onChange={(e) => onChange({ name: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {t("Start Date")}
              </label>
              <input
                type="date"
                value={item.startDate || ""}
                onChange={(e) => onChange({ startDate: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {t("End Date")}
              </label>
              <input
                type="date"
                value={item.endDate || ""}
                onChange={(e) => onChange({ endDate: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              {t("Budget")}
            </label>
            <input
              type="number"
              value={item.budget ?? ""}
              onChange={(e) =>
                onChange({
                  budget: e.target.value ? Number(e.target.value) : null,
                })
              }
              className={inputCls}
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

          <div className="flex items-center gap-1 p-1 bg-gray-100/80 rounded-xl w-fit mb-6 overflow-x-auto no-scrollbar max-w-full">
            {tabs.map((T) => (
              <button
                key={T.key}
                onClick={() => setTab(T.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  tab === T.key
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <T.icon className="w-4 h-4" />
                {t(T.label)}
              </button>
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
