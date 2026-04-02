"use client";
import { useState, useMemo, useEffect } from "react";
import {
  Search, Plus, Edit2, Trash2, X, Layers, ClipboardList,
  Truck, Warehouse, MapPin, ChevronLeft, ChevronRight, Shield, FolderKanban,
} from "lucide-react";
import { toast } from "sonner";
import { getRoles, updateRole, deleteRole, createRole } from "@/services/admin-users";
import { createCategory, deleteCategory, getCategories, updateCategory } from "@/services/material-categories";
import {
  getAdjustmentReasons,
  createAdjustmentReason,
  updateAdjustmentReason,
  deleteAdjustmentReason,
} from "@/services/adjustment-reasons";
import { createSupplier, deleteSupplier, getSuppliers, updateSupplier } from "@/services/admin-suppliers";
import {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from "@/services/admin-warehouses";
import { createBin, deleteBin, getBins, updateBin } from "@/services/admin-bins";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from "@/services/admin-projects";
// ─── Tabs ───
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

// ─── Generic CRUD Table ───
interface BaseItem { _id: number; }

function GenericTable<T extends BaseItem>({
  items,
  setItems,
  columns,
  renderForm,
  idGen,
  searchFn,
  onSaveItem,
  onDeleteItem,
}: {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  columns: { key: string; label: string; render: (item: T) => React.ReactNode }[];
  renderForm: (item: Partial<T>, onChange: (patch: Partial<T>) => void) => React.ReactNode;
  idGen: () => number;
  searchFn: (item: T, q: string) => boolean;
  onSaveItem?: (item: Partial<T>) => Promise<Partial<T> | void>;
  onDeleteItem?: (id: number) => Promise<void>;
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
    [items, search, searchFn]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

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

    const saved = (onSaveItem ? await onSaveItem(editing) : editing) ?? editing;
    const resolved = { ...editing, ...saved } as T;

    if (editing._id) {
      setItems((prev) =>
        prev.map((i) =>
          i._id === editing._id ? ({ ...i, ...resolved } as T) : i
        )
      );
      toast.success("Cập nhật thành công");
    } else {
      if (typeof resolved._id !== "number" || Number.isNaN(resolved._id)) {
        throw new Error("Khong nhan duoc ID ban ghi moi tu may chu");
      }

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
    const ok = window.confirm("Bạn có chắc muốn xóa bản ghi này?");
    if (!ok) return;

    try {
      setDeletingId(id);

      if (onDeleteItem) {
        await onDeleteItem(id);
      }

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
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider"
                  >
                    {c.label}
                  </th>
                ))}
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-5 py-8 text-center text-gray-400 text-sm"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                paginated.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50/50">
                    {columns.map((c) => (
                      <td key={c.key} className="px-5 py-3 text-sm text-gray-700">
                        {c.render(item)}
                      </td>
                    ))}

                    <td className="px-5 py-3">
                      <div className="flex gap-1">
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
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
              <h3 className="text-gray-900">
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
              {renderForm(editing, (patch) => setEditing({ ...editing, ...patch }))}
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

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm";

// ═══════════ ROLES ═══════════
// DB: Roles(RoleID, RoleName)
interface Role extends BaseItem { roleName: string; }
// const mockRoles: Role[] = [
//   { _id: 1, roleName: "Admin" },
//   { _id: 2, roleName: "WarehouseManager" },
//   { _id: 3, roleName: "WarehouseStaff" },
//   { _id: 4, roleName: "Accountant" },
//   { _id: 5, roleName: "Viewer" },
// ];
// ═══════════ ROLES ═══════════
// DB: Roles(RoleID, RoleName)
interface Role extends BaseItem {
  roleName: string;
}

function RolesTab() {
  const [items, setItems] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadRoles = async () => {
      try {
        const data = await getRoles();

        if (!mounted) return;

        setItems(
          (data ?? []).map((r) => ({
            _id: r.roleId,
            roleName: r.roleName,
          }))
        );
      } catch (error) {
        console.error(error);
        toast.error("Không tải được danh sách vai trò");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadRoles();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-500">Đang tải vai trò...</div>;
  }

  return (
    <GenericTable
      items={items}
      setItems={setItems}
      idGen={() => Date.now()}
      searchFn={(i, q) => i.roleName.toLowerCase().includes(q)}
onSaveItem={async (item) => {
  const roleName = item.roleName?.trim();
  if (!roleName) {
    throw new Error("Tên vai trò không được để trống");
  }

  if (item._id) {
    await updateRole(item._id, { roleName });
    return {
      _id: item._id,
      roleName,
    };
  }

  const created = await createRole({ roleName });
  return {
    _id: created.roleId,
    roleName: created.roleName,
  };
}}
      onDeleteItem={async (id) => {
        await deleteRole(id);
      }}
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
            value={(item as Partial<Role>).roleName || ""}
            onChange={(e) =>
              onChange({ roleName: e.target.value } as Partial<Role>)
            }
            className={inputCls}
            placeholder="VD: Admin"
          />
        </div>
      )}
    />
  );
}

// ═══════════ MATERIAL CATEGORIES ═══════════
// DB: MaterialCategories(CategoryID, Code, Name, Description)
interface Category extends BaseItem { code: string; name: string; description: string; }
// const mockCategories: Category[] = [
//   { _id: 1, code: "RAW", name: "Raw Materials", description: "Nguyên vật liệu thô" },
//   { _id: 2, code: "PKG", name: "Packaging", description: "Vật liệu đóng gói" },
//   { _id: 3, code: "CHM", name: "Chemicals", description: "Hóa chất công nghiệp" },
//   { _id: 4, code: "SPR", name: "Spare Parts", description: "Phụ tùng thay thế" },
//   { _id: 5, code: "ELC", name: "Electronics", description: "Linh kiện điện tử" },
// ];
function CategoriesTab() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadCategories = async () => {
      try {
        const data = await getCategories();

        if (!mounted) return;

       setItems(
  (data.items ?? []).map((c) => ({
    _id: c.categoryId,
    code: c.code ?? "",
    name: c.name ?? "",
    description: c.description ?? "",
  }))
);
      } catch (error) {
        console.error(error);
        toast.error("Không tải được danh mục vật tư");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-500">Đang tải danh mục...</div>;
  }

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

        if (!code) {
          throw new Error("Mã danh mục không được để trống");
        }

        if (!name) {
          throw new Error("Tên danh mục không được để trống");
        }

        if (item._id) {
          await updateCategory(item._id, {
            code,
            name,
            description,
          });

          return {
            _id: item._id,
            code,
            name,
            description,
          };
        }

        const created = await createCategory({
          code,
          name,
          description,
        });

        return {
          _id: created.id,
          code,
          name,
          description,
        };
      }}
      onDeleteItem={async (id) => {
        await deleteCategory(id);
      }}
      columns={[
        {
          key: "code",
          label: "Mã",
          render: (i) => (
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
              {i.code}
            </span>
          ),
        },
        { key: "name", label: "Tên danh mục", render: (i) => i.name },
        {
          key: "desc",
          label: "Mô tả",
          render: (i) => i.description || "—",
        },
      ]}
      renderForm={(item, onChange) => {
        const c = item as Partial<Category>;
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Mã *</label>
                <input
                  value={c.code || ""}
                  onChange={(e) =>
                    onChange({
                      code: e.target.value.toUpperCase(),
                    } as Partial<Category>)
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tên *</label>
                <input
                  value={c.name || ""}
                  onChange={(e) =>
                    onChange({ name: e.target.value } as Partial<Category>)
                  }
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Mô tả</label>
              <input
                value={c.description || ""}
                onChange={(e) =>
                  onChange({ description: e.target.value } as Partial<Category>)
                }
                className={inputCls}
              />
            </div>
          </>
        );
      }}
    />
  );
}

