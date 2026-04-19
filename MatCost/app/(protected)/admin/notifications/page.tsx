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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showConfirmToast } from "@/hooks/confirm-toast";
import {
  getNotifications,
  createNotifications,
  markNotificationAsRead,
  deleteNotificationById,
  NotificationItem,
  NotificationCreateResult,
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

const TEMPLATES = [
  "Pending approval request. Please check the system for details.",
  "Material stock is running low. Please check and plan to restock.",
  "Periodic system maintenance scheduled. Please complete your work before 22:00.",
  "Monthly report is ready. Please view and confirm the data.",
  "Inventory audit scheduled. Please arrange to participate.",
  "New document requires signature. Please check immediately.",
];

const hasUsableRecipientEmail = (email?: string | null) => {
  if (!email) return false;

  const normalizedEmail = email.trim().toLowerCase();
  return normalizedEmail.length > 0 && !normalizedEmail.endsWith(".local");
};

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
  const [sendEmail, setSendEmail] = useState(true);
  const [charCount, setCharCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await getNotifications({ page: 1, pageSize: 1000 });
      setNotifications(res.items ?? []);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error loading notifications",
      );
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
  ): Promise<NotificationCreateResult> => {
    try {
      return await createNotifications({
        targetMode: target === "all" ? "all" : "single",
        userId: target === "all" ? undefined : target,
        message: msg,
        sendEmail,
      });
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
      await axiosClient.patch(`/admin/notifications/mark-all-read`, {});
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
    showConfirmToast({
      title: t("Are you sure?"),
      description: t("Delete all notifications?"),
      onConfirm: async () => {
        try {
          await Promise.all(
            notifications.map((n) => deleteNotificationById(n.notiId)),
          );
          await loadNotifications();
          toast.success(t("Delete Successful"));
        } catch (e) {
          toast.error(t("Failed to delete"));
        }
      },
    });
  };

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setUsersLoading(true);
        const res = await getUsers({ page: 1, pageSize: 1000, status: true });
        setUsers(res.items ?? []);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t("Failed to load user list"),
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

  const getUserEmail = (userId: number) =>
    activeUsers.find((u) => u.userId === userId)?.email ??
    users.find((u) => u.userId === userId)?.email ??
    "";

  const buildSendToastMessage = (result: NotificationCreateResult) => {
    if (!result.emailRequested) {
      return {
        type: "success" as const,
        message: "Notification saved in the system only.",
      };
    }

    if (!result.emailConfigured) {
      return {
        type: "warning" as const,
        message: "Notification saved, but Gmail SMTP is not configured on the server.",
      };
    }

    if (result.emailFailedCount > 0 || result.emailMissingAddressCount > 0) {
      return {
        type: "warning" as const,
        message:
          `Notification saved. Email sent: ${result.emailSentCount}, ` +
          `failed: ${result.emailFailedCount}, invalid/missing email: ${result.emailMissingAddressCount}.`,
      };
    }

    if (result.emailSentCount > 0) {
      return {
        type: "success" as const,
        message: `Notification and email sent successfully (${result.emailSentCount}).`,
      };
    }

    return {
      type: "warning" as const,
      message: "Notification saved, but no email was sent.",
    };
  };

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

    if (
      sendEmail &&
      targetMode === "single" &&
      !hasUsableRecipientEmail(getUserEmail(selectedUser))
    ) {
      toast.error("The selected user does not have a real email address for Gmail delivery.");
      return;
    }

    try {
      const result = await addNotification(
        targetMode === "all" ? "all" : selectedUser,
        message.trim(),
      );
      await loadNotifications();
      const toastResult = buildSendToastMessage(result);
      if (toastResult.type === "warning") {
        toast.warning(toastResult.message);
      } else {
        toast.success(toastResult.message);
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(t("Failed to send"));
    }
  };

  const typeIcon: Record<string, React.ReactNode> = {
    System: <Bell className="w-5 h-5" />,
    Inventory: <AlertCircle className="w-5 h-5" />,
    Order: <Mail className="w-5 h-5" />,
  };

  if (loading || usersLoading)
    return (
      <div className="p-10 text-center text-gray-500">{t("Loading...")}</div>
    );

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Notifications")} />
        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  {t("Notifications")}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {t("Track updates and alerts from the system")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  className="bg-white rounded-xl border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5 mr-2" /> {t("Mark all as read")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={deleteAll}
                  className="bg-red-50 hover:bg-red-100 border-red-100 rounded-xl text-xs font-bold text-red-600 shadow-sm shadow-none"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> {t("Delete all")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setModalOpen(true);
                    setMessage("");
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-bold shadow-lg shadow-indigo-100"
                >
                  <Plus className="w-3.5 h-3.5 mr-2" /> {t("Send Notification")}
                </Button>
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
                  placeholder={t("Search notifications...")}
                  className="pl-10 rounded-xl bg-white border-gray-200 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-2">
                <Select
                  value={filterRead}
                  onValueChange={(val) => {
                    setFilterRead(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[180px] rounded-xl border-gray-200 bg-white">
                    <SelectValue placeholder={t("All status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All status")}</SelectItem>
                    <SelectItem value="unread">{t("Unread")}</SelectItem>
                    <SelectItem value="read">{t("Read")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-6">
              {paginated.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center gap-3">
                  <div className="p-4 bg-gray-100 rounded-full">
                    <BellOff className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">
                    {t("No notifications")}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {paginated.map((n) => (
                    <div
                      key={n.notiId}
                      className={`flex items-start gap-4 px-6 py-5 hover:bg-gray-50/50 transition-colors group ${!n.isRead ? "bg-indigo-50/20" : ""}`}
                    >
                      <div
                        className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.isRead ? "bg-gray-100 text-gray-400" : "bg-indigo-600 text-white shadow-lg shadow-indigo-100"}`}
                      >
                        {n.isRead ? (
                          <MailOpen className="w-5 h-5" />
                        ) : (
                          <Mail className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1 gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold uppercase tracking-wider border-none shadow-none px-0 ${n.isRead ? "text-gray-400" : "text-indigo-600"}`}
                              >
                                {getUserName(n.userId)}
                              </Badge>
                              {!n.isRead && (
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" />{" "}
                            {formatTime(n.createdAt, t, i18n.language)}
                          </span>
                        </div>
                        <p
                          className={`text-sm leading-relaxed ${n.isRead ? "text-gray-500" : "text-gray-800 font-medium"}`}
                        >
                          {n.message}
                        </p>
                        <div className="mt-3 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!n.isRead && (
                            <Button
                              size="sm"
                              onClick={() => markAsRead(n.notiId)}
                              className="h-7 px-3 bg-indigo-600 text-white text-[10px] font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all rounded-lg"
                            >
                              <Check className="w-3 h-3 mr-1.5" /> {t("Mark as read")}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteNotification(n.notiId)}
                            className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500 font-medium">
                <span>
                  {t("Showing")} {paginated.length} / {filtered.length}{" "}
                  {t("notifications")}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="h-8 w-8 rounded-lg border-gray-200 hover:bg-white transition-all shadow-none"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 px-4 rounded-lg bg-white border-gray-200 shadow-none pointer-events-none"
                  >
                    {page} / {totalPages}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="h-8 w-8 rounded-lg border-gray-200 hover:bg-white transition-all shadow-none"
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
        <DialogContent className="sm:max-w-2xl overflow-hidden flex flex-col max-h-[90vh] p-0">
          <DialogHeader className="px-8 py-6 border-b bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  {t("Send Notification")}
                </DialogTitle>
                <p className="text-xs text-gray-500 font-medium tracking-wide mt-0.5">
                  {t("Send direct messages to system users")}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-grow overflow-y-auto px-8 py-6 space-y-6">
            <div className="space-y-4">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                {t("Target Recipient")}
              </Label>
              <Tabs
                value={targetMode}
                onValueChange={(val) => setTargetMode(val as "single" | "all")}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 h-11 rounded-xl">
                  <TabsTrigger
                    value="single"
                    className="rounded-lg text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                  >
                    {t("One User")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="all"
                    className="rounded-lg text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                  >
                    {t("All Users")} ({activeUsers.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="single" className="pt-3">
                  <Select
                    value={String(selectedUser)}
                    onValueChange={(val) => setSelectedUser(Number(val))}
                  >
                    <SelectTrigger className="w-full h-11 rounded-xl border-gray-200 bg-white font-medium">
                      <SelectValue placeholder={t("Select a user")} />
                    </SelectTrigger>
                    <SelectContent>
                      {activeUsers.map((u) => (
                        <SelectItem key={u.userId} value={String(u.userId)}>
                          {u.fullName} ({u.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-xs text-gray-500">
                    {hasUsableRecipientEmail(getUserEmail(selectedUser))
                      ? `Email: ${getUserEmail(selectedUser)}`
                      : "This user is missing a deliverable email address for Gmail notifications."}
                  </p>
                </TabsContent>
                <TabsContent value="all" className="pt-3">
                  <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 rounded-xl border border-amber-100">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <p className="text-xs text-amber-700 font-medium">
                      {t("This message will be sent to all active users.")}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
                <div>
                  <Label className="text-sm font-semibold text-gray-900">
                    Send Gmail email
                  </Label>
                  <p className="mt-1 text-xs text-gray-500">
                    Turn this off if you only want an in-app notification.
                  </p>
                </div>
                <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
              </div>

              <div className="flex justify-between items-end">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">
                  {t("Notification Content")}
                </Label>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className={`h-7 px-3 text-[10px] font-bold rounded-lg transition-all ${showPreview ? "bg-indigo-50 text-indigo-600" : "text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"}`}
                  >
                    {showPreview ? t("Hide Preview") : t("Show Preview")}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {TEMPLATES.map((tpl, idx) => (
                  <Button
                    key={idx}
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setMessage(tpl);
                      setCharCount(tpl.length);
                    }}
                    className="h-7 px-2.5 bg-gray-100 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-[10px] text-gray-500 font-bold border-none transition-colors"
                  >
                    {t("Template")} {idx + 1}
                  </Button>
                ))}
              </div>

              <div className="relative">
                <Textarea
                  rows={4}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setCharCount(e.target.value.length);
                  }}
                  className="w-full border-gray-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 resize-none bg-gray-50/50 placeholder:text-gray-400"
                  placeholder={t(
                    "Enter notification content (min 10 characters)...",
                  )}
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2 pointer-events-none">
                  <span
                    className={`text-[10px] font-bold ${charCount > 450 ? "text-red-500" : "text-gray-300"}`}
                  >
                    {charCount}/500
                  </span>
                </div>
              </div>
            </div>

            {showPreview && message.trim().length >= 10 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">
                  {t("Preview")}
                </Label>
                <div className="border border-indigo-100 rounded-2xl bg-indigo-50/30 overflow-hidden">
                  <div className="flex items-start gap-4 px-6 py-5">
                    <div className="mt-1 w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1 gap-4">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold uppercase tracking-wider border-none shadow-none px-0 text-indigo-600"
                          >
                            {targetMode === "all" ? t("All Users") : getUserName(selectedUser)}
                          </Badge>
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {t("Just now")}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-gray-800 font-medium">
                        {message}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-8 py-6 bg-gray-50 border-t flex justify-end gap-3 sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setModalOpen(false)}
              className="px-6 h-11 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-transparent"
            >
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleSend}
              disabled={!message.trim() || message.trim().length < 10}
              className="px-8 h-11 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:shadow-indigo-200 transition-all font-bold"
            >
              {t("Send Notification")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
