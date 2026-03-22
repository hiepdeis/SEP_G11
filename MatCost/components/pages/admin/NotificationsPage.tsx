"use client";
import { useState, useMemo } from "react";
import {
  Bell, Plus, Trash2, CheckCheck, Search, Filter,
  Send, Users, Mail, MailOpen, X, ChevronLeft, ChevronRight,
  Clock, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useNotifications } from "./NotificationsContext";
import { useRouter } from "next/navigation";

// Danh sách user mock – khớp với Users table
const ALL_USERS = [
  { userId: 1, fullName: "Nguyen Van An",    username: "admin",    roleId: 1, roleName: "Admin" },
  { userId: 2, fullName: "Tran Thi Bich",   username: "bich.tt",  roleId: 2, roleName: "WarehouseManager" },
  { userId: 3, fullName: "Le Hoang Cuong",  username: "cuong.lh", roleId: 3, roleName: "WarehouseStaff" },
  { userId: 4, fullName: "Pham Duc Dung",   username: "dung.pd",  roleId: 3, roleName: "WarehouseStaff" },
  { userId: 5, fullName: "Vo Thi Em",       username: "em.vt",    roleId: 5, roleName: "Viewer" },
  { userId: 6, fullName: "Hoang Van Phuc",  username: "phuc.hv",  roleId: 4, roleName: "Accountant" },
  { userId: 7, fullName: "Dang Thi Giang",  username: "giang.dt", roleId: 3, roleName: "WarehouseStaff" },
  { userId: 8, fullName: "Bui Minh Hieu",   username: "hieu.bm",  roleId: 3, roleName: "WarehouseStaff" },
];