// ═══════════ ADJUSTMENT REASONS ═══════════
// DB: AdjustmentReasons(ReasonID, Code, Name, Description, IsActive)

// const mockReasons: AdjReason[] = [
//   { _id: 1, code: "DMG", name: "Damaged Goods", description: "Hàng bị hư hỏng", isActive: true },
//   { _id: 2, code: "CYC", name: "Cycle Count Adjustment", description: "Điều chỉnh sau kiểm kê", isActive: true },
//   { _id: 3, code: "FND", name: "Found Stock", description: "Phát hiện hàng tồn", isActive: true },
//   { _id: 4, code: "EXP", name: "Expired", description: "Hàng hết hạn sử dụng", isActive: true },
//   { _id: 5, code: "RET", name: "Return from Production", description: "Trả lại từ sản xuất", isActive: false },
// ];
// ═══════════ ADJUSTMENT REASONS ═══════════
// DB: AdjustmentReasons(ReasonID, Code, Name, Description, IsActive)
interface AdjReason extends BaseItem {
  code: string;
  name: string;
  description: string;
  isActive: boolean;
}

function ReasonsTab() {
  const [items, setItems] = useState<AdjReason[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadReasons = async () => {
      try {
        const data = await getAdjustmentReasons();

        if (!mounted) return;

        setItems(
          (data.items ?? []).map((r) => ({
            _id: r.reasonId,
            code: r.code ?? "",
            name: r.name ?? "",
            description: r.description ?? "",
            isActive: Boolean(r.isActive),
          }))
        );
      } catch (error) {
        console.error(error);
        toast.error("Không tải được lý do điều chỉnh");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadReasons();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-500">Đang tải lý do điều chỉnh...</div>;
  }

  return (
    <GenericTable
      items={items}
      setItems={setItems}
      idGen={() => Date.now()}
      searchFn={(i, q) => {
        const name = String(i.name ?? "").toLowerCase();
        const code = String(i.code ?? "").toLowerCase();
        return name.includes(q) || code.includes(q);
      }}
      onSaveItem={async (item) => {
        const code = item.code?.trim().toUpperCase();
        const name = item.name?.trim();
        const description = item.description?.trim() ?? "";
        const isActive = item.isActive ?? true;

        if (!code) {
          throw new Error("Mã lý do không được để trống");
        }

        if (!name) {
          throw new Error("Tên lý do không được để trống");
        }

        if (item._id) {
          await updateAdjustmentReason(item._id, {
            code,
            name,
            description,
            isActive,
          });

          return {
            _id: item._id,
            code,
            name,
            description,
            isActive,
          };
        }

        const created = await createAdjustmentReason({
          code,
          name,
          description,
          isActive,
        });

        return {
          _id: created.id,
          code,
          name,
          description,
          isActive,
        };
      }}
      onDeleteItem={async (id) => {
        await deleteAdjustmentReason(id);
      }}
      columns={[
        {
          key: "code",
          label: "Mã",
          render: (i) => (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
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
              className={`px-2 py-0.5 rounded-full text-xs ${
                i.isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {i.isActive ? "Hoạt động" : "Ngừng"}
            </span>
          ),
        },
      ]}
      renderForm={(item, onChange) => {
        const r = item as Partial<AdjReason>;

        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Mã *</label>
                <input
                  value={r.code || ""}
                  onChange={(e) =>
                    onChange({
                      code: e.target.value.toUpperCase(),
                    } as Partial<AdjReason>)
                  }
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Tên *</label>
                <input
                  value={r.name || ""}
                  onChange={(e) =>
                    onChange({ name: e.target.value } as Partial<AdjReason>)
                  }
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Mô tả</label>
              <input
                value={r.description || ""}
                onChange={(e) =>
                  onChange({ description: e.target.value } as Partial<AdjReason>)
                }
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Trạng thái</label>
              <select
                value={r.isActive === false ? "false" : "true"}
                onChange={(e) =>
                  onChange({
                    isActive: e.target.value === "true",
                  } as Partial<AdjReason>)
                }
                className={inputCls}
              >
                <option value="true">Hoạt động</option>
                <option value="false">Ngừng hoạt động</option>
              </select>
            </div>
          </>
        );
      }}
    />
  );
}

// ═══════════ SUPPLIERS ═══════════
// DB: Suppliers(SupplierID, Code, Name, TaxCode, Address)
// interface SupplierItem extends BaseItem { code: string; name: string; taxCode: string; address: string; }
// const mockSuppliers: SupplierItem[] = [
//   { _id: 1, code: "SUP-001", name: "Viet Steel Corp", taxCode: "0301234567", address: "KCN Biên Hòa, Đồng Nai" },
//   { _id: 2, code: "SUP-002", name: "Saigon Chemical", taxCode: "0302345678", address: "Q.7, TP.HCM" },
//   { _id: 3, code: "SUP-003", name: "Dai Phat Packaging", taxCode: "0303456789", address: "KCN Tân Bình, TP.HCM" },
//   { _id: 4, code: "SUP-004", name: "Hoa Sen Group", taxCode: "3700456789", address: "Bình Dương" },
// ];
// ═══════════ SUPPLIERS ═══════════
// DB: Suppliers(SupplierID, Code, Name, TaxCode, Address)
interface SupplierItem extends BaseItem {
  code: string;
  name: string;
  taxCode: string;
  address: string;
}

function SuppliersTab() {
  const [items, setItems] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSuppliers = async () => {
      try {
        const data = await getSuppliers();

        if (!mounted) return;

        setItems(
          (data.items ?? []).map((s) => ({
            _id: s.supplierId,
            code: s.code ?? "",
            name: s.name ?? "",
            taxCode: s.taxCode ?? "",
            address: s.address ?? "",
          }))
        );
      } catch (error) {
        console.error(error);
        toast.error("Không tải được nhà cung cấp");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadSuppliers();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-500">Đang tải nhà cung cấp...</div>;
  }

  return (
    <GenericTable
      items={items}
      setItems={setItems}
      idGen={() => Date.now()}
      searchFn={(i, q) => {
        const code = String(i.code ?? "").toLowerCase();
        const name = String(i.name ?? "").toLowerCase();
        const taxCode = String(i.taxCode ?? "").toLowerCase();
        const address = String(i.address ?? "").toLowerCase();

        return (
          code.includes(q) ||
          name.includes(q) ||
          taxCode.includes(q) ||
          address.includes(q)
        );
      }}
      onSaveItem={async (item) => {
        const code = item.code?.trim().toUpperCase();
        const name = item.name?.trim();
        const taxCode = item.taxCode?.trim() ?? "";
        const address = item.address?.trim() ?? "";

        if (!code) {
          throw new Error("Mã nhà cung cấp không được để trống");
        }

        if (!name) {
          throw new Error("Tên nhà cung cấp không được để trống");
        }

        if (item._id) {
          await updateSupplier(item._id, {
            code,
            name,
            taxCode,
            address,
          });

          return {
            _id: item._id,
            code,
            name,
            taxCode,
            address,
          };
        }

        const created = await createSupplier({
          code,
          name,
          taxCode,
          address,
        });

        return {
          _id: created.id,
          code,
          name,
          taxCode,
          address,
        };
      }}
      onDeleteItem={async (id) => {
        await deleteSupplier(id);
      }}
      columns={[
        {
          key: "code",
          label: "Mã",
          render: (i) => (
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
              {i.code}
            </span>
          ),
        },
        { key: "name", label: "Tên nhà cung cấp", render: (i) => i.name },
        { key: "taxCode", label: "Mã số thuế", render: (i) => i.taxCode || "—" },
        { key: "address", label: "Địa chỉ", render: (i) => i.address || "—" },
      ]}
      renderForm={(item, onChange) => {
        const s = item as Partial<SupplierItem>;

        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Mã *</label>
                <input
                  value={s.code || ""}
                  onChange={(e) =>
                    onChange({
                      code: e.target.value.toUpperCase(),
                    } as Partial<SupplierItem>)
                  }
                  className={inputCls}
                  placeholder="VD: SUP-001"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Tên *</label>
                <input
                  value={s.name || ""}
                  onChange={(e) =>
                    onChange({ name: e.target.value } as Partial<SupplierItem>)
                  }
                  className={inputCls}
                  placeholder="VD: Hoa Sen Group"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Mã số thuế</label>
                <input
                  value={s.taxCode || ""}
                  onChange={(e) =>
                    onChange({ taxCode: e.target.value } as Partial<SupplierItem>)
                  }
                  className={inputCls}
                  placeholder="VD: 0301234567"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Địa chỉ</label>
                <input
                  value={s.address || ""}
                  onChange={(e) =>
                    onChange({ address: e.target.value } as Partial<SupplierItem>)
                  }
                  className={inputCls}
                  placeholder="VD: KCN Biên Hòa, Đồng Nai"
                />
              </div>
            </div>
          </>
        );
      }}
    />
  );
}

// ═══════════ WAREHOUSES ═══════════
// DB: Warehouses(WarehouseID, Name, Address)
interface WarehouseRow extends BaseItem {
  name: string;
  address: string;
}
// const mockWarehouses: WarehouseItem[] = [
//   { _id: 1, name: "Kho chính Biên Hòa", address: "KCN Biên Hòa, Đồng Nai" },
//   { _id: 2, name: "Kho lạnh Q.9", address: "Q.9, TP.HCM" },
//   { _id: 3, name: "Kho trung chuyển BD", address: "KCN Mỹ Phước, Bình Dương" },
//   { _id: 4, name: "Kho lưu trữ Long An", address: "KCN Long Hậu, Long An" },
// ];
function WarehousesTab() {
  const [items, setItems] = useState<WarehouseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadWarehouses = async () => {
      try {
        const data = await getWarehouses();
        const rows = Array.isArray(data) ? data : (data.items ?? []);

        if (!mounted) return;

        setItems(
          rows.map((w) => ({
            _id: w.warehouseId,
            name: w.name ?? "",
            address: w.address ?? "",
          }))
        );
      } catch (error) {
        console.error(error);
        toast.error("Không tải được kho");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadWarehouses();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-500">Đang tải kho...</div>;
  }

  return (
    <GenericTable
      items={items}
      setItems={setItems}
      idGen={() => Date.now()}
      searchFn={(i, q) => {
        const name = String(i.name ?? "").toLowerCase();
        const address = String(i.address ?? "").toLowerCase();
        return name.includes(q) || address.includes(q);
      }}
      onSaveItem={async (item) => {
        const name = item.name?.trim();
        const address = item.address?.trim() ?? "";

        if (!name) {
          throw new Error("Tên kho không được để trống");
        }

        if (item._id) {
          await updateWarehouse(item._id, {
            name,
            address,
          });

          return {
            _id: item._id,
            name,
            address,
          };
        }

        const created = await createWarehouse({
          name,
          address,
        });

        return {
          _id: created.id,
          name,
          address,
        };
      }}
      onDeleteItem={async (id) => {
        await deleteWarehouse(id);
      }}
      columns={[
        { key: "name", label: "Tên kho", render: (i) => i.name },
        { key: "address", label: "Địa chỉ", render: (i) => i.address || "—" },
      ]}
      renderForm={(item, onChange) => {
        const w = item as Partial<WarehouseRow>;

        return (
          <>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tên kho *</label>
              <input
                value={w.name || ""}
                onChange={(e) =>
                  onChange({ name: e.target.value } as Partial<WarehouseRow>)
                }
                className={inputCls}
                placeholder="VD: Kho Trung Tâm Hà Nội"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Địa chỉ</label>
              <input
                value={w.address || ""}
                onChange={(e) =>
                  onChange({ address: e.target.value } as Partial<WarehouseRow>)
                }
                className={inputCls}
                placeholder="VD: Số 10 Đường Láng, Đống Đa, Hà Nội"
              />
            </div>
          </>
        );
      }}
    />
  );
}

// ═══════════ BIN LOCATIONS ═══════════
// DB: BinLocations(BinID, WarehouseID, Code, Type)
// interface BinItem extends BaseItem { warehouseId: number; code: string; type: string; }
// const mockBins: BinItem[] = [
//   { _id: 1, warehouseId: 1, code: "A-01-01", type: "rack" },
//   { _id: 2, warehouseId: 1, code: "A-01-02", type: "rack" },
//   { _id: 3, warehouseId: 1, code: "B-02-01", type: "shelf" },
//   { _id: 4, warehouseId: 2, code: "COLD-01", type: "cold" },
//   { _id: 5, warehouseId: 3, code: "FLOOR-01", type: "floor" },
//   { _id: 6, warehouseId: 1, code: "A-02-01", type: "rack" },
// ];
interface BinRow extends BaseItem {
  warehouseId: number;
  code: string;
  type: string;
}

function BinsTab() {
  const [items, setItems] = useState<BinRow[]>([]);
  const [warehouses, setWarehouses] = useState<{ warehouseId: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [binData, warehouseData] = await Promise.all([
          getBins(),
          getWarehouses(),
        ]);

        const binRows = Array.isArray(binData) ? binData : (binData.items ?? []);
        const warehouseRows = Array.isArray(warehouseData)
          ? warehouseData
          : (warehouseData.items ?? []);

        if (!mounted) return;

        setItems(
          binRows.map((b, idx) => ({
            _id: Number(b.binId ?? idx + 1),
            warehouseId: Number(b.warehouseId ?? 0),
            code: b.code ?? "",
            type: b.type ?? "",
          }))
        );

        setWarehouses(
          warehouseRows.map((w) => ({
            warehouseId: w.warehouseId,
            name: w.name ?? "",
          }))
        );
      } catch (error) {
        console.error(error);
        toast.error("Không tải được vị trí lưu trữ");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-500">Đang tải vị trí lưu trữ...</div>;
  }

  const getWarehouseName = (warehouseId: number) =>
    warehouses.find((w) => w.warehouseId === warehouseId)?.name || `Kho #${warehouseId}`;

  return (
    <GenericTable
      items={items}
      setItems={setItems}
      idGen={() => Date.now()}
      searchFn={(i, q) => {
        const code = String(i.code ?? "").toLowerCase();
        const type = String(i.type ?? "").toLowerCase();
        const warehouseName = String(getWarehouseName(i.warehouseId) ?? "").toLowerCase();

        return (
          code.includes(q) ||
          type.includes(q) ||
          warehouseName.includes(q)
        );
      }}
      onSaveItem={async (item) => {
        const warehouseId = Number(item.warehouseId ?? 0);
        const code = item.code?.trim().toUpperCase();
        const type = item.type?.trim();

        if (!warehouseId) {
          throw new Error("Vui lòng chọn kho");
        }

        if (!code) {
          throw new Error("Mã vị trí không được để trống");
        }

        if (!type) {
          throw new Error("Loại vị trí không được để trống");
        }

        if (item._id) {
          await updateBin(item._id, {
            warehouseId,
            code,
            type,
          });

          return {
            _id: item._id,
            warehouseId,
            code,
            type,
          };
        }

        const created = await createBin({
          warehouseId,
          code,
          type,
        });

        return {
          _id: created.id,
          warehouseId,
          code,
          type,
        };
      }}
      onDeleteItem={async (id) => {
        await deleteBin(id);
      }}
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
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
              {i.code}
            </span>
          ),
        },
        { key: "type", label: "Loại", render: (i) => i.type },
      ]}
      renderForm={(item, onChange) => {
        const b = item as Partial<BinRow>;

        return (
          <>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Kho *</label>
              <select
                value={b.warehouseId || ""}
                onChange={(e) =>
                  onChange({
                    warehouseId: Number(e.target.value),
                  } as Partial<BinRow>)
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
                <label className="block text-sm text-gray-600 mb-1">Mã vị trí *</label>
                <input
                  value={b.code || ""}
                  onChange={(e) =>
                    onChange({
                      code: e.target.value.toUpperCase(),
                    } as Partial<BinRow>)
                  }
                  className={inputCls}
                  placeholder="VD: A-01-01"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Loại *</label>
                <input
                  value={b.type || ""}
                  onChange={(e) =>
                    onChange({ type: e.target.value } as Partial<BinRow>)
                  }
                  className={inputCls}
                  placeholder="VD: rack / shelf / cold / floor"
                />
              </div>
            </div>
          </>
        );
      }}
    />
  );
}
// ═══════════ PROJECTS ═══════════
// DB: Projects(ProjectID, Code, Name, StartDate, EndDate, Budget, Status)
// ═══════════ PROJECTS ═══════════
// DB: Projects(ProjectID, Code, Name, StartDate, EndDate, Budget, Status)
interface ProjectItem extends BaseItem {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  budget: number | null;
  status: string;
}

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

function ProjectsTab() {
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadProjects = async () => {
      try {
        const data = await getProjects();
        const rows = Array.isArray(data) ? data : (data.items ?? []);

        if (!mounted) return;

        setItems(
          rows.map((p) => ({
            _id: Number(p.projectId ?? 0),
            code: p.code ?? "",
            name: p.name ?? "",
            startDate: p.startDate ? String(p.startDate).slice(0, 10) : "",
            endDate: p.endDate ? String(p.endDate).slice(0, 10) : "",
            budget: p.budget ?? null,
            status: p.status ?? "Planned",
          }))
        );
      } catch (error) {
        console.error(error);
        toast.error("Không tải được danh sách dự án");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProjects();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-500">Đang tải dự án...</div>;
  }

  return (
    <GenericTable
      items={items}
      setItems={setItems}
      idGen={() => Date.now()}
      searchFn={(i, q) => {
        const name = String(i.name ?? "").toLowerCase();
        const code = String(i.code ?? "").toLowerCase();
        return name.includes(q) || code.includes(q);
      }}
      onSaveItem={async (item) => {
        const code = item.code?.trim().toUpperCase();
        const name = item.name?.trim();
        const startDate = item.startDate?.trim() || "";
        const endDate = item.endDate?.trim() || "";
        const budget = item.budget ?? null;
        const status = item.status?.trim() || "Planned";

        if (!code) {
          throw new Error("Mã dự án không được để trống");
        }

        if (!name) {
          throw new Error("Tên dự án không được để trống");
        }

        const payload = {
          code,
          name,
          startDate: startDate || null,
          endDate: endDate || null,
          budget,
          status,
        };

        if (item._id) {
          await updateProject(item._id, payload);

          return {
            _id: item._id,
            code,
            name,
            startDate,
            endDate,
            budget,
            status,
          };
        }

        const created = await createProject(payload);

        return {
          _id: created.id,
          code,
          name,
          startDate,
          endDate,
          budget,
          status,
        };
      }}
      onDeleteItem={async (id) => {
        await deleteProject(id);
      }}
      columns={[
        {
          key: "code",
          label: "Mã dự án",
          render: (i) => (
            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
              {i.code}
            </span>
          ),
        },
        { key: "name", label: "Tên dự án", render: (i) => i.name },
        { key: "start", label: "Ngày bắt đầu", render: (i) => i.startDate || "—" },
        { key: "end", label: "Ngày kết thúc", render: (i) => i.endDate || "—" },
        {
          key: "budget",
          label: "Ngân sách",
          render: (i) => (i.budget != null ? `${(i.budget / 1e9).toFixed(1)} tỷ` : "—"),
        },
        {
          key: "status",
          label: "Trạng thái",
          render: (i) => (
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${
                statusProjCls[i.status] || "bg-gray-100 text-gray-600"
              }`}
            >
              {statusProjLabel[i.status] || i.status}
            </span>
          ),
        },
      ]}
      renderForm={(item, onChange) => {
        const p = item as Partial<ProjectItem>;

        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Mã dự án *
                </label>
                <input
                  value={p.code || ""}
                  onChange={(e) =>
                    onChange({
                      code: e.target.value.toUpperCase(),
                    } as Partial<ProjectItem>)
                  }
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Trạng thái
                </label>
                <select
                  value={p.status || "Active"}
                  onChange={(e) =>
                    onChange({ status: e.target.value } as Partial<ProjectItem>)
                  }
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
                value={p.name || ""}
                onChange={(e) =>
                  onChange({ name: e.target.value } as Partial<ProjectItem>)
                }
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
                  value={p.startDate || ""}
                  onChange={(e) =>
                    onChange({ startDate: e.target.value } as Partial<ProjectItem>)
                  }
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Ngày kết thúc
                </label>
                <input
                  type="date"
                  value={p.endDate || ""}
                  onChange={(e) =>
                    onChange({ endDate: e.target.value } as Partial<ProjectItem>)
                  }
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
                value={p.budget ?? ""}
                onChange={(e) =>
                  onChange({
                    budget: e.target.value ? Number(e.target.value) : null,
                  } as Partial<ProjectItem>)
                }
                className={inputCls}
              />
            </div>
          </>
        );
      }}
    />
  );
}

// ═══════════ MAIN ═══════════
export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("roles");

  const renderTab = () => {
    switch (activeTab) {
      case "roles": return <RolesTab />;
      case "categories": return <CategoriesTab />;
      case "reasons": return <ReasonsTab />;
      case "suppliers": return <SuppliersTab />;
      case "warehouses": return <WarehousesTab />;
      case "bins": return <BinsTab />;
      case "projects": return <ProjectsTab />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-gray-900">Dữ liệu danh mục</h1>
        <p className="text-gray-500 mt-1">Quản lý dữ liệu tham chiếu: vai trò, danh mục, nhà cung cấp, kho hàng, dự án</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${isActive ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <Icon className="w-4 h-4" />{tab.label}
            </button>
          );
        })}
      </div>

      {renderTab()}
    </div>
  );
}
