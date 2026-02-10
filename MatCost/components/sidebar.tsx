"use client";

import {
  X,
  LayoutGrid,
  Package,
  Download,
  Upload,
  FileText,
  LogOut,
  User,
  Settings,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter, usePathname } from "next/navigation";
import { useSidebar } from "./sidebar-context";
import { useState } from "react";
import { UserDropdown } from "@/components/user-dropdown";

export function Sidebar() {
  const { isExpanded, setIsExpanded } = useSidebar();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", icon: LayoutGrid, href: "/dashboard" },
    { label: "Inventory", icon: Package, href: "/dashboard/inventory" },
    { label: "Import Materials", icon: Download, href: "/dashboard/import" },
    { label: "Export Materials", icon: Upload, href: "/dashboard/export" },
    { label: "Reports", icon: FileText, href: "/dashboard/reports" },
  ];

  return (
    <>
      {/* Mobile Close Button */}
      {isMobileOpen && (
        <div className="fixed top-4 left-4 z-50 lg:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsMobileOpen(false)}
            className="border-slate-300 bg-white hover:bg-slate-100 shadow-md"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Sidebar - Collapsible with smooth width animation */}
      <aside
        className={`relative hidden lg:flex h-screen bg-white border-r border-slate-200 flex-col flex-shrink-0 transition-all duration-300 ease-in-out shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-20 ${
          isExpanded ? "w-64" : "w-20"
        }`}
      >
        <div
          className={`border-b border-slate-100 p-6 flex items-center transition-all duration-300 ${
            isExpanded ? "justify-between" : "justify-center"
          }`}
        >
          {isExpanded && (
            <div className="flex items-center gap-3 animate-in fade-in duration-300">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-orange-200 shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight text-slate-900 tracking-tight">
                  MatCost
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Enterprise Warehouse
                </p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 h-8 w-8 flex-shrink-0 rounded-full"
          >
            <ChevronLeft
              className={`h-5 w-5 transition-transform duration-300 ${
                isExpanded ? "" : "rotate-180"
              }`}
            />
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-2">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            // Logic to check active state (handling sub-routes if necessary)
            const isActive = pathname === item.href;

            return (
              <a
                key={i}
                href={item.href}
                className={`
                  relative flex gap-3 px-3 py-3 rounded-xl transition-all duration-300 group overflow-hidden
                  ${
                    isActive
                      ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm"
                  }
                  ${isExpanded ? "justify-start" : "justify-center"}
                `}
              >
                {/* Active Indicator Strip */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full" />
                )}

                <Icon
                  className={`
                    h-5 w-5 flex-shrink-0 transition-all duration-300
                    ${
                      isActive
                        ? "text-blue-600 scale-110"
                        : "text-slate-400 group-hover:text-slate-600 group-hover:scale-110"
                    }
                  `}
                />

                {isExpanded && (
                  <span
                    className={`text-sm font-medium whitespace-nowrap transition-transform duration-300 ${
                      !isActive && "group-hover:translate-x-1"
                    }`}
                  >
                    {item.label}
                  </span>
                )}

                {/* Active Glow Effect */}
                {isActive && isExpanded && (
                  <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                )}
              </a>
            );
          })}
        </nav>

        {/* User Section - Synced with Dashboard Style */}
        <div className="border-t border-slate-100 p-4">
          <UserDropdown
            side="right"
            align="end"
            trigger={
              <button
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-all duration-200 border border-transparent hover:border-slate-200 outline-none focus:ring-2 focus:ring-indigo-100 ${
                  isExpanded ? "justify-start" : "justify-center"
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-md shadow-indigo-200 ring-2 ring-white">
                    <User className="h-5 w-5" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                </div>

                {isExpanded && (
                  <div className="flex-1 text-left min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      User Account
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      user@matcost.com
                    </p>
                  </div>
                )}

                {isExpanded && <Settings className="w-4 h-4 text-slate-400" />}
              </button>
            }
          />
        </div>
      </aside>

      {/* Mobile Overlay Sidebar - Updated visuals */}
      {isMobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside className="fixed left-0 top-0 h-screen w-72 bg-white/95 backdrop-blur-xl z-40 flex flex-col overflow-y-auto border-r border-slate-200 shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="border-b border-slate-100 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-200">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-bold leading-tight text-slate-900">
                    MatCost
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Mobile Access
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileOpen(false)}
                className="text-slate-500 hover:bg-slate-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2">
              {navItems.map((item, i) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <a
                    key={i}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group relative ${
                      isActive
                        ? "bg-blue-50 text-blue-700 font-semibold shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-blue-600 rounded-r-full"></div>
                    )}
                    <Icon
                      className={`h-5 w-5 flex-shrink-0 transition-colors ${
                        isActive
                          ? "text-blue-600"
                          : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />
                    <span className="text-base">{item.label}</span>
                  </a>
                );
              })}
            </nav>

            <div className="border-t border-slate-100 p-4 bg-slate-50/50">
              <UserDropdown 
                side="top"
                align="center"
                trigger={
                  <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0 text-white ring-2 ring-indigo-50">
                      U
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        User Account
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        user@matcost.com
                      </p>
                    </div>
                    <Settings className="w-5 h-5 text-slate-400" />
                  </button>
                }
              />
            </div>
          </aside>
        </>
      )}

      {/* Mobile Trigger */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 p-2 lg:hidden hover:bg-slate-100 rounded-xl transition-colors text-slate-600 bg-white border border-slate-200 shadow-md"
      >
        {isMobileOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        )}
      </button>
    </>
  );
}
