"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

import { useAuth } from "./AuthContext";
import { useNotifications } from "./NotificationsContext";
import {
  LayoutDashboard, Users, Package, GitBranch,
  User, LogOut, Menu, X, ChevronDown, Database,
  Bell, MailOpen, Mail, CheckCheck, BellRing,
} from "lucide-react";
import { toast } from "sonner";

const navItems = [
  { to: "/admin",               icon: LayoutDashboard, label: "Bảng điều khiển" },
  { to: "/admin/users",         icon: Users,           label: "Người dùng" },
  { to: "/admin/materials",     icon: Package,         label: "Vật tư" },
  { to: "/admin/workflows",     icon: GitBranch,       label: "Quy trình duyệt" },
  { to: "/admin/master-data",   icon: Database,        label: "Danh mục" },
  { to: "/admin/notifications", icon: Bell,            label: "Thông báo" },
  { to: "/admin/profile",       icon: User,            label: "Hồ sơ cá nhân" },
];

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} giờ trước`;
  return `${Math.floor(diffHrs / 24)} ngày trước`;
};

export default function AdminLayout({ children }: { children?: React.ReactNode }) {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const CURRENT_USER_ID = 1; // admin
  const { getUnreadCount, getNotificationsForUser, markAsRead, markAllAsRead } =
    useNotifications();

  const unreadCount = getUnreadCount(CURRENT_USER_ID);
  const myNotis = getNotificationsForUser(CURRENT_USER_ID).slice(0, 6);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    toast.success("Đăng xuất thành công");
    router.push("/login");
  };

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } bg-white border-r border-gray-200 flex flex-col transition-all duration-300 shrink-0 fixed h-full z-30`}
      >
        <div className="h-16 flex items-center px-4 border-b border-gray-100 gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && (
            <span className="text-lg text-gray-900 whitespace-nowrap">WMS Admin</span>
          )}
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.to}
              href={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive(item.to)
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-2 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 w-full transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      <div className={`flex-1 ${sidebarOpen ? "ml-64" : "ml-16"} transition-all duration-300`}>
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-700"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3">
            <div ref={bellRef} className="relative">
              <button
                onClick={() => {
                  setBellOpen(!bellOpen);
                  setProfileOpen(false);
                }}
                className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
              >
                {unreadCount > 0 ? (
                  <BellRing className="w-5 h-5 text-blue-600" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center px-1 font-semibold leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-900">Thông báo của bạn</span>
                      {unreadCount > 0 && (
                        <span className="bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full">
                          {unreadCount} mới
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => {
                          markAllAsRead(CURRENT_USER_ID);
                          toast.success("Đã đánh dấu tất cả đã đọc");
                        }}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Đánh dấu tất cả
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                    {myNotis.length === 0 ? (
                      <div className="py-10 text-center text-gray-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Không có thông báo nào</p>
                      </div>
                    ) : (
                      myNotis.map((n) => (
                        <div
                          key={n.notiId}
                          onClick={() => markAsRead(n.notiId)}
                          className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                            !n.isRead ? "bg-blue-50/50" : ""
                          }`}
                        >
                          <div
                            className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                              n.isRead
                                ? "bg-gray-100 text-gray-400"
                                : "bg-blue-100 text-blue-600"
                            }`}
                          >
                            {n.isRead ? (
                              <MailOpen className="w-3.5 h-3.5" />
                            ) : (
                              <Mail className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm leading-snug line-clamp-2 ${
                                !n.isRead ? "text-gray-800" : "text-gray-500"
                              }`}
                            >
                              {n.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {formatTime(n.createdAt)}
                            </p>
                          </div>
                          {!n.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50">
                    <button
                      onClick={() => {
                        router.push("/notifications");
                        setBellOpen(false);
                      }}
                      className="w-full text-center text-sm text-blue-600 hover:text-blue-800 transition-colors py-0.5"
                    >
                      Xem tất cả thông báo →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setBellOpen(false);
                }}
                className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-3 py-1.5 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  {user?.name?.charAt(0) || "A"}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.role}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      router.push("/profile");
                      setProfileOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Xem hồ sơ
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}