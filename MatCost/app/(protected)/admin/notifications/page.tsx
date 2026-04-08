"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Plus,
  Trash2,
  CheckCheck,
  Search,
  Filter,
  Send,
  Users,
  Mail,
  MailOpen,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  Check,
  Calendar,
  BellOff,
} from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { useTranslation } from "react-i18next";
import {
  getNotifications,
  createNotifications,
  markNotificationAsRead,
  deleteNotificationById,
  NotificationItem,
} from "@/services/admin-notifications";
import { getUsers, UserItem } from "@/services/admin-users";
import axiosClient from "@/lib/axios-client";

const formatTime = (iso: string, t: any, language: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return t("Just now");
  if (diffMins < 60) return `${diffMins} ${t("minutes ago")}`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} ${t("hours ago")}`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays} ${t("days ago")}`;
  return d.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US");
};

const formatDate = (iso: string, language: string) =>
  new Date(iso).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const TEMPLATES = [
  "Pending approval request. Please check the system for details.",
  "Material stock is running low. Please check and plan to restock.",
  "Periodic system maintenance scheduled. Please complete your work before 22:00.",
  "Monthly report is ready. Please view and confirm the data.",
  "Inventory audit scheduled. Please arrange to participate.",
  "New document requires signature. Please check immediately.",
];

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterRead, setFilterRead] = useState("all");
  const [page, setPage] = useState(1);
  const perPage = 8;

  const [modalOpen, setModalOpen] = useState(false);
  const [targetMode, setTargetMode] = useState<"single" | "all">("single");
  const [selectedUser, setSelectedUser] = useState<number>(0);
  const [message, setMessage] = useState("");
  const [charCount, setCharCount] = useState(0);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await getNotifications({ page: 1, pageSize: 1000 });
      setNotifications(res.items ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const addNotification = async (
    target: number | "all",
    msg: string,
    allIds: number[],
  ) => {
    try {
      await createNotifications({
        targetMode: target === "all" ? "all" : "single",
        userId: target === "all" ? undefined : target,
        message: msg,
      });
      await loadNotifications();
    } catch (e) {
      throw e;
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.notiId === id ? { ...n, isRead: true } : n)),
      );
    } catch (e) {
      throw e;
    }
  };

  const markAllAsRead = async () => {
    try {
      await axiosClient.patch(`/admin/notifications/read-all`);
      await loadNotifications();
    } catch (e) {
      throw e;
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await deleteNotificationById(id);
      setNotifications((prev) => prev.filter((n) => n.notiId !== id));
    } catch (e) {
      throw e;
    }
  };

  const deleteAll = async () => {
    if (!window.confirm(t("Delete all notifications?"))) return;
    try {
      await Promise.all(notifications.map(n => deleteNotificationById(n.notiId)));
      await loadNotifications();
    } catch (e) {
      toast.error(t("Failed to delete"));
    }
  };

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setUsersLoading(true);
        const res = await getUsers({ page: 1, pageSize: 1000, status: true });
        setUsers(res.items ?? []);
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : t("Failed to load user list"),
        );
      } finally {
        setUsersLoading(false);
      }
    };
    loadUsers();
  }, []);

  const activeUsers = useMemo(() => users.filter((u) => u.status), [users]);

  const getUserName = (userId: number) =>
    activeUsers.find((u) => u.userId === userId)?.fullName ??
    users.find((u) => u.userId === userId)?.fullName ??
    `User #${userId}`;

  useEffect(() => {
    if (!selectedUser && activeUsers.length > 0) {
      setSelectedUser(activeUsers[0].userId);
      return;
    }
    if (
      selectedUser &&
      activeUsers.length > 0 &&
      !activeUsers.some((u) => u.userId === selectedUser)
    ) {
      setSelectedUser(activeUsers[0].userId);
    }
  }, [activeUsers, selectedUser]);

  const filtered = useMemo(() => {
    return notifications
      .filter((n) => {
        const matchRead =
          filterRead === "all" ||
          (filterRead === "unread" && !n.isRead) ||
          (filterRead === "read" && n.isRead);
        const matchSearch =
          !search ||
          n.message.toLowerCase().includes(search.toLowerCase()) ||
          getUserName(n.userId).toLowerCase().includes(search.toLowerCase());
        return matchRead && matchSearch;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [notifications, filterRead, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleSend = async () => {
    if (!message.trim() || message.trim().length < 10) {
      toast.error(t("Notification content too short"));
      return;
    }
    if (targetMode === "single" && !selectedUser) {
      toast.error(t("Please select a recipient"));
      return;
    }
    try {
      const allIds = activeUsers.map((u) => u.userId);
      await addNotification(
        targetMode === "all" ? "all" : selectedUser,
        message.trim(),
        allIds,
      );
      toast.success(t("Notification sent"));
      setModalOpen(false);
    } catch (err) {
      toast.error(t("Failed to send"));
    }
  };

  const typeIcon: Record<string, React.ReactNode> = {
    System: <Bell className="w-5 h-5" />,
    Inventory: <AlertCircle className="w-5 h-5" />,
    Order: <Mail className="w-5 h-5" />
  };

  if (loading || usersLoading)
    return <div className="p-10 text-center text-gray-500">{t("Loading...")}</div>;

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Notifications")} />
        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t("Notifications")}</h1>
                <p className="text-sm text-gray-500 mt-1">{t("Track updates and alerts from the system")}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={markAllAsRead} 
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" /> {t("Mark all as read")}
                </button>
                <button 
                  onClick={deleteAll} 
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600 hover:bg-red-100 transition-all shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {t("Delete all")}
                </button>
                <button
                  onClick={() => {
                    setModalOpen(true);
                    setMessage("");
                  }}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  <Plus className="w-3.5 h-3.5" /> {t("Send Notification")}
                </button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3 mt-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  value={search} 
                  onChange={e => { setSearch(e.target.value); setPage(1); }} 
                  placeholder={t("Search notifications...")} 
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div className="flex gap-2">
                <select 
                  value={filterRead} 
                  onChange={e => { setFilterRead(e.target.value); setPage(1); }} 
                  className="border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none font-medium bg-white"
                >
                  <option value="all">{t("All status")}</option>
                  <option value="unread">{t("Unread")}</option>
                  <option value="read">{t("Read")}</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-6">
              {paginated.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center gap-3">
                  <div className="p-4 bg-gray-100 rounded-full"><BellOff className="w-8 h-8 text-gray-400" /></div>
                  <p className="text-gray-500 font-medium">{t("No notifications")}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {paginated.map((n) => (
                    <div 
                      key={n.notiId} 
                      className={`flex items-start gap-4 px-6 py-5 hover:bg-gray-50/50 transition-colors group ${!n.isRead ? "bg-blue-50/20" : ""}`}
                    >
                      <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.isRead ? "bg-gray-100 text-gray-400" : "bg-blue-600 text-white shadow-lg shadow-blue-100"}`}>
                        {n.isRead ? <MailOpen className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1 gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${n.isRead ? "text-gray-400" : "text-blue-600"}`}>
                                {getUserName(n.userId)}
                              </span>
                              {!n.isRead && <span className="w-1 h-1 rounded-full bg-blue-600 animate-pulse" />}
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" /> {formatTime(n.createdAt, t, i18n.language)}
                          </span>
                        </div>
                        <p className={`text-sm leading-relaxed ${n.isRead ? "text-gray-500" : "text-gray-800 font-medium"}`}>
                          {n.message}
                        </p>
                        <div className="mt-3 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!n.isRead && (
                            <button 
                              onClick={() => markAsRead(n.notiId)} 
                              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                            >
                              <Check className="w-3 h-3" /> {t("Mark as read")}
                            </button>
                          )}
                          <button 
                            onClick={() => deleteNotification(n.notiId)} 
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500 font-medium">
                <span>{t("Showing")} {paginated.length} / {filtered.length} {t("notifications")}</span>
                <div className="flex gap-1">
                  <button 
                    disabled={page === 1} 
                    onClick={() => setPage(page - 1)} 
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center px-4 font-bold text-gray-900">{page} / {totalPages}</div>
                  <button 
                    disabled={page >= totalPages} 
                    onClick={() => setPage(page + 1)} 
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-30 transition-all"
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-100">
                   <Send className="w-6 h-6" />
                 </div>
                 <div>
                   <h3 className="font-bold text-gray-900 text-lg">{t("Send Notification")}</h3>
                   <p className="text-xs text-gray-500 font-medium tracking-wide">{t("Send direct messages to system users")}</p>
                 </div>
               </div>
               <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                 <X className="w-5 h-5 text-gray-400" />
               </button>
             </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 block mb-3">
                  {t("Target Recipient")}
                </label>
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-4">
                  <button
                    onClick={() => setTargetMode("single")}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${targetMode === "single" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    {t("One User")}
                  </button>
                  <button
                    onClick={() => setTargetMode("all")}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${targetMode === "all" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    {t("All Users")} ({activeUsers.length})
                  </button>
                </div>
                {targetMode === "single" && (
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                  >
                    {activeUsers.map((u) => (
                      <option key={u.userId} value={u.userId}>
                        {u.fullName} ({u.username})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 block mb-2">
                  {t("Notification Content")}
                </label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {TEMPLATES.map((tpl, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setMessage(tpl);
                        setCharCount(tpl.length);
                      }}
                      className="text-[10px] px-2.5 py-1 bg-gray-100 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors text-gray-500 font-bold"
                    >
                      {t("Template")} {idx + 1}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      setCharCount(e.target.value.length);
                    }}
                    className="w-full border border-gray-200 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-50/50 placeholder:text-gray-400"
                    placeholder={t("Enter notification content (min 10 characters)...")}
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <span className={`text-[10px] font-bold ${charCount > 450 ? "text-red-500" : "text-gray-300"}`}>
                      {charCount}/500
                    </span>
                  </div>
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
                onClick={handleSend}
                disabled={!message.trim() || message.trim().length < 10}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 transition-all"
              >
                {t("Send Notification")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