const getUserName = (userId: number) =>
  ALL_USERS.find((u) => u.userId === userId)?.fullName ?? `User #${userId}`;

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} giờ trước`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return d.toLocaleDateString("vi-VN");
};

const formatDateFull = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

// Quick message templates
const TEMPLATES = [
  "Yêu cầu phê duyệt đang chờ xử lý. Vui lòng vào hệ thống để xem chi tiết.",
  "Vật tư sắp hết tồn kho. Vui lòng kiểm tra và lên kế hoạch nhập hàng.",
  "Hệ thống sẽ bảo trì định kỳ. Vui lòng hoàn tất công việc trước 22:00.",
  "Báo cáo tháng đã sẵn sàng. Vui lòng xem và xác nhận số liệu.",
  "Lịch kiểm kê kho được lên kế hoạch. Vui lòng sắp xếp tham gia.",
  "Có tài liệu mới cần ký xác nhận. Vui lòng kiểm tra ngay.",
];

export default function NotificationsPage() {
  const { notifications, addNotification, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications();
  const router = useRouter();

  // ── Filters ──────────────────────────────────────
  const [search, setSearch]         = useState("");
  const [filterUser, setFilterUser] = useState("all");
  const [filterRead, setFilterRead] = useState("all"); // all | unread | read
  const [page, setPage]             = useState(1);
  const perPage = 8;

  // ── Create modal ─────────────────────────────────
  const [modalOpen, setModalOpen]       = useState(false);
  const [targetMode, setTargetMode]     = useState<"single" | "all">("single");
  const [selectedUser, setSelectedUser] = useState<number>(1);
  const [message, setMessage]           = useState("");
  const [charCount, setCharCount]       = useState(0);

  // ── Stats ─────────────────────────────────────────
  const totalCount  = notifications.length;
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const readCount   = notifications.filter((n) => n.isRead).length;
  const todayCount  = notifications.filter((n) => {
    const d = new Date(n.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  // ── Filtered + paginated ──────────────────────────
  const filtered = useMemo(() => {
    return notifications
      .filter((n) => {
        const matchUser = filterUser === "all" || n.userId === Number(filterUser);
        const matchRead =
          filterRead === "all" ||
          (filterRead === "unread" && !n.isRead) ||
          (filterRead === "read"   && n.isRead);
        const matchSearch =
          !search ||
          n.message.toLowerCase().includes(search.toLowerCase()) ||
          getUserName(n.userId).toLowerCase().includes(search.toLowerCase());
        return matchUser && matchRead && matchSearch;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notifications, filterUser, filterRead, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated  = filtered.slice((page - 1) * perPage, page * perPage);

  const resetPage = () => setPage(1);

  // ── Handlers ─────────────────────────────────────
  const openModal = () => {
    setTargetMode("single");
    setSelectedUser(1);
    setMessage("");
    setCharCount(0);
    setModalOpen(true);
  };

  const handleSend = () => {
    if (!message.trim()) {
      toast.error("Vui lòng nhập nội dung thông báo");
      return;
    }
    if (message.trim().length < 10) {
      toast.error("Nội dung thông báo quá ngắn (tối thiểu 10 ký tự)");
      return;
    }
    const allIds = ALL_USERS.map((u) => u.userId);
    addNotification(
      targetMode === "all" ? "all" : selectedUser,
      message.trim(),
      allIds
    );
    const target =
      targetMode === "all"
        ? "Tất cả người dùng"
        : getUserName(selectedUser);
    toast.success(`Đã gửi thông báo tới: ${target}`);
    setModalOpen(false);
  };

  const handleMarkRead = (notiId: number) => {
    markAsRead(notiId);
    toast.success("Đã đánh dấu đã đọc");
  };

  const handleDelete = (notiId: number) => {
    deleteNotification(notiId);
    toast.success("Đã xoá thông báo");
  };

  const handleMarkAllRead = () => {
    const userId = filterUser !== "all" ? Number(filterUser) : undefined;
    if (userId) {
      markAllAsRead(userId);
      toast.success(`Đã đánh dấu tất cả đã đọc cho ${getUserName(userId)}`);
    } else {
      // mark all for everyone
      ALL_USERS.forEach((u) => markAllAsRead(u.userId));
      toast.success("Đã đánh dấu tất cả thông báo là đã đọc");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Quản lý Thông báo
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Tạo và gửi thông báo tới người dùng trong hệ thống
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tạo thông báo
        </button>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl text-gray-900">{totalCount}</p>
            <p className="text-xs text-gray-500">Tổng thông báo</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
            <Mail className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-2xl text-gray-900">{unreadCount}</p>
            <p className="text-xs text-gray-500">Chưa đọc</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
            <MailOpen className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl text-gray-900">{readCount}</p>
            <p className="text-xs text-gray-500">Đã đọc</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl text-gray-900">{todayCount}</p>
            <p className="text-xs text-gray-500">Hôm nay</p>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm nội dung, tên người dùng..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={filterUser}
              onChange={(e) => { setFilterUser(e.target.value); resetPage(); }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">Tất cả người dùng</option>
              {ALL_USERS.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.fullName}
                </option>
              ))}
            </select>
            <select
              value={filterRead}
              onChange={(e) => { setFilterRead(e.target.value); resetPage(); }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="unread">Chưa đọc</option>
              <option value="read">Đã đọc</option>
            </select>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 whitespace-nowrap"
              >
                <CheckCheck className="w-4 h-4" />
                Đánh dấu tất cả
              </button>
            )}
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Hiển thị {paginated.length} / {filtered.length} thông báo
        </div>
      </div>

      {/* ── Notifications List ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {paginated.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Không có thông báo nào</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginated.map((n) => (
              <div
                key={n.notiId}
                className={`flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group ${
                  !n.isRead ? "bg-blue-50/40" : ""
                }`}
              >
                {/* Icon */}
                <div
                  className={`mt-0.5 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    n.isRead
                      ? "bg-gray-100 text-gray-400"
                      : "bg-blue-100 text-blue-600"
                  }`}
                >
                  {n.isRead ? (
                    <MailOpen className="w-4 h-4" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-900">
                        {getUserName(n.userId)}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                          n.isRead
                            ? "bg-gray-100 text-gray-500"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {n.isRead ? "Đã đọc" : "Chưa đọc"}
                      </span>
                      <span className="text-xs text-gray-400">
                        #{n.notiId}
                      </span>
                    </div>
                    <span
                      title={formatDateFull(n.createdAt)}
                      className="text-xs text-gray-400 whitespace-nowrap shrink-0"
                    >
                      {formatTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    {n.message}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkRead(n.notiId)}
                      title="Đánh dấu đã đọc"
                      className="p-1.5 rounded-lg hover:bg-green-100 text-gray-400 hover:text-green-600 transition-colors"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n.notiId)}
                    title="Xoá thông báo"
                    className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-sm text-gray-500">
              Trang {page} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && (arr[idx - 1] as number) < p - 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                        page === p
                          ? "bg-blue-600 text-white"
                          : "border border-gray-200 hover:bg-white text-gray-600"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create / Send Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-700">
              <div className="flex items-center gap-2 text-white">
                <Send className="w-5 h-5" />
                <h2 className="text-white">Tạo & Gửi Thông Báo</h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Target */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Gửi tới
                </label>
                <div className="flex gap-3 mb-3">
                  <button
                    onClick={() => setTargetMode("single")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm transition-colors ${
                      targetMode === "single"
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Một người dùng
                  </button>
                  <button
                    onClick={() => setTargetMode("all")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm transition-colors ${
                      targetMode === "all"
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                    Tất cả ({ALL_USERS.length} người)
                  </button>
                </div>

                {targetMode === "single" && (
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {ALL_USERS.map((u) => (
                      <option key={u.userId} value={u.userId}>
                        {u.fullName} — {u.roleName}
                      </option>
                    ))}
                  </select>
                )}

                {targetMode === "all" && (
                  <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
                    <p className="text-xs text-orange-700">
                      Thông báo sẽ được gửi tới toàn bộ {ALL_USERS.length} người dùng trong hệ thống.
                    </p>
                  </div>
                )}
              </div>

              {/* Templates */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Mẫu nhanh
                </label>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATES.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setMessage(t);
                        setCharCount(t.length);
                      }}
                      className="px-2.5 py-1 text-xs border border-gray-200 rounded-full hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors text-gray-500"
                    >
                      Mẫu {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm text-gray-700">
                    Nội dung thông báo <span className="text-red-500">*</span>
                  </label>
                  <span
                    className={`text-xs ${charCount > 450 ? "text-red-500" : "text-gray-400"}`}
                  >
                    {charCount}/500
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={500}
                  placeholder="Nhập nội dung thông báo (tối thiểu 10 ký tự)..."
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setCharCount(e.target.value.length);
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Preview */}
              {message.trim() && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-400 mb-1">Xem trước:</p>
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Bell className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-700 mb-0.5">
                        {targetMode === "all"
                          ? "Tất cả người dùng"
                          : getUserName(selectedUser)}
                      </p>
                      <p className="text-xs text-gray-600">{message.trim()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
              >
                Huỷ
              </button>
              <button
                onClick={handleSend}
                disabled={!message.trim() || message.trim().length < 10}
                className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                Gửi thông báo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}