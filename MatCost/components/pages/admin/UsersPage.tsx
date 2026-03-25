"use client";
import { useState, useMemo, useEffect } from "react";
import { Search, Filter, ArrowUpDown, Trash2, Plus, Edit2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { getRoles, getUsers, RoleItem,updateUserRole,updateUser,deleteUser as deleteUserApi } from "@/services/admin-users";



// Matches DB: Users table
interface UserItem {
  userId: number;
  username: string;
  roleId: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  status: boolean; // bit: true=active, false=inactive
}



const getRoleName = (roleId: number, roles: RoleItem[]) =>
  roles.find((r) => r.roleId === roleId)?.roleName || "Unknown";

const emptyForm: Omit<UserItem, "userId"> = { username: "", roleId: 3, fullName: "", email: "", phoneNumber: "", status: true };

export default function UsersPage() {
const [roles, setRoles] = useState<RoleItem[]>([]);
const [loadingRoles, setLoadingRoles] = useState(false);
const [users, setUsers] = useState<UserItem[]>([]);
const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [sortField, setSortField] = useState<"fullName" | "username">("fullName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const perPage = 6;
// load roles
useEffect(() => {
  const loadRoles = async () => {
    try {
      setLoadingRoles(true);
      const data = await getRoles();
      setRoles(data);
    } catch (err) {
      console.error("Load roles failed", err);
      toast.error(err instanceof Error ? err.message : "Không load được danh sách vai trò");
    } finally {
      setLoadingRoles(false);
    }
  };

  loadRoles();
}, []);


// load users
useEffect(() => {
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await getUsers({
        page: 1,
        pageSize: 100,
      });
      setUsers(res.items);
    } catch (err) {
      console.error("Load users failed", err);
      toast.error(err instanceof Error ? err.message : "Không load được danh sách người dùng");
    } finally {
      setLoadingUsers(false);
    }
  };

  loadUsers();
}, []);
//set defau role
useEffect(() => {
  if (roles.length > 0) {
    setForm((prev) => ({
      ...prev,
      roleId: roles[0].roleId,
    }));
  }
}, [roles]);
  const filtered = useMemo(() => {
    let res = users.filter((u) => {
      const matchSearch = u.fullName.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || (filterStatus === "active" ? u.status : !u.status);
      const matchRole = filterRole === "all" || u.roleId === Number(filterRole);
      return matchSearch && matchStatus && matchRole;
    });
    res.sort((a, b) => {
      const v = sortDir === "asc" ? 1 : -1;
      return a[sortField] > b[sortField] ? v : -v;
    });
    return res;
  }, [users, search, filterStatus, filterRole, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (field: "fullName" | "username") => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const openAdd = () => { setForm({ ...emptyForm }); setEditId(null); setModalOpen(true); };
  const openEdit = (u: UserItem) => { setForm({ username: u.username, roleId: u.roleId, fullName: u.fullName, email: u.email, phoneNumber: u.phoneNumber, status: u.status }); setEditId(u.userId); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditId(null); };

  const save = async () => {
  if (!form.username || !form.fullName) {
    toast.error("Username và Họ tên là bắt buộc");
    return;
  }

  try {
    if (editId !== null) {
      await updateUser(editId, {
        fullName: form.fullName,
        email: form.email,
        phoneNumber: form.phoneNumber,
        roleId: form.roleId,
        status: form.status,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.userId === editId ? { ...u, ...form } : u
        )
      );

      toast.success("Cập nhật người dùng thành công");
    } else {
      toast.error("Hiện chưa có API thêm người dùng");
      return;
    }

    closeModal();
  } catch (err) {
    console.error("Update user failed", err);
    toast.error(err instanceof Error ? err.message : "Cập nhật người dùng thất bại");
  }
};

  const handleDeleteUser = async (user: UserItem) => {
  const roleName = getRoleName(user.roleId, roles);

  if (roleName === "Admin") {
    toast.error("Không được xóa tài khoản Admin");
    return;
  }

  const ok = window.confirm(`Bạn có chắc muốn xóa người dùng "${user.fullName}" không?`);
  if (!ok) return;

  try {
    await deleteUserApi(user.userId);
    setUsers((prev) => prev.filter((u) => u.userId !== user.userId));
    toast.success("Xóa người dùng thành công");
  } catch (err) {
    console.error("Delete user failed", err);
    toast.error(err instanceof Error ? err.message : "Xóa người dùng thất bại");
  }
};
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-gray-900">Quản lý người dùng</h1>
          <p className="text-gray-500 mt-1">Quản lý tài khoản và phân quyền hệ thống</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm theo tên, username hoặc email..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-sm outline-none">
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Ngừng hoạt động</option>
            </select>
            <select value={filterRole} onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}>
  <option value="all">Tất cả vai trò</option>
  {roles.map((r) => (
    <option key={r.roleId} value={r.roleId}>
      {r.roleName}
    </option>
  ))}
</select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort("fullName")}>
                  <span className="flex items-center gap-1">Họ và tên <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort("username")}>
                  <span className="flex items-center gap-1">Tên đăng nhập <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider">Điện thoại</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider">Vai trò</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map((u) => (
                <tr key={u.userId} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">{u.fullName.charAt(0)}</div>
                      <span className="text-sm text-gray-900">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{u.username}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{u.email}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{u.phoneNumber}</td>
                  <td className="px-5 py-3">
                   <select
  value={u.roleId}
  onChange={async (e) => {
    const newRoleId = Number(e.target.value);

    try {
      await updateUserRole(u.userId, newRoleId);

      setUsers((prev) =>
        prev.map((x) =>
          x.userId === u.userId ? { ...x, roleId: newRoleId } : x
        )
      );

      toast.success(`Đã cập nhật vai trò thành ${getRoleName(newRoleId, roles)}`);
    } catch (err) {
      console.error("Update role failed", err);
      toast.error(err instanceof Error ? err.message : "Cập nhật vai trò thất bại");
    }
  }}
  className="border border-gray-200 rounded-lg px-2 py-1 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
>
  {roles.map((r) => (
    <option key={r.roleId} value={r.roleId}>
      {r.roleName}
    </option>
  ))}
</select>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => {
                        setUsers((prev) => prev.map((x) => x.userId === u.userId ? { ...x, status: !x.status } : x));
                        toast.success(`Người dùng đã ${!u.status ? "kích hoạt" : "ngừng hoạt động"}`);
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs cursor-pointer transition-colors ${u.status ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                      {u.status ? "Hoạt động" : "Ngừng HĐ"}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors" title="Chỉnh sửa">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {/* <button
  onClick={() => handleDeleteUser(u)}
  disabled={getRoleName(u.roleId, roles) === "Admin"}
  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
  title={getRoleName(u.roleId, roles) === "Admin" ? "Không thể xóa Admin" : "Xóa"}
>
  <Trash2 className="w-4 h-4" />
</button> */}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
          <span>Hiển thị {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} / {filtered.length} bản ghi</span>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-gray-900">{editId !== null ? "Chỉnh sửa người dùng" : "Thêm người dùng"}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tên đăng nhập *</label>
                <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Họ và tên *</label>
                <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Email</label>
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Điện thoại</label>
                  <input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Vai trò</label>
                 <select
  value={form.roleId}
  onChange={(e) =>
    setForm({ ...form, roleId: Number(e.target.value) })
  }
>
  {roles.map((r) => (
    <option key={r.roleId} value={r.roleId}>
      {r.roleName}
    </option>
  ))}
</select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Trạng thái</label>
                  <select value={form.status ? "true" : "false"} onChange={(e) => setForm({ ...form, status: e.target.value === "true" })} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none text-sm">
                    <option value="true">Hoạt động</option>
                    <option value="false">Ngừng hoạt động</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Hủy</button>
              <button onClick={save} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}