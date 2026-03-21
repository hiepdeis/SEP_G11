"use client";
import { useState, useMemo } from "react";
import {
  Search, Plus, Edit2, Trash2, X, Layers, ClipboardList,
  Truck, Warehouse, MapPin, ChevronLeft, ChevronRight, Shield, FolderKanban,
} from "lucide-react";
import { toast } from "sonner";

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
  items, setItems, columns, renderForm, idGen, searchFn,
}: {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  columns: { key: string; label: string; render: (item: T) => React.ReactNode }[];
  renderForm: (item: Partial<T>, onChange: (patch: Partial<T>) => void) => React.ReactNode;
  idGen: () => number;
  searchFn: (item: T, q: string) => boolean;
}) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<T> | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 7;

  const filtered = useMemo(() => items.filter((i) => searchFn(i, search.toLowerCase())), [items, search, searchFn]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const openAdd = () => { setEditing({} as Partial<T>); setModalOpen(true); };
  const openEdit = (item: T) => { setEditing({ ...item }); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const save = () => {
    if (!editing) return;
    if (editing._id) {
      setItems((prev) => prev.map((i) => (i._id === editing._id ? { ...i, ...editing } as T : i)));
      toast.success("Cập nhật thành công");
    } else {
      setItems((prev) => [...prev, { ...editing, _id: idGen() } as T]);
      toast.success("Thêm mới thành công");
    }
    closeModal();
  };

  const remove = (id: number) => {
    setItems((prev) => prev.filter((i) => i._id !== id));
    toast.success("Đã xóa");
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm kiếm..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
          <Plus className="w-4 h-4" /> Thêm mới
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider">{c.label}</th>
                ))}
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="px-5 py-8 text-center text-gray-400 text-sm">Không có dữ liệu</td></tr>
              ) : paginated.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50/50">
                  {columns.map((c) => (
                    <td key={c.key} className="px-5 py-3 text-sm text-gray-700">{c.render(item)}</td>
                  ))}
                  <td className="px-5 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => remove(item._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
          <span>{filtered.length} bản ghi</span>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {modalOpen && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-gray-900">{editing._id ? "Chỉnh sửa" : "Thêm mới"}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {renderForm(editing, (patch) => setEditing({ ...editing, ...patch }))}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Hủy</button>
              <button onClick={save} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Lưu</button>
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
const mockRoles: Role[] = [
  { _id: 1, roleName: "Admin" },
  { _id: 2, roleName: "WarehouseManager" },
  { _id: 3, roleName: "WarehouseStaff" },
  { _id: 4, roleName: "Accountant" },
  { _id: 5, roleName: "Viewer" },
];
function RolesTab() {
  const [items, setItems] = useState(mockRoles);
  return (
    <GenericTable items={items} setItems={setItems} idGen={() => Date.now()}
      searchFn={(i, q) => i.roleName.toLowerCase().includes(q)}
      columns={[
        { key: "id", label: "Mã vai trò", render: (i) => <span className="text-xs text-gray-500">#{i._id}</span> },
        { key: "name", label: "Tên vai trò", render: (i) => <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{i.roleName}</span> },
      ]}
      renderForm={(item, onChange) => (
        <div>
          <label className="block text-sm text-gray-600 mb-1">Tên vai trò *</label>
          <input value={(item as Partial<Role>).roleName || ""} onChange={(e) => onChange({ roleName: e.target.value } as Partial<Role>)} className={inputCls} placeholder="VD: Admin" />
        </div>
      )}
    />
  );
}

// ═══════════ MATERIAL CATEGORIES ═══════════
// DB: MaterialCategories(CategoryID, Code, Name, Description)
interface Category extends BaseItem { code: string; name: string; description: string; }
const mockCategories: Category[] = [
  { _id: 1, code: "RAW", name: "Raw Materials", description: "Nguyên vật liệu thô" },
  { _id: 2, code: "PKG", name: "Packaging", description: "Vật liệu đóng gói" },
  { _id: 3, code: "CHM", name: "Chemicals", description: "Hóa chất công nghiệp" },
  { _id: 4, code: "SPR", name: "Spare Parts", description: "Phụ tùng thay thế" },
  { _id: 5, code: "ELC", name: "Electronics", description: "Linh kiện điện tử" },
];
function CategoriesTab() {
  const [items, setItems] = useState(mockCategories);
  return (
    <GenericTable items={items} setItems={setItems} idGen={() => Date.now()}
      searchFn={(i, q) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q)}
      columns={[
        { key: "code", label: "Mã", render: (i) => <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{i.code}</span> },
        { key: "name", label: "Tên danh mục", render: (i) => i.name },
        { key: "desc", label: "Mô tả", render: (i) => i.description },
      ]}
      renderForm={(item, onChange) => {
        const c = item as Partial<Category>;
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-600 mb-1">Mã *</label><input value={c.code || ""} onChange={(e) => onChange({ code: e.target.value.toUpperCase() } as Partial<Category>)} className={inputCls} /></div>
              <div><label className="block text-sm text-gray-600 mb-1">Tên *</label><input value={c.name || ""} onChange={(e) => onChange({ name: e.target.value } as Partial<Category>)} className={inputCls} /></div>
            </div>
            <div><label className="block text-sm text-gray-600 mb-1">Mô tả</label><input value={c.description || ""} onChange={(e) => onChange({ description: e.target.value } as Partial<Category>)} className={inputCls} /></div>
          </>
        );
      }}
    />
  );
}

