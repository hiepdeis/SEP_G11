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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { setAccessToken } from "@/lib/axios-client";
import { UserDropdown } from "@/components/user-dropdown";

interface StatData {
  label: string;
  value: string;
  trend: string;
  trendDirection: "up" | "down" | "neutral";
  icon: React.ElementType;
  theme: "blue" | "orange" | "purple" | "slate";
}

export default function DashboardPage() {
  const router = useRouter();

  const statsData: StatData[] = [
    {
      label: "Total Materials",
      value: "12,483",
      trend: "+2.5%",
      trendDirection: "up",
      icon: Package,
      theme: "blue",
    },
    {
      label: "Active Orders",
      value: "247",
      trend: "+12%",
      trendDirection: "up",
      icon: Truck,
      theme: "orange",
    },
    {
      label: "Warehouse Capacity",
      value: "78%",
      trend: "-5%",
      trendDirection: "down",
      icon: Warehouse,
      theme: "purple",
    },
    {
      label: "System Status",
      value: "Operational",
      trend: "Live Updated",
      trendDirection: "neutral",
      icon: Activity, 
      theme: "slate",
    },
  ];

  const getThemeClasses = (theme: StatData["theme"]) => {
    switch (theme) {
      case "blue":
        return "bg-blue-100 text-blue-600";
      case "orange":
        return "bg-orange-100 text-orange-600";
      case "purple":
        return "bg-purple-100 text-purple-600";
      case "slate":
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const cardDepthClass =
    "bg-white rounded-xl border border-slate-200/80 p-6 shadow-md transition-all duration-300";
  const interactiveCardClass =
    "hover:shadow-xl hover:-translate-y-1 hover:border-slate-300";

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

              {/* UserDropdown */}
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

            {/* Stats Grid with Depth and Lucide Icons */}
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
                  <div
                    key={i}
                    className={`${cardDepthClass} ${interactiveCardClass}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-slate-500 text-sm font-medium mb-1">
                          {stat.label}
                        </p>
                        <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                          {stat.value}
                        </h3>
                      </div>
                      {/* Lucide Icon with colored background */}
                      <div
                        className={`p-3 rounded-xl ${getThemeClasses(
                          stat.theme
                        )} shadow-sm`}
                      >
                        <stat.icon className="w-6 h-6" />
                      </div>
                    </div>

                    {/* Trend section with Lucide icons */}
                    <div className="flex items-center text-sm font-medium">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${trendColorClass}`}
                      >
                        <TrendIcon className="w-4 h-4" />
                        {stat.trend}
                      </span>
                      {stat.trendDirection !== "neutral" && (
                        <span className="text-slate-400 ml-2">
                          from last month
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Charts Section with Depth containers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className={cardDepthClass}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Material Inventory Overview
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 "
                  >
                    View Report
                  </Button>
                </div>

                <div className="h-64 bg-slate-50/50 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-200">
                  <div className="text-center text-slate-400 flex flex-col items-center gap-2">
                    <Activity className="w-8 h-8 opacity-50" />
                    <p className="text-sm font-medium">Chart placeholder</p>
                    <p className="text-xs">
                      Integrate Recharts or Chart.js here
                    </p>
                  </div>
                </div>
              </div>

              <div className={cardDepthClass}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Recent Order Status
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 cursor-pointer"
                  >
                    View All Orders
                  </Button>
                </div>
                <div className="h-64 bg-slate-50/50 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-200">
                  <div className="text-center text-slate-400 flex flex-col items-center gap-2">
                    <Truck className="w-8 h-8 opacity-50" />
                    <p className="text-sm font-medium">Chart placeholder</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity with Depth container */}
            <div className={cardDepthClass}>
              <h3 className="text-lg font-semibold text-slate-900 mb-6">
                Recent Activity
              </h3>
              <div className="space-y-1">
                {[
                  {
                    action: "Material Imported",
                    details: "1,250 steel beams received from supplier",
                    time: "2 hours ago",
                    icon: Package,
                    iconBg: "bg-blue-100 text-blue-600",
                  },
                  {
                    action: "Order Shipped",
                    details: "Order #MAT-5847 delivered to site",
                    time: "4 hours ago",
                    icon: Truck,
                    iconBg: "bg-orange-100 text-orange-600",
                  },
                  {
                    action: "Stock Alert",
                    details: "Low stock on Concrete Mix - SKU-2891",
                    time: "6 hours ago",
                    icon: Activity,
                    iconBg: "bg-red-100 text-red-600",
                  },
                ].map((activity, i) => (
                  <div
                    key={i}
                    className="cursor-pointer flex items-start gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors group "
                  >
                    {/* Added icon icons to activity list for visual consistency */}
                    <div
                      className={`p-2 rounded-lg shrink-0 ${activity.iconBg} group-hover:shadow-sm transition-all`}
                    >
                      <activity.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-slate-900 font-semibold text-sm">
                          {activity.action}
                        </p>
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          {activity.time}
                        </span>
                      </div>

                      <p className="text-slate-600 text-sm line-clamp-1">
                        {activity.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
