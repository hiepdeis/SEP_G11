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
  startDate: string;
  endDate: string;
  budget: number | null;
  status: string;
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

const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const quantityFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 2,
});

const normalizeSearchValue = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const formatMoney = (value?: number | null) =>
  value == null ? "—" : moneyFormatter.format(value);

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("vi-VN");
};

const formatQuantity = (value?: number | null, unit?: string | null) => {
  if (value == null) return "—";
  const suffix = unit ? ` ${unit}` : "";
  return `${quantityFormatter.format(value)}${suffix}`;
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

const renderContractCountBadge = (contracts: ContractDto[]) => {
  const count = contracts.length;
  if (count === 0)
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
        Chưa có
      </span>
    );
  return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
        {count} hợp đồng
      </span>
      <span className="text-[10px] text-slate-400">
        Bấm mũi tên để xem chi tiết
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
                    Số HĐ: {contract.contractNumber}
                  </span>
                )}
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${contract.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                >
                  {contract.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                {showSupplierName && contract.supplierName && (
                  <span>Nhà cung cấp: {contract.supplierName}</span>
                )}
                <span>Hiệu lực: {formatDate(contract.effectiveFrom)}</span>
                <span>Hết hạn: {formatDate(contract.effectiveTo)}</span>
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
              Danh sách vật liệu
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100 text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-4 py-3 uppercase tracking-wider">
                      Mã vật liệu
                    </th>
                    <th className="px-4 py-3 uppercase tracking-wider">
                      Tên vật liệu
                    </th>
                    <th className="px-4 py-3 uppercase tracking-wider">
                      Đơn vị
                    </th>
                    <th className="px-4 py-3 uppercase tracking-wider">
                      Số lượng
                    </th>
                    <th className="px-4 py-3 uppercase tracking-wider">
                      Thành tiền
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
        toast.success("Cập nhật thành công");
      } else {
        if (typeof resolved._id !== "number" || Number.isNaN(resolved._id))
          throw new Error("Khong nhan duoc ID ban ghi moi tu may chu");
        setItems((prev) => [...prev, resolved]);
        toast.success("Thêm mới thành công");
      }
      closeModal();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Bạn có chắc muốn xóa bản ghi này?")) return;
    try {
      setDeletingId(id);
      if (onDeleteItem) await onDeleteItem(id);
      setItems((prev) => prev.filter((i) => i._id !== id));
      toast.success("Đã xóa");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Xóa thất bại");
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
            placeholder="Tìm kiếm..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Thêm mới
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {hasExpandableRows && (
                  <th className="w-14 px-3 py-3 text-left text-[10px] text-gray-500 uppercase tracking-wider">
                    Chi tiết
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
                  Thao tác
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
                    Không có dữ liệu
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
          <span>{filtered.length} bản ghi</span>
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
                {editing._id ? "Chỉnh sửa" : "Thêm mới"}
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
                Hủy
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
              >
                {saving ? "Đang lưu..." : "Lưu"}
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
    return <div className="text-sm text-gray-500">Đang tải vai trò...</div>;
  return (
    <GenericTable
      items={items}
      setItems={setItems}
      idGen={() => Date.now()}
      searchFn={(i, q) => i.roleName.toLowerCase().includes(q)}
      onSaveItem={async (item) => {
        const roleName = item.roleName?.trim();
        if (!roleName) throw new Error("Tên vai trò không được để trống");
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
          label: "Mã vai trò",
          render: (i) => (
            <span className="text-xs text-gray-500">#{i._id}</span>
          ),
        },
        {
          key: "name",
          label: "Tên vai trò",
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
            Tên vai trò *
          </label>
          <input
            value={item.roleName || ""}
            onChange={(e) => onChange({ roleName: e.target.value })}
            className={inputCls}
            placeholder="VD: Admin"
          />
        </div>
      )}
    />
  );
}

function CategoriesTab() {
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
        if (!code || !name)
          throw new Error("Mã và tên danh mục không được để trống");
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
          label: "Mã",
          render: (i) => (
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium">
              {i.code}
            </span>
          ),
        },
        { key: "name", label: "Tên danh mục", render: (i) => i.name },
        { key: "desc", label: "Mô tả", render: (i) => i.description || "—" },
      ]}
      renderForm={(item, onChange) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Mã *</label>
              <input
                value={item.code || ""}
                onChange={(e) =>
                  onChange({ code: e.target.value.toUpperCase() })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tên *</label>
              <input
                value={item.name || ""}
                onChange={(e) => onChange({ name: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Mô tả</label>
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
        toast.error("Không tải được lý do điều chỉnh");
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  if (loading)
    return <div className="text-sm text-gray-500">Đang tải lý do...</div>;
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
        if (!code || !name) throw new Error("Mã và tên không được để trống");
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
          label: "Mã",
          render: (i) => (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-medium">
              {i.code}
            </span>
          ),
        },
        { key: "name", label: "Tên lý do", render: (i) => i.name },
        { key: "desc", label: "Mô tả", render: (i) => i.description || "—" },
        {
          key: "active",
          label: "Trạng thái",
          render: (i) => (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${i.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
            >
              {i.isActive ? "Hoạt động" : "Ngừng"}
            </span>
          ),
        },
      ]}
      renderForm={(item, onChange) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Mã *</label>
              <input
                value={item.code || ""}
                onChange={(e) =>
                  onChange({ code: e.target.value.toUpperCase() })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tên *</label>
              <input
                value={item.name || ""}
                onChange={(e) => onChange({ name: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Mô tả</label>
            <input
              value={item.description || ""}
              onChange={(e) => onChange({ description: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Trạng thái
            </label>
            <select
              value={item.isActive === false ? "false" : "true"}
              onChange={(e) =>
                onChange({ isActive: e.target.value === "true" })
              }
              className={inputCls}
            >
              <option value="true">Hoạt động</option>
              <option value="false">Ngừng hoạt động</option>
            </select>
          </div>
        </div>
      )}
    />
  );
}

function SuppliersTab() {
  const [items, setItems] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
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
        toast.error("Không tải được nhà cung cấp");
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  if (loading)
    return (
      <div className="text-sm text-gray-500">Đang tải nhà cung cấp...</div>
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
        if (!code || !name) throw new Error("Mã và tên không được để trống");
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
          emptyMessage="Chưa có hợp đồng nào."
        />
      )}
      isRowExpanded={(item) => expandedIds.includes(item._id)}
      onToggleExpand={(item) =>
        setExpandedIds((prev) =>
          prev.includes(item._id)
            ? prev.filter((id) => id !== item._id)
            : [...prev, item._id],
        )
      }
      columns={[
        {
          key: "code",
          label: "Mã",
          render: (i) => (
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium">
              {i.code}
            </span>
          ),
        },
        { key: "name", label: "Tên nhà cung cấp", render: (i) => i.name },
        { key: "taxCode", label: "MST", render: (i) => i.taxCode || "—" },
        {
          key: "contracts",
          label: "Hợp đồng",
          render: (i) => renderContractCountBadge(i.contracts),
        },
      ]}
      renderForm={(item, onChange) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Mã *</label>
              <input
                value={item.code || ""}
                onChange={(e) =>
                  onChange({ code: e.target.value.toUpperCase() })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tên *</label>
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
                Mã số thuế
              </label>
              <input
                value={item.taxCode || ""}
                onChange={(e) => onChange({ taxCode: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Địa chỉ
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
        toast.error("Không tải được kho");
        setLoading(false);
      });
  }, []);
  if (loading)
    return <div className="text-sm text-gray-500">Đang tải kho...</div>;
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
        if (!name) throw new Error("Tên kho không được bỏ trống");
        if (item._id) {
          await updateWarehouse(item._id, { name, address });
          return { _id: item._id, name, address };
        }
        const created = await createWarehouse({ name, address });
        return { _id: created.id, name, address };
      }}
      onDeleteItem={deleteWarehouse}
      columns={[
        { key: "name", label: "Tên kho", render: (i) => i.name },
        { key: "address", label: "Địa chỉ", render: (i) => i.address || "—" },
      ]}
      renderForm={(item, onChange) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Tên kho *
            </label>
            <input
              value={item.name || ""}
              onChange={(e) => onChange({ name: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Địa chỉ</label>
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
        toast.error("Không tải được vị trí");
        setLoading(false);
      });
  }, []);
  const getWarehouseName = (id: number) =>
    warehouses.find((w) => w.warehouseId === id)?.name || `Kho #${id}`;
  if (loading)
    return <div className="text-sm text-gray-500">Đang tải vị trí...</div>;
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
          throw new Error("Dữ liệu không được trống");
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
          label: "Kho",
          render: (i) => getWarehouseName(i.warehouseId),
        },
        {
          key: "code",
          label: "Mã vị trí",
          render: (i) => (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-medium">
              {i.code}
            </span>
          ),
        },
        { key: "type", label: "Loại", render: (i) => i.type },
      ]}
      renderForm={(item, onChange) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Kho *</label>
            <select
              value={item.warehouseId || ""}
              onChange={(e) =>
                onChange({ warehouseId: Number(e.target.value) })
              }
              className={inputCls}
            >
              <option value="">Chọn kho</option>
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
                Mã vị trí *
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
              <label className="block text-sm text-gray-600 mb-1">Loại *</label>
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
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
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
        toast.error("Không tải được dự án");
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
    Active: "Đang thực hiện",
    Completed: "Hoàn thành",
    Planned: "Kế hoạch",
    Cancelled: "Hủy",
  };
  if (loading)
    return <div className="text-sm text-gray-500">Đang tải dự án...</div>;
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
        if (!code || !name) throw new Error("Mã và tên không được trống");
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
          emptyMessage="Chưa có hợp đồng nào."
          showSupplierName
        />
      )}
      isRowExpanded={(item) => expandedIds.includes(item._id)}
      onToggleExpand={(item) =>
        setExpandedIds((prev) =>
          prev.includes(item._id)
            ? prev.filter((id) => id !== item._id)
            : [...prev, item._id],
        )
      }
      columns={[
        {
          key: "code",
          label: "Mã dự án",
          render: (i) => (
            <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-medium">
              {i.code}
            </span>
          ),
        },
        { key: "name", label: "Tên dự án", render: (i) => i.name },
        {
          key: "status",
          label: "Trạng thái",
          render: (i) => (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusProjCls[i.status] || "bg-gray-100 text-gray-600"}`}
            >
              {statusProjLabel[i.status] || i.status}
            </span>
          ),
        },
        {
          key: "contracts",
          label: "Hợp đồng",
          render: (i) => renderContractCountBadge(i.contracts),
        },
      ]}
      renderForm={(item, onChange) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Mã dự án *
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
                Trạng thái
              </label>
              <select
                value={item.status || "Active"}
                onChange={(e) => onChange({ status: e.target.value })}
                className={inputCls}
              >
                <option value="Active">Đang thực hiện</option>
                <option value="Planned">Kế hoạch</option>
                <option value="Completed">Hoàn thành</option>
                <option value="Cancelled">Hủy</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Tên dự án *
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
                Ngày bắt đầu
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
                Ngày kết thúc
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
              Ngân sách (VNĐ)
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
  const [activeTab, setActiveTab] = useState<TabKey>("roles");
  const renderTab = () => {
    switch (activeTab) {
      case "roles":
        return <RolesTab />;
      case "categories":
        return <CategoriesTab />;
      case "reasons":
        return <ReasonsTab />;
      case "suppliers":
        return <SuppliersTab />;
      case "warehouses":
        return <WarehousesTab />;
      case "bins":
        return <BinsTab />;
      case "projects":
        return <ProjectsTab />;
    }
  };
  return (
    <div className="flex h-screen w-screen flex-row overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="relative z-10 flex flex-grow flex-col overflow-hidden">
        <Header title="Dữ liệu danh mục" />
        <div className="flex-grow space-y-6 overflow-y-auto p-6 lg:p-10">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Dữ liệu danh mục
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Quản lý các thông tin tham chiếu hệ thống
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-1 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 min-h-[500px]">
              {renderTab()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