// ═══════════ ADJUSTMENT REASONS ═══════════
// DB: AdjustmentReasons(ReasonID, Code, Name, Description, IsActive)
interface AdjReason extends BaseItem { code: string; name: string; description: string; isActive: boolean; }
const mockReasons: AdjReason[] = [
  { _id: 1, code: "DMG", name: "Damaged Goods", description: "Hàng bị hư hỏng", isActive: true },
  { _id: 2, code: "CYC", name: "Cycle Count Adjustment", description: "Điều chỉnh sau kiểm kê", isActive: true },
  { _id: 3, code: "FND", name: "Found Stock", description: "Phát hiện hàng tồn", isActive: true },
  { _id: 4, code: "EXP", name: "Expired", description: "Hàng hết hạn sử dụng", isActive: true },
  { _id: 5, code: "RET", name: "Return from Production", description: "Trả lại từ sản xuất", isActive: false },
];
function ReasonsTab() {
  const [items, setItems] = useState(mockReasons);
  return (
    <GenericTable items={items} setItems={setItems} idGen={() => Date.now()}
      searchFn={(i, q) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q)}
      columns={[
        { key: "code", label: "Mã", render: (i) => <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{i.code}</span> },
        { key: "name", label: "Tên lý do", render: (i) => i.name },
        { key: "desc", label: "Mô tả", render: (i) => i.description },
        { key: "active", label: "Trạng thái", render: (i) => <span className={`px-2 py-0.5 rounded-full text-xs ${i.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{i.isActive ? "Hoạt động" : "Ngừng"}</span> },
      ]}
      renderForm={(item, onChange) => {
        const r = item as Partial<AdjReason>;
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-600 mb-1">Mã *</label><input value={r.code || ""} onChange={(e) => onChange({ code: e.target.value.toUpperCase() } as Partial<AdjReason>)} className={inputCls} /></div>
              <div><label className="block text-sm text-gray-600 mb-1">Tên *</label><input value={r.name || ""} onChange={(e) => onChange({ name: e.target.value } as Partial<AdjReason>)} className={inputCls} /></div>
            </div>
            <div><label className="block text-sm text-gray-600 mb-1">Mô tả</label><input value={r.description || ""} onChange={(e) => onChange({ description: e.target.value } as Partial<AdjReason>)} className={inputCls} /></div>
            <div><label className="block text-sm text-gray-600 mb-1">Trạng thái</label>
              <select value={r.isActive === false ? "false" : "true"} onChange={(e) => onChange({ isActive: e.target.value === "true" } as Partial<AdjReason>)} className={inputCls}>
                <option value="true">Hoạt động</option><option value="false">Ngừng hoạt động</option>
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
interface SupplierItem extends BaseItem { code: string; name: string; taxCode: string; address: string; }
const mockSuppliers: SupplierItem[] = [
  { _id: 1, code: "SUP-001", name: "Viet Steel Corp", taxCode: "0301234567", address: "KCN Biên Hòa, Đồng Nai" },
  { _id: 2, code: "SUP-002", name: "Saigon Chemical", taxCode: "0302345678", address: "Q.7, TP.HCM" },
  { _id: 3, code: "SUP-003", name: "Dai Phat Packaging", taxCode: "0303456789", address: "KCN Tân Bình, TP.HCM" },
  { _id: 4, code: "SUP-004", name: "Hoa Sen Group", taxCode: "3700456789", address: "Bình Dương" },
];
function SuppliersTab() {
  const [items, setItems] = useState(mockSuppliers);
  return (
    <GenericTable items={items} setItems={setItems} idGen={() => Date.now()}
      searchFn={(i, q) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || i.taxCode.includes(q)}
      columns={[
        { key: "code", label: "Mã NCC", render: (i) => <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{i.code}</span> },
        { key: "name", label: "Tên nhà cung cấp", render: (i) => i.name },
        { key: "tax", label: "Mã số thuế", render: (i) => i.taxCode || "—" },
        { key: "address", label: "Địa chỉ", render: (i) => <span className="text-xs">{i.address}</span> },
      ]}
      renderForm={(item, onChange) => {
        const s = item as Partial<SupplierItem>;
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-600 mb-1">Mã *</label><input value={s.code || ""} onChange={(e) => onChange({ code: e.target.value.toUpperCase() } as Partial<SupplierItem>)} className={inputCls} /></div>
              <div><label className="block text-sm text-gray-600 mb-1">Tên *</label><input value={s.name || ""} onChange={(e) => onChange({ name: e.target.value } as Partial<SupplierItem>)} className={inputCls} /></div>
            </div>
            <div><label className="block text-sm text-gray-600 mb-1">Mã số thuế</label><input value={s.taxCode || ""} onChange={(e) => onChange({ taxCode: e.target.value } as Partial<SupplierItem>)} className={inputCls} placeholder="MST" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">Địa chỉ</label><input value={s.address || ""} onChange={(e) => onChange({ address: e.target.value } as Partial<SupplierItem>)} className={inputCls} /></div>
          </>
        );
      }}
    />
  );
}

// ═══════════ WAREHOUSES ═══════════
// DB: Warehouses(WarehouseID, Name, Address)
interface WarehouseItem extends BaseItem { name: string; address: string; }
const mockWarehouses: WarehouseItem[] = [
  { _id: 1, name: "Kho chính Biên Hòa", address: "KCN Biên Hòa, Đồng Nai" },
  { _id: 2, name: "Kho lạnh Q.9", address: "Q.9, TP.HCM" },
  { _id: 3, name: "Kho trung chuyển BD", address: "KCN Mỹ Phước, Bình Dương" },
  { _id: 4, name: "Kho lưu trữ Long An", address: "KCN Long Hậu, Long An" },
];
function WarehousesTab() {
  const [items, setItems] = useState(mockWarehouses);
  return (
    <GenericTable items={items} setItems={setItems} idGen={() => Date.now()}
      searchFn={(i, q) => i.name.toLowerCase().includes(q) || i.address.toLowerCase().includes(q)}
      columns={[
        { key: "id", label: "Mã kho", render: (i) => <span className="text-xs text-gray-500">#{i._id}</span> },
        { key: "name", label: "Tên kho", render: (i) => i.name },
        { key: "address", label: "Địa chỉ", render: (i) => i.address },
      ]}
      renderForm={(item, onChange) => {
        const w = item as Partial<WarehouseItem>;
        return (
          <>
            <div><label className="block text-sm text-gray-600 mb-1">Tên kho *</label><input value={w.name || ""} onChange={(e) => onChange({ name: e.target.value } as Partial<WarehouseItem>)} className={inputCls} /></div>
            <div><label className="block text-sm text-gray-600 mb-1">Địa chỉ</label><input value={w.address || ""} onChange={(e) => onChange({ address: e.target.value } as Partial<WarehouseItem>)} className={inputCls} /></div>
          </>
        );
      }}
    />
  );
}

// ═══════════ BIN LOCATIONS ═══════════
// DB: BinLocations(BinID, WarehouseID, Code, Type)
interface BinItem extends BaseItem { warehouseId: number; code: string; type: string; }
const mockBins: BinItem[] = [
  { _id: 1, warehouseId: 1, code: "A-01-01", type: "rack" },
  { _id: 2, warehouseId: 1, code: "A-01-02", type: "rack" },
  { _id: 3, warehouseId: 1, code: "B-02-01", type: "shelf" },
  { _id: 4, warehouseId: 2, code: "COLD-01", type: "cold" },
  { _id: 5, warehouseId: 3, code: "FLOOR-01", type: "floor" },
  { _id: 6, warehouseId: 1, code: "A-02-01", type: "rack" },
];
const getWhName = (id: number) => mockWarehouses.find((w) => w._id === id)?.name || `WH#${id}`;
const typeCls: Record<string, string> = { rack: "bg-blue-50 text-blue-700", shelf: "bg-purple-50 text-purple-700", floor: "bg-amber-50 text-amber-700", cold: "bg-cyan-50 text-cyan-700" };
const typeLabel: Record<string, string> = { rack: "Giá kệ", shelf: "Kệ đơn", floor: "Sàn", cold: "Kho lạnh" };

function BinsTab() {
  const [items, setItems] = useState(mockBins);
  return (
    <GenericTable items={items} setItems={setItems} idGen={() => Date.now()}
      searchFn={(i, q) => i.code.toLowerCase().includes(q) || (i.type || "").toLowerCase().includes(q)}
      columns={[
        { key: "code", label: "Mã vị trí", render: (i) => <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{i.code}</span> },
        { key: "wh", label: "Kho hàng", render: (i) => getWhName(i.warehouseId) },
        { key: "type", label: "Loại", render: (i) => <span className={`px-2 py-0.5 rounded text-xs capitalize ${typeCls[i.type] || "bg-gray-100 text-gray-600"}`}>{typeLabel[i.type] || i.type || "—"}</span> },
      ]}
      renderForm={(item, onChange) => {
        const b = item as Partial<BinItem>;
        return (
          <>
            <div><label className="block text-sm text-gray-600 mb-1">Mã vị trí *</label><input value={b.code || ""} onChange={(e) => onChange({ code: e.target.value.toUpperCase() } as Partial<BinItem>)} className={inputCls} placeholder="A-01-01" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-600 mb-1">Kho hàng *</label>
                <select value={b.warehouseId || ""} onChange={(e) => onChange({ warehouseId: Number(e.target.value) } as Partial<BinItem>)} className={inputCls}>
                  <option value="">Chọn kho...</option>
                  {mockWarehouses.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
                </select>
              </div>
              <div><label className="block text-sm text-gray-600 mb-1">Loại</label>
                <select value={b.type || ""} onChange={(e) => onChange({ type: e.target.value } as Partial<BinItem>)} className={inputCls}>
                  <option value="">Không có</option>
                  <option value="rack">Giá kệ</option><option value="shelf">Kệ đơn</option><option value="floor">Sàn</option><option value="cold">Kho lạnh</option>
                </select>
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
interface ProjectItem extends BaseItem { code: string; name: string; startDate: string; endDate: string; budget: number | null; status: string; }
const mockProjects: ProjectItem[] = [
  { _id: 1, code: "PRJ-001", name: "Nhà máy thép Hòa Phát", startDate: "2026-01-15", endDate: "2026-12-31", budget: 5000000000, status: "Active" },
  { _id: 2, code: "PRJ-002", name: "Cầu Thủ Thiêm 4", startDate: "2025-06-01", endDate: "2027-06-30", budget: 12000000000, status: "Active" },
  { _id: 3, code: "PRJ-003", name: "Khu dân cư Vạn Phúc", startDate: "2025-03-01", endDate: "2026-03-01", budget: 3000000000, status: "Completed" },
  { _id: 4, code: "PRJ-004", name: "Mở rộng KCN Long Hậu", startDate: "2026-04-01", endDate: "2027-12-31", budget: 8000000000, status: "Planned" },
];
const statusProjCls: Record<string, string> = { Active: "bg-emerald-50 text-emerald-700", Completed: "bg-blue-50 text-blue-700", Planned: "bg-amber-50 text-amber-700", Cancelled: "bg-red-50 text-red-700" };
const statusProjLabel: Record<string, string> = { Active: "Đang thực hiện", Completed: "Hoàn thành", Planned: "Kế hoạch", Cancelled: "Hủy" };

function ProjectsTab() {
  const [items, setItems] = useState(mockProjects);
  return (
    <GenericTable items={items} setItems={setItems} idGen={() => Date.now()}
      searchFn={(i, q) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q)}
      columns={[
        { key: "code", label: "Mã dự án", render: (i) => <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{i.code}</span> },
        { key: "name", label: "Tên dự án", render: (i) => i.name },
        { key: "start", label: "Ngày bắt đầu", render: (i) => i.startDate },
        { key: "end", label: "Ngày kết thúc", render: (i) => i.endDate },
        { key: "budget", label: "Ngân sách", render: (i) => i.budget ? `${(i.budget / 1e9).toFixed(1)} tỷ` : "—" },
        { key: "status", label: "Trạng thái", render: (i) => <span className={`px-2 py-0.5 rounded-full text-xs ${statusProjCls[i.status] || "bg-gray-100 text-gray-600"}`}>{statusProjLabel[i.status] || i.status}</span> },
      ]}
      renderForm={(item, onChange) => {
        const p = item as Partial<ProjectItem>;
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-600 mb-1">Mã dự án *</label><input value={p.code || ""} onChange={(e) => onChange({ code: e.target.value.toUpperCase() } as Partial<ProjectItem>)} className={inputCls} /></div>
              <div><label className="block text-sm text-gray-600 mb-1">Trạng thái</label>
                <select value={p.status || "Active"} onChange={(e) => onChange({ status: e.target.value } as Partial<ProjectItem>)} className={inputCls}>
                  <option value="Active">Đang thực hiện</option><option value="Planned">Kế hoạch</option><option value="Completed">Hoàn thành</option><option value="Cancelled">Hủy</option>
                </select>
              </div>
            </div>
            <div><label className="block text-sm text-gray-600 mb-1">Tên dự án *</label><input value={p.name || ""} onChange={(e) => onChange({ name: e.target.value } as Partial<ProjectItem>)} className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-600 mb-1">Ngày bắt đầu</label><input type="date" value={p.startDate || ""} onChange={(e) => onChange({ startDate: e.target.value } as Partial<ProjectItem>)} className={inputCls} /></div>
              <div><label className="block text-sm text-gray-600 mb-1">Ngày kết thúc</label><input type="date" value={p.endDate || ""} onChange={(e) => onChange({ endDate: e.target.value } as Partial<ProjectItem>)} className={inputCls} /></div>
            </div>
            <div><label className="block text-sm text-gray-600 mb-1">Ngân sách (VNĐ)</label><input type="number" value={p.budget ?? ""} onChange={(e) => onChange({ budget: e.target.value ? Number(e.target.value) : null } as Partial<ProjectItem>)} className={inputCls} /></div>
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