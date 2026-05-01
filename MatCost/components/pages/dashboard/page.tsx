"use client";

import { Sidebar } from "@/components/sidebar";
import {
  Bell,
  User,
  Package,
  Truck,
  Warehouse,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  ShieldAlert,
  Download,
  Upload,
  Users,
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { UserDropdown } from "@/components/user-dropdown";
import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/custom/card-wrapper";
import { getAdminDashboard, AdminDashboardResponse } from "@/services/admin-dashboard";
import { useAuth } from "@/components/providers/auth-provider";

interface StatData {
  label: string;
  value: string;
  trend: string;
  trendDirection: "up" | "down" | "neutral";
  icon: React.ElementType;
  theme: "blue" | "orange" | "purple" | "slate" | "red" | "green";
}
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { otpApi } from "@/services/otpservices";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [show2FAPrompt, setShow2FAPrompt] = useState(false);

  useEffect(() => {
    const role = sessionStorage.getItem("role") || "";
    setUserRole(role);

    const fetchDashboard = async () => {
      try {
        const data = await getAdminDashboard();
        setDashboardData(data);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();

    const checkSecurityStatus = async () => {
      try {
        if (role === "Admin" || role === "Accountant") {
          const status = await otpApi.get2FAStatus();
          if (!status.isEnabled) {
            setShow2FAPrompt(true);
          }
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra trạng thái bảo mật:", error);
      }
    };
    checkSecurityStatus();
  }, []);

  const canViewMaterials = ["Admin", "Manager", "Staff"].some(r => userRole.includes(r));
  const canViewReceipts = ["Admin", "Manager", "Accountant", "Purchasing", "Staff"].some(r => userRole.includes(r));
  const canViewIssues = ["Admin", "Manager", "Staff", "Construction"].some(r => userRole.includes(r));

  const statsData: StatData[] = useMemo(() => {
    if (!dashboardData) return [];

    const stats: StatData[] = [];

    if (canViewMaterials) {
      stats.push({
        label: "Total Materials",
        value: dashboardData.summary.totalMaterials.toLocaleString(),
        trend: "Current items",
        trendDirection: "neutral",
        icon: Package,
        theme: "blue",
      });
      stats.push({
        label: "Low Stock Alert",
        value: dashboardData.summary.lowStockCount.toLocaleString(),
        trend: "Requires attention",
        trendDirection: dashboardData.summary.lowStockCount > 0 ? "down" : "neutral",
        icon: Activity,
        theme: "red",
      });
    }

    if (canViewReceipts) {
      stats.push({
        label: "Today Receipts",
        value: dashboardData.summary.todayReceipts.toLocaleString(),
        trend: "Today",
        trendDirection: "up",
        icon: Download,
        theme: "green",
      });
    }

    if (canViewIssues) {
      stats.push({
        label: "Today Issues",
        value: dashboardData.summary.todayIssues.toLocaleString(),
        trend: "Today",
        trendDirection: "up",
        icon: Upload,
        theme: "orange",
      });
    }

    return stats;
  }, [dashboardData, userRole]);

  const getThemeClasses = (theme: StatData["theme"]) => {
    switch (theme) {
      case "blue":
        return "bg-blue-100 text-blue-600";
      case "orange":
        return "bg-orange-100 text-orange-600";
      case "purple":
        return "bg-purple-100 text-purple-600";
      case "red":
        return "bg-red-100 text-red-600";
      case "green":
        return "bg-green-100 text-green-600";
      case "slate":
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const getRoleBasePath = (role?: string) => {
    if (!role) return "";
    const r = role.toLowerCase();
    if (r.includes("admin")) return "/admin";
    if (r.includes("accountant")) return "/accountant";
    if (r.includes("manager")) return "/manager";
    if (r.includes("staff")) return "/staff";
    if (r.includes("construction")) return "/construction";
    if (r.includes("purchasing")) return "/purchasing";
    return `/${r}`;
  };

  const basePath = getRoleBasePath(userRole);

  const quickLinks = [
    { label: "Materials", href: `${basePath}/materials`, roles: ["Manager", "Staff", "Admin"], icon: Package },
    { label: "Warehouses", href: `${basePath}/warehouses`, roles: ["Manager", "Staff", "Admin"], icon: Warehouse },
    { label: "Suppliers", href: `${basePath}/suppliers`, roles: ["Purchasing", "Accountant", "Admin"], icon: Users },
    { label: "Projects", href: `${basePath}/projects`, roles: ["Accountant", "Manager", "Admin"], icon: LayoutDashboard },
    { label: "Purchase Orders", href: `${basePath}/purchase-orders`, roles: ["Admin", "Purchasing", "Accountant"], icon: FileText },
    { label: "Issue Slips", href: "/outbound/common/IssueSlipList", roles: ["Admin", "Manager", "Staff"], icon: Upload },
    { label: "Incoming Shipments", href: "/outbound/contruction/IncomingShipments", roles: ["Construction"], icon: Truck },
    { label: "Audit", href: `${basePath}/audit`, roles: ["Admin", "Accountant", "Manager", "Staff"], icon: ClipboardCheck },
  ].filter(link => !link.roles || link.roles.some(r => userRole.toLowerCase().includes(r.toLowerCase())));

  const recentActivities = useMemo(() => {
    if (!dashboardData) return [];
    const activities: any[] = [];
    
    if (canViewReceipts) {
      dashboardData.recentReceipts.forEach(r => {
        activities.push({
          action: `Receipt: ${r.id}`,
          details: `${r.items} items from ${r.supplier}`,
          status: r.status,
          date: new Date(r.date),
          icon: Download,
          iconBg: "bg-green-100 text-green-600"
        });
      });
    }
    
    if (canViewIssues) {
      dashboardData.recentIssues.forEach(i => {
        activities.push({
          action: `Issue: ${i.id}`,
          details: `${i.items} items to ${i.project}`,
          status: i.status,
          date: new Date(i.date),
          icon: Upload,
          iconBg: "bg-orange-100 text-orange-600"
        });
      });
    }
    
    return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
  }, [dashboardData, userRole]);

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const getSparklinePath = (direction: string) => {
    if (direction === "up") return "M0,40 C20,30 40,40 60,10 C80,-10 90,20 100,10";
    if (direction === "down") return "M0,10 C20,10 40,30 60,20 C80,10 90,40 100,35";
    return "M0,30 C20,20 40,35 60,25 C80,15 90,30 100,25";
  };

  const getThemeColor = (theme: string) => {
    switch (theme) {
      case "blue": return "#3b82f6";
      case "red": return "#ef4444";
      case "green": return "#22c55e";
      case "orange": return "#f97316";
      default: return "#94a3b8";
    }
  };

  const getStatusBadgeTheme = (status: string) => {
    if (!status) return "bg-slate-100 text-slate-700";
    const s = status.toLowerCase();
    if (s.includes("processed") || s.includes("completed") || s.includes("đã xuất") || s.includes("nhập kho") || s.includes("approved")) return "bg-green-100 text-green-700";
    if (s.includes("pending") || s.includes("chờ")) return "bg-amber-100 text-amber-700";
    if (s.includes("forwarded") || s.includes("chuyển")) return "bg-blue-100 text-blue-700";
    if (s.includes("rejected") || s.includes("hủy")) return "bg-red-100 text-red-700";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="hidden md:block">
              <h2 className="text-lg font-semibold text-slate-900">
                Dashboard
              </h2>
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>

              <UserDropdown
                align="end"
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  >
                    <User className="h-5 w-5" />
                  </Button>
                }
              />
            </div>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto">
          <div className="px-6 lg:px-10 py-8 max-w-7xl mx-auto w-full">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">
                Welcome to MatCost
              </h1>
              <p className="text-slate-500 text-lg">
                Construction material inventory and management overview
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Activity className="w-8 h-8 text-slate-300 animate-spin" />
              </div>
            ) : (
              <>
                {statsData.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {statsData.map((stat, i) => {
                      const TrendIcon =
                        stat.trendDirection === "up"
                          ? ArrowUpRight
                          : stat.trendDirection === "down"
                            ? ArrowDownRight
                            : Clock;
                      const trendColorClass =
                        stat.trendDirection === "up"
                          ? "text-green-600 bg-green-50"
                          : stat.trendDirection === "down"
                            ? "text-red-600 bg-red-50"
                            : "text-slate-600 bg-slate-50";

                      return (
                        <Card interactive key={i} className="flex flex-col justify-between h-full relative overflow-hidden group">
                          <div className="flex items-start justify-between mb-4 relative z-10">
                            <div>
                              <p className="text-slate-500 text-sm font-medium mb-1 group-hover:text-slate-700 transition-colors">
                                {stat.label}
                              </p>
                              <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                                {stat.value}
                              </h3>
                            </div>
                            <div
                              className={`p-3 rounded-xl ${getThemeClasses(
                                stat.theme,
                              )} shadow-sm`}
                            >
                              <stat.icon className="w-6 h-6" />
                            </div>
                          </div>

                          <div className="flex items-center text-sm font-medium relative z-10">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${trendColorClass}`}
                            >
                              <TrendIcon className="w-4 h-4" />
                              {stat.trend}
                            </span>
                          </div>

                          {/* Mini Sparkline Background */}
                          <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none opacity-[0.12] group-hover:opacity-20 transition-opacity duration-300">
                            <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                              <path
                                d={`${getSparklinePath(stat.trendDirection)} L100,40 L0,40 Z`}
                                fill={`url(#gradient-${stat.theme})`}
                              />
                              <path
                                d={getSparklinePath(stat.trendDirection)}
                                fill="none"
                                stroke={getThemeColor(stat.theme)}
                                strokeWidth="2"
                              />
                              <defs>
                                <linearGradient id={`gradient-${stat.theme}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={getThemeColor(stat.theme)} stopOpacity="1" />
                                  <stop offset="100%" stopColor={getThemeColor(stat.theme)} stopOpacity="0" />
                                </linearGradient>
                              </defs>
                            </svg>
                          </div>
                        </Card>
                      );
                    })}

                    {statsData.length < 4 && (
                      <Card 
                        noPadding
                        className={`overflow-hidden border-none shadow-lg ${
                          statsData.length === 1 ? "md:col-span-1 lg:col-span-3" :
                          statsData.length === 2 ? "md:col-span-2 lg:col-span-2" :
                          "md:col-span-1 lg:col-span-1"
                        }`}
                      >
                        <div className="w-full h-full p-6 lg:p-8 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 flex items-center relative">
                          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
                          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-indigo-400/20 blur-2xl pointer-events-none"></div>
                          
                          <div className="relative z-10 flex flex-col gap-3">
                            <h2 className="text-3xl font-bold tracking-tight text-white">
                              Hello, {user?.fullName || userRole || "User"}! 👋
                            </h2>
                            <div className="flex items-center gap-2 text-indigo-200 text-sm font-medium mb-1">
                              <Calendar className="w-4 h-4" />
                              <span>{currentDate}</span>
                            </div>
                            <p className="text-indigo-100 text-base lg:text-lg max-w-2xl leading-relaxed">
                              Welcome to your MatCost dashboard. You currently have access to {quickLinks.length} specific modules based on your role.
                            </p>
                            {quickLinks.length > 0 && (
                              <div className="mt-2 flex items-center gap-3">
                                <Button variant="secondary" className="bg-white text-indigo-700 hover:bg-slate-50 border-none font-semibold shadow-sm" onClick={() => router.push(quickLinks[0].href)}>
                                  Access {quickLinks[0].label}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {/* Main Content Grid */}
                <div className={`grid grid-cols-1 ${canViewMaterials ? "lg:grid-cols-2" : ""} gap-6 mb-8`}>
                  {canViewMaterials && (
                    <Card>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-slate-900">
                          Low Stock Materials
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                          onClick={() => router.push(`${basePath}/materials`)}
                        >
                          View All
                        </Button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 bg-slate-50 border-b">
                            <tr>
                              <th className="px-4 py-3 font-medium rounded-tl-lg">Code</th>
                              <th className="px-4 py-3 font-medium">Name</th>
                              <th className="px-4 py-3 font-medium">Current</th>
                              <th className="px-4 py-3 font-medium">Min</th>
                              <th className="px-4 py-3 font-medium rounded-tr-lg">Warehouse</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardData?.lowStockMaterials && dashboardData.lowStockMaterials.length > 0 ? (
                              dashboardData.lowStockMaterials.map(m => (
                                <tr key={m.materialId} className="border-b last:border-0 hover:bg-slate-50">
                                  <td className="px-4 py-3 font-medium text-slate-900">{m.code}</td>
                                  <td className="px-4 py-3 whitespace-normal break-words">{m.name}</td>
                                  <td className="px-4 py-3 text-red-600 font-semibold whitespace-nowrap">{m.quantityOnHand} {m.unit}</td>
                                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{m.minStockLevel} {m.unit}</td>
                                  <td className="px-4 py-3 text-slate-500 whitespace-normal break-words">{m.warehouseName}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                  No low stock materials found.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}

                  <div className={`flex flex-col gap-6 ${!canViewMaterials ? "lg:flex-row items-stretch" : ""}`}>
                    <Card className={`flex flex-col ${!canViewMaterials ? "flex-1" : ""}`}>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-slate-900">
                          Quick Access
                        </h3>
                      </div>
                      <div className={`grid gap-4 ${quickLinks.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {quickLinks.map((link, i) => (
                          <div 
                            key={i}
                            onClick={() => router.push(link.href)}
                            className="cursor-pointer flex items-center gap-3 p-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-colors border border-slate-100 hover:border-indigo-200 group"
                          >
                            <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow text-slate-500 group-hover:text-indigo-600">
                              <link.icon className="w-5 h-5" />
                            </div>
                            <span className="font-medium text-slate-700 group-hover:text-indigo-700">{link.label}</span>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {(canViewReceipts || canViewIssues) && (
                      <Card className={`flex flex-col pb-0 ${!canViewMaterials ? "flex-1" : ""}`}>
                      <h3 className="text-lg font-semibold text-slate-900 mb-6">
                        Recent Activity
                      </h3>
                      <div className="relative max-h-[300px] overflow-y-auto pr-2 custom-scrollbar pl-2">
                        {recentActivities.length > 0 ? (
                          <div className="relative pb-6">
                            {/* Vertical Timeline Line */}
                            <div className="absolute left-[15px] top-4 bottom-6 w-[2px] bg-slate-200 rounded-full z-0"></div>
                            
                            <div className="space-y-4 relative z-10">
                              {recentActivities.map((activity, i) => (
                                <div key={i} className="flex items-start gap-4 group">
                                  <div className={`p-2 rounded-full shrink-0 ${activity.iconBg} ring-4 ring-white shadow-sm transition-all group-hover:scale-110 mt-1`}>
                                    <activity.icon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-grow bg-white border border-slate-100 rounded-xl p-3 shadow-sm group-hover:border-indigo-100 transition-colors">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-slate-900 font-semibold text-sm">
                                        {activity.action}
                                      </p>
                                      <span className="text-xs text-slate-500 whitespace-nowrap ml-2 bg-slate-50 px-2 py-0.5 rounded-md">
                                        {activity.date.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <p className="text-slate-600 text-sm mb-2">
                                      {activity.details}
                                    </p>
                                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeTheme(activity.status)}`}>
                                      {activity.status}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-slate-500 text-sm relative z-10">
                            No recent activity found.
                          </div>
                        )}
                      </div>
                    </Card>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <Dialog open={show2FAPrompt}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-xl">
              Yêu cầu thiết lập bảo mật
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              Tài khoản của bạn có quyền hạn cao (Ký duyệt, Xuất nhập vật tư).
              Để đảm bảo an toàn cho hệ thống MatCost, vui lòng{" "}
              <b>bật Xác thực 2 lớp (2FA)</b> ngay bây giờ.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button
              onClick={() => router.push("/security/2fa")}
              className="w-full sm:w-2/3 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Thiết lập ngay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
