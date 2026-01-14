"use client"

import { X, LayoutGrid, Package, Download, Upload, FileText, LogOut, User, Settings, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { useSidebar } from "./sidebar-context"
import { useState } from "react"

export function Sidebar() {
  const { isExpanded, setIsExpanded } = useSidebar()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const router = useRouter()

  const navItems = [
    { label: "Dashboard", icon: LayoutGrid, href: "/dashboard" },
    { label: "Inventory", icon: Package, href: "/dashboard/inventory" },
    { label: "Import Materials", icon: Download, href: "/dashboard/import" },
    { label: "Export Materials", icon: Upload, href: "/dashboard/export" },
    { label: "Reports", icon: FileText, href: "/dashboard/reports" },
  ]

  const handleLogout = () => {
    localStorage.removeItem("auth_token")
    router.push("/")
  }

  return (
    <>
      {/* Mobile Close Button */}
      {isMobileOpen && (
        <div className="fixed top-4 left-4 z-50 lg:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsMobileOpen(false)}
            className="border-slate-300 bg-white hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Sidebar - Collapsible with smooth width animation */}
      <aside
        className={`relative hidden lg:flex h-screen bg-white border-r border-slate-200 flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${
          isExpanded ? "w-60" : "w-18"
        }`}
      >
        <div
          className={`border-b border-slate-200 p-4 flex items-center transition-all duration-300 ${
            isExpanded ? "justify-between" : "justify-center"
          }`}
        >
          {isExpanded && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-bold leading-tight text-slate-900">MatCost</h1>
                <p className="text-xs text-slate-500">Warehouse</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-600 hover:bg-slate-100 h-8 w-8 flex-shrink-0"
          >
            <ChevronLeft className={`h-5 w-5 transition-transform duration-300 ${isExpanded ? "" : "rotate-180"}`} />
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item, i) => {
            const Icon = item.icon
            const isActive = i === 0
            return (
              <a
                key={i}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon
                  className={`h-5 w-5 flex-shrink-0 transition-colors ${
                    isActive ? "text-blue-600" : "text-slate-500 group-hover:text-slate-700"
                  }`}
                />
                {isExpanded && <span className="text-sm whitespace-nowrap">{item.label}</span>}
              </a>
            )
          })}
        </nav>

        {/* User Section - Fixed at bottom with divider */}
        <div className="border-t border-slate-200 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-100 transition-colors ${
                  isExpanded ? "justify-start" : "justify-center"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0 text-white">
                  U
                </div>
                {isExpanded && (
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">User Account</p>
                    <p className="text-xs text-slate-500 truncate">user@matcost.com</p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Overlay Sidebar */}
      {isMobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsMobileOpen(false)} />
          <aside className="fixed left-0 top-0 h-screen w-60 bg-white z-40 flex flex-col overflow-y-auto">
            <div className="border-b border-slate-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-sm font-bold leading-tight text-slate-900">MatCost</h1>
                  <p className="text-xs text-slate-500">Warehouse</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileOpen(false)}
                className="text-slate-600 hover:bg-slate-100 h-8 w-8 flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="flex-1 px-2 py-4 space-y-1">
              {navItems.map((item, i) => {
                const Icon = item.icon
                const isActive = i === 0
                return (
                  <a
                    key={i}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative ${
                      isActive
                        ? "bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 flex-shrink-0 transition-colors ${
                        isActive ? "text-blue-600" : "text-slate-500 group-hover:text-slate-700"
                      }`}
                    />
                    <span className="text-sm whitespace-nowrap">{item.label}</span>
                  </a>
                )
              })}
            </nav>

            <div className="border-t border-slate-200 p-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-100 transition-colors justify-start">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0 text-white">
                      U
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">User Account</p>
                      <p className="text-xs text-slate-500 truncate">user@matcost.com</p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </aside>
        </>
      )}

      {/* Mobile Menu Button in Top Bar */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 p-2 lg:hidden hover:bg-slate-100 rounded-lg transition-colors text-slate-600 bg-white border border-slate-300"
      >
        {isMobileOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>
    </>
  )
}
