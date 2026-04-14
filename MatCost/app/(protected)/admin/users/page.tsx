"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  ArrowUpDown,
  Edit2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    return (
      <div className="p-10 text-center text-gray-500">{t("Loading...")}</div>
    );

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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder={t("Search by name, username, email...")}
                  className="pl-10 h-10 rounded-xl"
                />
              </div>
              <div className="flex gap-2">
                <Select
                  value={filterStatus}
                  onValueChange={(val) => {
                    setFilterStatus(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px] h-10 rounded-xl">
                    <SelectValue placeholder={t("All status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All status")}</SelectItem>
                    <SelectItem value="active">{t("Active")}</SelectItem>
                    <SelectItem value="inactive">{t("Inactive")}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filterRole}
                  onValueChange={(val) => {
                    setFilterRole(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[160px] h-10 rounded-xl">
                    <SelectValue placeholder={t("All roles")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All roles")}</SelectItem>
                    {getVisibleRoles(roles).map((r) => (
                      <SelectItem key={r.roleId} value={String(r.roleId)}>
                        {r.roleName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-6">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="px-6 py-4">
                      <Button
                        variant="ghost"
                        className="p-0 hover:bg-transparent text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-indigo-600"
                        onClick={() => toggleSort("fullName")}
                      >
                        {t("Full Name")}{" "}
                        <ArrowUpDown className="ml-1.5 w-3 h-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="px-6 py-4">
                      <Button
                        variant="ghost"
                        className="p-0 hover:bg-transparent text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-indigo-600"
                        onClick={() => toggleSort("username")}
                      >
                        {t("Username")}{" "}
                        <ArrowUpDown className="ml-1.5 w-3 h-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="px-6 py-4 text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                      {t("Contact")}
                    </TableHead>
                    <TableHead className="px-6 py-4 text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                      {t("Role")}
                    </TableHead>
                    <TableHead className="px-6 py-4 text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                      {t("Status")}
                    </TableHead>
                    <TableHead className="px-6 py-4 text-center text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                      {t("Actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((u) => (
                    <TableRow
                      key={u.userId}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-indigo-100">
                            {u.fullName.charAt(0)}
                          </div>
                          <span className="text-sm font-bold text-gray-900">
                            {u.fullName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-xs font-mono text-gray-500">
                        {u.username}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="text-xs text-gray-900 font-medium">
                          {u.email}
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium">
                          {u.phoneNumber || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge
                          variant="secondary"
                          className="bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"
                        >
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          {getRoleName(u.roleId, roles)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge
                          variant={u.status ? "default" : "secondary"}
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            u.status
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                              : "bg-gray-100 text-gray-500 border-gray-200"
                          }`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full mr-1.5 ${
                              u.status ? "bg-emerald-500" : "bg-gray-400"
                            }`}
                          />
                          {u.status ? t("Active") : t("Suspended")}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(u)}
                            className="h-8 w-8 rounded-xl text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center text-xs font-medium text-gray-500">
                <span>
                  {t("Showing")} {Math.min(filtered.length, perPage)} /{" "}
                  {filtered.length} {t("users")}
                </span>
                <div className="flex gap-1 items-center">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="h-8 w-8 rounded-lg"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center px-4 font-bold text-gray-900 border border-transparent">
                    {page} / {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="h-8 w-8 rounded-lg"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-0 shadow-lg bg-white">
          <DialogHeader className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                <UserCog className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="font-bold text-gray-900 text-lg">
                  {t("Edit User")}
                </DialogTitle>
                <p className="text-xs text-gray-500 font-medium tracking-wide">
                  {t("Update system access permissions and status")}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                  {t("Full Name")}
                </label>
                <p className="px-1 text-sm font-semibold text-gray-900">
                  {form.fullName}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                  {t("Username")}
                </label>
                <p className="px-1 text-sm font-mono text-gray-500">
                  {form.username}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                {t("Email")}
              </label>
              <p className="px-1 text-sm font-medium text-gray-600">
                {form.email}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-2 border-t border-gray-50">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest ml-1">
                  {t("Role")}
                </label>
                <Select
                  value={String(form.roleId)}
                  onValueChange={(val) =>
                    setForm({ ...form, roleId: Number(val) })
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder={t("Select a role")} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.roleId} value={String(r.roleId)}>
                        {r.roleName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest ml-1">
                  {t("Status")}
                </label>
                <Select
                  value={form.status ? "true" : "false"}
                  onValueChange={(val) =>
                    setForm({ ...form, status: val === "true" })
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder={t("Select status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t("Active")}</SelectItem>
                    <SelectItem value="false">{t("Suspended")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setModalOpen(false)}
              className="px-6 h-10 font-bold text-gray-500 hover:text-gray-700"
            >
              {t("Cancel")}
            </Button>
            <Button
              onClick={save}
              className="px-8 h-10 bg-indigo-600 text-white rounded-xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all"
            >
              {t("Save Changes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
