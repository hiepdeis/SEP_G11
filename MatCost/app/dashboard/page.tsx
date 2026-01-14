"use client"
import { Sidebar } from "@/components/sidebar"
import { Bell, User } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem("auth_token")
    router.push("/")
  }

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50">
      {/* Sidebar takes fixed width (animated), does not overlay */}
      <Sidebar />

      <main className="flex-grow flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="hidden md:block">
              <h2 className="text-lg font-semibold text-slate-900">Dashboard</h2>
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600">
                <Bell className="w-5 h-5" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    U
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleLogout}>
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto">
          <div className="px-6 lg:px-10 py-10">
            {/* Welcome Section */}
            <div className="mb-10">
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Welcome to MatCost</h1>
              <p className="text-slate-600 text-lg">Construction material inventory and management overview</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                {
                  label: "Total Materials",
                  value: "12,483",
                  trend: "+2.5%",
                  icon: "📦",
                },
                {
                  label: "Active Orders",
                  value: "247",
                  trend: "+12%",
                  icon: "🚚",
                },
                {
                  label: "Warehouse Capacity",
                  value: "78%",
                  trend: "-5%",
                  icon: "🏢",
                },
                {
                  label: "Last Updated",
                  value: "Now",
                  trend: "Live",
                  icon: "⏱️",
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-slate-600 text-sm font-medium">{stat.label}</p>
                      <h3 className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</h3>
                    </div>
                    <span className="text-2xl">{stat.icon}</span>
                  </div>
                  <p
                    className={`text-xs font-semibold ${
                      stat.trend.startsWith("+")
                        ? "text-green-600"
                        : stat.trend.startsWith("-")
                          ? "text-red-600"
                          : "text-blue-600"
                    }`}
                  >
                    {stat.trend}
                  </p>
                </div>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Material Inventory</h3>
                <div className="h-48 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
                  <p className="text-slate-500 text-sm">Chart placeholder - Add chart library</p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Order Status</h3>
                <div className="h-48 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
                  <p className="text-slate-500 text-sm">Chart placeholder - Add chart library</p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {[
                  {
                    action: "Material Imported",
                    details: "1,250 steel beams received from supplier",
                    time: "2 hours ago",
                  },
                  {
                    action: "Order Shipped",
                    details: "Order #MAT-5847 delivered to site",
                    time: "4 hours ago",
                  },
                  {
                    action: "Stock Alert",
                    details: "Low stock on Concrete Mix - SKU-2891",
                    time: "6 hours ago",
                  },
                ].map((activity, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between py-3 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <p className="text-slate-900 font-medium">{activity.action}</p>
                      <p className="text-slate-600 text-sm">{activity.details}</p>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap ml-4">{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
