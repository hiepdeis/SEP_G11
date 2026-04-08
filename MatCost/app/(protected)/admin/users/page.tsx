"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  Trash2,
  Plus,
  Edit2,
  X,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import {
  getRoles,
  getUsers,
  RoleItem,
  updateUserRole,
  updateUser,
  deleteUser as deleteUserApi,
} from "@/services/admin-users";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { useTranslation } from "react-i18next";

interface UserItem {
  userId: number;
  username: string;
  roleId: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  status: boolean;
}

const getRoleName = (roleId: number, roles: RoleItem[]) =>
  roles.find((r) => r.roleId === roleId)?.roleName || "Unknown";

const isAdminRole = (role: RoleItem) =>
  role.roleName.trim().toLowerCase() === "admin";

const getAdminRoleId = (roles: RoleItem[]) => roles.find(isAdminRole)?.roleId;

const getVisibleRoles = (roles: RoleItem[]) =>
  roles.filter((role) => !isAdminRole(role));

const emptyForm: Omit<UserItem, "userId"> = {
  username: "",
  roleId: 0,
  fullName: "",
  email: "",
  phoneNumber: "",
  status: true,
};

const inputCls =
  "w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all text-sm font-medium text-gray-900";

export default function UsersPage() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [sortField, setSortField] = useState<"fullName" | "username">(
    "fullName",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const perPage = 8;

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [rolesData, usersData] = await Promise.all([
          getRoles(),
          getUsers({ page: 1, pageSize: 1000 }),
        ]);
        setRoles(rolesData);
        setUsers(usersData.items);
        const defaultRole =
          rolesData.find((r) => !isAdminRole(r)) ?? rolesData[0];
        setForm((f) => ({ ...f, roleId: defaultRole?.roleId ?? 0 }));
      } catch (err) {
        toast.error(t("Failed to load data"));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const filtered = useMemo(() => {
    const adminId = getAdminRoleId(roles);
    let res = users.filter((u) => {
      if (adminId !== undefined && u.roleId === adminId) return false;
      const matchSearch =
        u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" ? u.status : !u.status);
      const matchRole = filterRole === "all" || u.roleId === Number(filterRole);
      return matchSearch && matchStatus && matchRole;
    });
    res.sort((a, b) => {
      const v = sortDir === "asc" ? 1 : -1;
      return a[sortField] > b[sortField] ? v : -v;
    });
    return res;
  }, [users, roles, search, filterStatus, filterRole, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (field: "fullName" | "username") => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const openEdit = (u: UserItem) => {
    setForm({
      username: u.username,
      roleId: u.roleId,
      fullName: u.fullName,
      email: u.email,
      phoneNumber: u.phoneNumber,
      status: u.status,
    });
    setEditId(u.userId);
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.username || !form.fullName) {
      toast.error(t("Please fill in all information"));
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
          prev.map((u) => (u.userId === editId ? { ...u, ...form } : u)),
        );
        toast.success(t("Update Successful"));
      }
      setModalOpen(false);
    } catch (e) {
      toast.error(t("Update Failed"));
    }
  };

  if (loading)
    return <div className="p-10 text-center text-gray-500">{t("Loading...")}</div>;

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("User Management")} />
        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  {t("Users")}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {t("Manage accounts & system access permissions")}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3 mt-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder={t("Search by name, username, email...")}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setPage(1);
                  }}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white font-medium"
                >
                  <option value="all">{t("All status")}</option>
                  <option value="active">{t("Active")}</option>
                  <option value="inactive">{t("Inactive")}</option>
                </select>
                <select
                  value={filterRole}
                  onChange={(e) => {
                    setFilterRole(e.target.value);
                    setPage(1);
                  }}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white font-medium"
                >
                  <option value="all">{t("All roles")}</option>
                  {getVisibleRoles(roles).map((r) => (
                    <option key={r.roleId} value={r.roleId}>
                      {r.roleName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                      <th
                        className="px-6 py-4 cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => toggleSort("fullName")}
                      >
                        <span className="flex items-center gap-1.5">
                          {t("Full Name")} <ArrowUpDown className="w-3 h-3" />
                        </span>
                      </th>
                      <th
                        className="px-6 py-4 cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => toggleSort("username")}
                      >
                        <span className="flex items-center gap-1.5">
                          {t("Username")} <ArrowUpDown className="w-3 h-3" />
                        </span>
                      </th>
                      <th className="px-6 py-4">{t("Contact")}</th>
                      <th className="px-6 py-4">{t("Role")}</th>
                      <th className="px-6 py-4">{t("Status")}</th>
                      <th className="px-6 py-4 text-center">{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginated.map((u) => (
                      <tr
                        key={u.userId}
                        className="hover:bg-gray-50/50 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-blue-100">
                              {u.fullName.charAt(0)}
                            </div>
                            <span className="text-sm font-bold text-gray-900">
                              {u.fullName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-gray-500">
                          {u.username}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-900 font-medium">
                            {u.email}
                          </div>
                          <div className="text-[10px] text-gray-400 font-medium">
                            {u.phoneNumber || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                            <ShieldCheck className="w-3 h-3" />{" "}
                            {getRoleName(u.roleId, roles)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.status ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
                          >
                            <span
                              className={`w-1 h-1 rounded-full ${u.status ? "bg-emerald-500" : "bg-gray-400"}`}
                            />
                            {u.status ? t("Active") : t("Suspended")}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => openEdit(u)}
                              className="p-2 rounded-xl hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center text-xs font-medium text-gray-500">
                <span>
                  {t("Showing")} {Math.min(filtered.length, perPage)} /{" "}
                  {filtered.length} {t("users")}
                </span>
                <div className="flex gap-1">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center px-4 font-bold text-gray-900">
                    {page} / {totalPages}
                  </div>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                  <UserCog className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">
                    {t("Edit User")}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium tracking-wide">
                    {t("Update permissions and personal information")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                  {t("Full Name")} *
                </label>
                <input
                  value={form.fullName}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                    {t("Username")}
                  </label>
                  <input
                    value={form.username}
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-100 text-gray-400 text-sm font-bold cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                    {t("Phone")}
                  </label>
                  <input
                    value={form.phoneNumber}
                    onChange={(e) =>
                      setForm({ ...form, phoneNumber: e.target.value })
                    }
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                  {t("Email")}
                </label>
                <input
                  value={form.email}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-100 text-gray-400 text-sm font-bold cursor-not-allowed"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                    {t("Role")}
                  </label>
                  <select
                    value={form.roleId}
                    onChange={(e) =>
                      setForm({ ...form, roleId: Number(e.target.value) })
                    }
                    className={inputCls}
                  >
                    {roles.map((r) => (
                      <option key={r.roleId} value={r.roleId}>
                        {r.roleName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                    {t("Status")}
                  </label>
                  <select
                    value={form.status ? "true" : "false"}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value === "true" })
                    }
                    className={inputCls}
                  >
                    <option value="true">{t("Active")}</option>
                    <option value="false">{t("Suspended")}</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                {t("Cancel")}
              </button>
              <button
                onClick={save}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
              >
                {t("Save Changes")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
