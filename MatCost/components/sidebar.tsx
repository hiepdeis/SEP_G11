"use client";

import {
  X,
  LayoutGrid,
  Package,
  Download,
  Upload,
  FileText,
  User,
  Settings,
  ChevronLeft,
  ChevronDown,
  ClipboardCheck,
  Users,
  Database,
  Bell,
  LayoutDashboard,
  BrickWall,
  Cable,
  FolderKanban,
  Warehouse,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { useRouter, usePathname } from "next/navigation";
import { useSidebar } from "./sidebar-context";
import { useEffect, useMemo, useState } from "react";
import { UserDropdown } from "@/components/user-dropdown";
import { useAuth } from "@/components/providers/auth-provider";
import { userApi } from "@/services/user-service";
import { useTranslation } from "react-i18next";
import IncomingShipments from "@/app/(protected)/outbound/contruction/IncomingShipments/page";

export function Sidebar() {
  const { t } = useTranslation();
  const { isExpanded, setIsExpanded } = useSidebar();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user: userDecode } = useAuth();

  const [showInboundMobile, setShowInboundMobile] = useState(false);
  const [showOutboundMobile, setShowOutboundMobile] = useState(false);
  const [showReportsMobile, setShowReportsMobile] = useState(false);
  const [openMobileReportRole, setOpenMobileReportRole] = useState<
    string | null
  >(null);

  const [devBypassRole, setDevBypassRole] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("DEV_BYPASS_ROLE") === "true";
    }
    return false;
  });

  useEffect(() => {
    const handleStorage = () => {
      setDevBypassRole(localStorage.getItem("DEV_BYPASS_ROLE") === "true");
    };
    window.addEventListener("storage", handleStorage);
    const id = setInterval(handleStorage, 1000);
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(id);
    };
  }, []);

  const navItems = [
    {
      label: t("sidebar.dashboard"),
      icon: LayoutGrid,
      href: `/${userDecode?.role.toLowerCase()}`,
    },
    {
      label: t("sidebar.materials"),
      icon: BrickWall,
      href: `/${userDecode?.role.toLowerCase()}/materials`,
      roles: ["Manager", "Staff"],
    },
    {
      label: t("sidebar.warehouses"),
      icon: Warehouse,
      href: `/${userDecode?.role.toLowerCase()}/warehouses`,
      roles: ["Manager", "Staff"],
    },
    {
      label: t("sidebar.suppliers"),
      icon: Cable,
      href: `/${userDecode?.role.toLowerCase()}/suppliers`,
      roles: ["Purchasing", "Accountant"],
    },
    {
      label: t("sidebar.projects"),
      icon: FolderKanban,
      href: `/${userDecode?.role.toLowerCase()}/projects`,
      roles: ["Accountant"],
    },
  ];

  const outboundTabs = [
    {
      label: t("sidebar.tabs.issue_slips"),
      href: "/outbound/common/IssueSlipList",
    },
    {
      label: t("sidebar.roles.construction"),
      href: "/outbound/contruction/IncomingShipments",
    },
    // { label: t("sidebar.roles.accountant"), href: "/outbound/account" },
    // { label: t("sidebar.roles.manager"), href: "/outbound/manager" },
    // {
    //   label: t("sidebar.tabs.inventory_issue"),
    //   href: "/outbound/staff/InventoryIssueList",
    // },
  ];

  const allAuditTabs = [
    { label: t("sidebar.roles.admin"), href: "/admin/audit", roles: ["Admin"] },
    {
      label: t("sidebar.roles.accountant"),
      href: "/accountant/audit",
      roles: ["Accountant"],
    },
    {
      label: t("sidebar.roles.manager"),
      href: "/manager/audit",
      roles: ["Manager"],
    },
    { label: t("sidebar.roles.staff"), href: "/staff/audit", roles: ["Staff"] },
  ];

  const allReportRoles = [
    {
      id: "staff",
      label: t("sidebar.roles.staff"),
      href: "/staff/reports",
      roles: ["Staff"],
      categories: [
        {
          label: t("sidebar.tabs.import_export"),
          href: "/staff/reports/import-export",
        },
        {
          label: t("sidebar.tabs.incident_reports"),
          href: "/staff/reports/incident",
        },
      ],
    },
    {
      id: "manager",
      label: t("sidebar.roles.manager"),
      href: "/manager/reports",
      roles: ["Manager"],
      categories: [
        {
          label: t("sidebar.tabs.import_export"),
          href: "/manager/reports/import-export",
        },
        {
          label: t("sidebar.tabs.incident_reports"),
          href: "/manager/reports/incident",
        },
      ],
    },
    {
      label: t("sidebar.roles.admin"),
      href: "/admin/reports",
      roles: ["Admin"],
      categories: [
        {
          label: t("sidebar.tabs.import_export"),
          href: "/admin/reports/import-export",
        },
        {
          label: t("sidebar.tabs.incident_reports"),
          href: "/admin/reports/incident",
        },
      ],
    },
  ];

  const allInboundTabs = [
    {
      label: t("sidebar.roles.admin"),
      href: "/admin",
      roles: ["Admin"],
      subItems: [
        {
          label: t("sidebar.tabs.purchase_requests"),
          href: "/admin/purchase-requests",
        },
        {
          label: t("sidebar.tabs.purchase_orders"),
          href: "/admin/purchase-orders",
        },
      ],
    },
    {
      label: t("sidebar.roles.purchase"),
      href: "/purchasing",
      roles: ["Purchasing"],
      subItems: [
        {
          label: t("sidebar.tabs.purchase_orders"),
          href: "/purchasing/purchase-orders",
        },
        {
          label: t("sidebar.tabs.incident_reports"),
          href: "/purchasing/incident-reports",
        },
      ],
    },
    {
      label: t("sidebar.roles.accountant"),
      href: "/accountant",
      roles: ["Accountant"],
      subItems: [
        {
          label: t("sidebar.tabs.purchase_orders"),
          href: "/accountant/purchase-orders",
        },
        {
          label: t("sidebar.tabs.inbound_requests"),
          href: "/accountant/inbound-requests",
        },
      ],
    },
    {
      label: t("sidebar.roles.manager"),
      href: "/manager",
      roles: ["Manager"],
      subItems: [
        {
          label: t("sidebar.tabs.pending_pos"),
          href: "/manager/pending-pos",
        },
        {
          label: t("sidebar.tabs.stock_shortage_alerts"),
          href: "/manager/alerts",
        },
        {
          label: t("sidebar.tabs.incident_reports"),
          href: "/manager/incident-reports",
        },
        {
          label: t("sidebar.tabs.inbound_requests"),
          href: "/manager/inbound-requests",
        },
      ],
    },
    {
      label: t("sidebar.roles.staff"),
      href: "/staff",
      roles: ["Staff"],
      subItems: [
        {
          label: t("sidebar.tabs.pending_pos"),
          href: "/staff/pending-pos",
        },
        {
          label: t("sidebar.tabs.inbound_requests"),
          href: "/staff/inbound-requests",
        },
        {
          label: t("sidebar.tabs.incident_reports"),
          href: "/staff/incident-reports",
        },
      ],
    },
  ];

  const userRole = userDecode?.role ?? "";

  const filteredNavItems = useMemo(() => {
    if (devBypassRole) return navItems;
    return navItems.filter((item) => {
      if (!item.roles) return true;
      return item.roles.includes(userRole);
    });
  }, [devBypassRole, userRole, t, userDecode]);

  type InboundTab = {
    label: string;
    href: string;
    roles?: string[];
    subItems?: { label: string; href: string }[];
  };

  const inboundTabs: InboundTab[] = useMemo(() => {
    if (devBypassRole) return allInboundTabs;
    return allInboundTabs
      .filter((tab) => tab.roles.includes(userRole))
      .flatMap((tab) =>
        tab.subItems
          ? tab.subItems.map((sub) => ({ label: sub.label, href: sub.href }))
          : [{ label: tab.label, href: tab.href }],
      );
  }, [devBypassRole, userRole, t]);

  const auditTabs = useMemo(() => {
    if (devBypassRole) return allAuditTabs;
    return allAuditTabs.filter((tab) => tab.roles.includes(userRole));
  }, [devBypassRole, userRole, t]);

  type ReportTab = {
    label: string;
    href: string;
    id?: string;
    roles?: string[];
    categories?: { label: string; href: string }[];
  };

  const reportRoles: ReportTab[] = useMemo(() => {
    if (devBypassRole) return allReportRoles;
    return allReportRoles
      .filter((r) => r.roles.includes(userRole))
      .flatMap((r) =>
        r.categories.map((cat) => ({ label: cat.label, href: cat.href })),
      );
  }, [devBypassRole, userRole, t]);

  const adminNavItems = [
    { label: t("sidebar.admin_users"), icon: Users, href: "/admin/users" },
    {
      label: t("sidebar.admin_master_data"),
      icon: Database,
      href: "/admin/master-data",
    },
    // {
    //   label: t("sidebar.admin_notifications"),
    //   icon: Bell,
    //   href: "/admin/notifications",
    // },
  ];

  const isReportActive =
    pathname.match("/reports") || pathname.match(/\/reports\//);
  const [showAuditMobile, setShowAuditMobile] = useState(false);

  return (
    <>
      {/* {isMobileOpen && (
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
      )} */}

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
                  {t("sidebar.enterprise_warehouse") || "Enterprise Warehouse"}
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

        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto no-scrollbar">
          {filteredNavItems.map((item, i) => {
            const Icon = item.icon;
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
                {isActive && isExpanded && (
                  <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                )}
              </a>
            );
          })}

          {/* Inbound (Import) Dropdown */}
          {inboundTabs.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`
                  relative flex gap-3 px-3 py-3 rounded-xl transition-all duration-300 group overflow-hidden w-full
                  ${
                    pathname.match("/material-request") ||
                    pathname.match("/import-request")
                      ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm"
                  }
                  ${isExpanded ? "justify-start" : "justify-center"}
                `}
                >
                  <Download
                    className={`
                    h-5 w-5 flex-shrink-0 transition-all duration-300
                    ${
                      pathname.match("/material-request") ||
                      pathname.match("/import-request")
                        ? "text-blue-600 scale-110"
                        : "text-slate-400 group-hover:text-slate-600 group-hover:scale-110"
                    }
                  `}
                  />
                  {isExpanded && (
                    <>
                      <span className="text-sm font-medium whitespace-nowrap">
                        {t("sidebar.inbound")}
                      </span>
                      <ChevronDown className="w-4 h-4 ml-auto" />
                    </>
                  )}
                  {(pathname.match("/material-request") ||
                    pathname.match("/import-request")) && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="start"
                className="ml-4 w-56"
              >
                {inboundTabs.map((tab) =>
                  "subItems" in tab && tab.subItems ? (
                    <DropdownMenuSub key={tab.label}>
                      <DropdownMenuSubTrigger className="cursor-pointer">
                        {tab.label}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent className="w-48">
                          {tab.subItems.map(
                            (sub: { label: string; href: string }) => (
                              <DropdownMenuItem
                                key={sub.href}
                                onClick={() => router.push(sub.href)}
                                className={
                                  pathname === sub.href
                                    ? "bg-blue-100 font-semibold"
                                    : ""
                                }
                              >
                                {sub.label}
                              </DropdownMenuItem>
                            ),
                          )}
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  ) : (
                    <DropdownMenuItem
                      key={tab.href}
                      onClick={() => router.push(tab.href)}
                      className={
                        pathname === tab.href ? "bg-blue-100 font-semibold" : ""
                      }
                    >
                      {tab.label}
                    </DropdownMenuItem>
                  ),
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Outbound Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`
                  relative flex gap-3 px-3 py-3 rounded-xl transition-all duration-300 group overflow-hidden w-full
                  ${
                    pathname.startsWith("/outbound")
                      ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm"
                  }
                  ${isExpanded ? "justify-start" : "justify-center"}
                `}
              >
                <Upload
                  className={`
                    h-5 w-5 flex-shrink-0 transition-all duration-300
                    ${
                      pathname.startsWith("/outbound")
                        ? "text-blue-600 scale-110"
                        : "text-slate-400 group-hover:text-slate-600 group-hover:scale-110"
                    }
                  `}
                />
                {isExpanded && (
                  <>
                    <span className="text-sm font-medium whitespace-nowrap">
                      {t("sidebar.outbound")}
                    </span>
                    <ChevronDown className="w-4 h-4 ml-auto" />
                  </>
                )}
                {pathname.startsWith("/outbound") && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="ml-4">
              {outboundTabs.map((tab) => (
                <DropdownMenuItem
                  key={tab.href}
                  onClick={() => router.push(tab.href)}
                  className={
                    pathname === tab.href ? "bg-blue-100 font-semibold" : ""
                  }
                >
                  {tab.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {reportRoles.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`
                  relative flex gap-3 px-3 py-3 rounded-xl transition-all duration-300 group overflow-hidden w-full
                  ${
                    isReportActive
                      ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm"
                  }
                  ${isExpanded ? "justify-start" : "justify-center"}
                `}
                >
                  <FileText
                    className={`
                    h-5 w-5 flex-shrink-0 transition-all duration-300
                    ${
                      isReportActive
                        ? "text-blue-600 scale-110"
                        : "text-slate-400 group-hover:text-slate-600 group-hover:scale-110"
                    }
                  `}
                  />
                  {isExpanded && (
                    <>
                      <span className="text-sm font-medium whitespace-nowrap">
                        {t("sidebar.reports")}
                      </span>
                      <ChevronDown className="w-4 h-4 ml-auto" />
                    </>
                  )}
                  {isReportActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="start"
                className="ml-4 w-56"
              >
                {reportRoles.map((role) =>
                  "categories" in role && role.categories ? (
                    <DropdownMenuSub key={role.href}>
                      <DropdownMenuSubTrigger
                        className="cursor-pointer"
                        onClick={() => router.push(role.href)}
                      >
                        <span>{role.label}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent className="w-44">
                          {role.categories.map(
                            (cat: { label: string; href: string }) => (
                              <DropdownMenuItem
                                key={cat.href}
                                onClick={() => router.push(cat.href)}
                                className={
                                  pathname === cat.href
                                    ? "bg-blue-100 font-semibold"
                                    : ""
                                }
                              >
                                {cat.label}
                              </DropdownMenuItem>
                            ),
                          )}
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  ) : (
                    <DropdownMenuItem
                      key={role.href}
                      onClick={() => router.push(role.href)}
                      className={
                        pathname === role.href
                          ? "bg-blue-100 font-semibold"
                          : ""
                      }
                    >
                      {role.label}
                    </DropdownMenuItem>
                  ),
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Audit Dropdown */}
          {auditTabs.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`
                  relative flex gap-3 px-3 py-3 rounded-xl transition-all duration-300 group overflow-hidden w-full
                  ${
                    pathname.includes("/audit")
                      ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm"
                  }
                  ${isExpanded ? "justify-start" : "justify-center"}
                `}
                >
                  <ClipboardCheck
                    className={`
                    h-5 w-5 flex-shrink-0 transition-all duration-300
                    ${
                      pathname.includes("/audit")
                        ? "text-blue-600 scale-110"
                        : "text-slate-400 group-hover:text-slate-600 group-hover:scale-110"
                    }
                  `}
                  />
                  {isExpanded && (
                    <>
                      <span className="text-sm font-medium whitespace-nowrap">
                        {t("sidebar.audit")}
                      </span>
                      <ChevronDown className="w-4 h-4 ml-auto" />
                    </>
                  )}
                  {pathname.includes("/audit") && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="ml-4">
                {auditTabs.map((tab) => (
                  <DropdownMenuItem
                    key={tab.href}
                    onClick={() => router.push(tab.href)}
                    className={
                      pathname.startsWith(tab.href)
                        ? "bg-blue-100 font-semibold text-blue-700"
                        : ""
                    }
                  >
                    {tab.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <a
            href="/security/2fa"
            className={`
              relative flex gap-3 px-3 py-3 rounded-xl transition-all duration-300 group overflow-hidden w-full
              ${
                pathname.includes("/security/2fa")
                  ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm"
              }
              ${isExpanded ? "justify-start" : "justify-center"}
            `}
          >
            <ShieldCheck
              className={`
                h-5 w-5 flex-shrink-0 transition-all duration-300
                ${
                  pathname.includes("/security/2fa")
                    ? "text-blue-600 scale-110"
                    : "text-slate-400 group-hover:text-slate-600 group-hover:scale-110"
                }
              `}
            />
            {isExpanded && (
              <span className="text-sm font-medium whitespace-nowrap">
                Bảo mật 2FA
              </span>
            )}
            {pathname.includes("/security/2fa") && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full" />
            )}
          </a>

          {/* Admin Section */}
          {userDecode?.role === "Admin" && (
            <div className="pt-4 mt-4 border-t border-slate-100">
              {isExpanded && (
                <p className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider animate-in fade-in duration-500">
                  System
                </p>
              )}
              <div className="space-y-1">
                {adminNavItems.map((item, i) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <button
                      key={i}
                      onClick={() => router.push(item.href)}
                      className={`
                      relative flex gap-3 px-3 py-3 rounded-xl transition-all duration-300 group overflow-hidden w-full
                      ${
                        isActive
                          ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm"
                      }
                      ${isExpanded ? "justify-start" : "justify-center"}
                    `}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-600 rounded-r-full" />
                      )}
                      <Icon
                        className={`
                          h-4.5 w-4.5 flex-shrink-0 transition-all duration-300
                          ${
                            isActive
                              ? "text-indigo-600 scale-110"
                              : "text-slate-400 group-hover:text-slate-600"
                          }
                        `}
                      />
                      {isExpanded && (
                        <span className="text-sm font-medium whitespace-nowrap">
                          {item.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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
                </div>

                {isExpanded && (
                  <div className="flex-1 text-left min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {userDecode?.fullName || "Loading..."}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {userDecode?.email || "..."}
                    </p>
                  </div>
                )}

                {isExpanded && <Settings className="w-4 h-4 text-slate-400" />}
              </button>
            }
          />
        </div>
      </aside>

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
                onClick={() => {
                  setIsMobileOpen(false);
                  setIsExpanded(!isExpanded);
                }}
                className="text-slate-500 hover:text-white bg-slate-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2">
              {filteredNavItems.map((item, i) => {
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

              {/* Outbound Accordion Mobile */}
              <div className="space-y-1">
                <button
                  onClick={() => setShowOutboundMobile((v) => !v)}
                  className={`
                    flex items-center gap-4 px-4 py-3.5 rounded-xl w-full transition-all duration-200 group relative
                    ${
                      pathname.startsWith("/outbound")
                        ? "bg-blue-50 text-blue-700 font-semibold shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }
                  `}
                >
                  <Upload
                    className={`h-5 w-5 flex-shrink-0 transition-colors ${
                      pathname.startsWith("/outbound")
                        ? "text-blue-600"
                        : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span className="text-base flex-1 text-left">Outbound</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${showOutboundMobile ? "rotate-180" : ""}`}
                  />
                </button>

                {showOutboundMobile && (
                  <div className="ml-10 flex flex-col gap-1 border-l-2 border-slate-100 pl-2">
                    {outboundTabs.map((tab) => (
                      <a
                        key={tab.href}
                        href={tab.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          pathname === tab.href
                            ? "bg-blue-100 text-blue-700 font-semibold"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        }`}
                      >
                        {tab.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Inbound Accordion Mobile */}
              <div className="space-y-1">
                <button
                  onClick={() => setShowInboundMobile((v) => !v)}
                  className={`
                    flex items-center gap-4 px-4 py-3.5 rounded-xl w-full transition-all duration-200 group relative
                    ${
                      pathname.match("/material-request") ||
                      pathname.match("/import-request")
                        ? "bg-blue-50 text-blue-700 font-semibold shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }
                  `}
                >
                  <Download
                    className={`h-5 w-5 flex-shrink-0 transition-colors ${
                      pathname.match("/material-request") ||
                      pathname.match("/import-request")
                        ? "text-blue-600"
                        : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span className="text-base flex-1 text-left">
                    {t("sidebar.inbound")}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${showInboundMobile ? "rotate-180" : ""}`}
                  />
                </button>

                {showInboundMobile && (
                  <div className="ml-10 flex flex-col gap-1 border-l-2 border-slate-100 pl-2">
                    {inboundTabs.map((tab) =>
                      "subItems" in tab && tab.subItems ? (
                        <div key={tab.label}>
                          <p className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase">
                            {tab.label}
                          </p>
                          {tab.subItems.map(
                            (sub: { label: string; href: string }) => (
                              <a
                                key={sub.href}
                                href={sub.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={`px-3 py-2 rounded-lg text-sm transition-colors block ${
                                  pathname === sub.href
                                    ? "bg-blue-100 text-blue-700 font-semibold"
                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                }`}
                              >
                                {sub.label}
                              </a>
                            ),
                          )}
                        </div>
                      ) : (
                        <a
                          key={tab.href}
                          href={tab.href}
                          onClick={() => setIsMobileOpen(false)}
                          className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                            pathname === tab.href
                              ? "bg-blue-100 text-blue-700 font-semibold"
                              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          }`}
                        >
                          {tab.label}
                        </a>
                      ),
                    )}
                  </div>
                )}
              </div>

              {/* Audit Dropdown Mobile */}
              <div className="space-y-1">
                <button
                  onClick={() => setShowAuditMobile((v) => !v)}
                  className={`
                    flex items-center gap-4 px-4 py-3.5 rounded-xl w-full transition-all duration-200 group relative
                    ${
                      pathname.includes("/audit")
                        ? "bg-blue-50 text-blue-700 font-semibold shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }
                  `}
                >
                  <ClipboardCheck
                    className={`h-5 w-5 flex-shrink-0 transition-colors ${pathname.includes("/audit") ? "text-blue-600" : "text-slate-400"}`}
                  />
                  <span className="text-base flex-1 text-left">Audit</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${showAuditMobile ? "rotate-180" : ""}`}
                  />
                </button>
                {showAuditMobile && (
                  <div className="ml-12 flex flex-col gap-1 border-l-2 border-slate-100 pl-3">
                    {auditTabs.map((tab) => (
                      <a
                        key={tab.href}
                        href={tab.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={`px-3 py-2 rounded-lg text-sm ${
                          pathname.startsWith(tab.href)
                            ? "bg-blue-100 text-blue-700 font-semibold"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {tab.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Reports Accordion Mobile */}
              <div className="space-y-1">
                <button
                  onClick={() => setShowReportsMobile((v) => !v)}
                  className={`
                    flex items-center gap-4 px-4 py-3.5 rounded-xl w-full transition-all duration-200 group relative
                    ${
                      isReportActive
                        ? "bg-blue-50 text-blue-700 font-semibold shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }
                  `}
                >
                  <FileText
                    className={`h-5 w-5 flex-shrink-0 transition-colors ${
                      isReportActive
                        ? "text-blue-600"
                        : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span className="text-base flex-1 text-left">Reports</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${showReportsMobile ? "rotate-180" : ""}`}
                  />
                </button>

                {showReportsMobile && (
                  <div className="ml-10 flex flex-col gap-2 mt-2 border-l-2 border-slate-100 pl-2">
                    {reportRoles.map((role) => (
                      <div key={role.id} className="flex flex-col">
                        <div className="flex items-center justify-between hover:bg-slate-50 rounded-lg pr-2">
                          <a
                            href={role.href}
                            onClick={() => setIsMobileOpen(false)}
                            className="flex-1 px-3 py-2 text-sm text-slate-700 font-medium"
                          >
                            {role.label}
                          </a>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              setOpenMobileReportRole(
                                openMobileReportRole === role.id
                                  ? null
                                  : (role.id ?? null),
                              );
                            }}
                            className="p-2 text-slate-400 hover:text-slate-700"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${openMobileReportRole === role.id ? "rotate-180" : ""}`}
                            />
                          </button>
                        </div>

                        {openMobileReportRole === role.id && (
                          <div className="ml-4 flex flex-col gap-1 mt-1">
                            {role.categories?.map((cat) => (
                              <a
                                key={cat.href}
                                href={cat.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                                  pathname === cat.href
                                    ? "bg-blue-50 text-blue-700 font-semibold"
                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                }`}
                              >
                                {cat.label}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <a
                href="/security/2fa"
                onClick={() => setIsMobileOpen(false)}
                className={`
                  flex items-center gap-4 px-4 py-3.5 rounded-xl w-full transition-all duration-200 group relative
                  ${
                    pathname.includes("/security/2fa")
                      ? "bg-blue-50 text-blue-700 font-semibold shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }
                `}
              >
                {pathname.includes("/security/2fa") && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-blue-600 rounded-r-full"></div>
                )}
                <ShieldCheck
                  className={`h-5 w-5 flex-shrink-0 transition-colors ${
                    pathname.includes("/security/2fa")
                      ? "text-blue-600"
                      : "text-slate-400 group-hover:text-slate-600"
                  }`}
                />
                <span className="text-base flex-1 text-left">Bảo mật 2FA</span>
              </a>
            </nav>
            <nav>
              <a
                href="/security/2fa"
                onClick={() => setIsMobileOpen(false)}
                className={`
                  flex items-center gap-4 px-4 py-3.5 rounded-xl w-full transition-all duration-200 group relative
                  ${
                    pathname.includes("/security/2fa")
                      ? "bg-blue-50 text-blue-700 font-semibold shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }
                `}
              >
                {pathname.includes("/security/2fa") && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-blue-600 rounded-r-full"></div>
                )}
                <ShieldCheck
                  className={`h-5 w-5 flex-shrink-0 transition-colors ${
                    pathname.includes("/security/2fa")
                      ? "text-blue-600"
                      : "text-slate-400 group-hover:text-slate-600"
                  }`}
                />
                <span className="text-base flex-1 text-left">Bảo mật 2FA</span>
              </a>
            </nav>

            {/* Admin Mobile Section */}
            {userDecode?.role === "Admin" && (
              <div className="pt-4 mt-4 border-t border-slate-100">
                <p className="px-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  System
                </p>
                <div className="space-y-1 px-2">
                  {adminNavItems.map((item, i) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <a
                        key={i}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={`
                          flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                          ${
                            isActive
                              ? "bg-indigo-50 text-indigo-700 font-semibold shadow-sm"
                              : "text-slate-600 hover:bg-slate-50"
                          }
                        `}
                      >
                        <Icon
                          className={`h-5 w-5 ${isActive ? "text-indigo-600" : "text-slate-400"}`}
                        />
                        <span className="text-base">{item.label}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="border-t border-slate-100 p-4 bg-slate-50/50">
              <UserDropdown
                side="top"
                align="center"
                trigger={
                  <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-md shadow-indigo-200 ring-2 ring-white">
                        <User className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {userDecode?.fullName || "Loading..."}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {userDecode?.email || "..."}
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
      {(!isExpanded || !isMobileOpen) && (
        <button
          onClick={() => {
            setIsMobileOpen(!isMobileOpen);
            setIsExpanded(!isExpanded);
          }}
          className="fixed top-14 left-4 z-50 p-2 lg:hidden hover:bg-slate-100 rounded-xl transition-colors text-slate-600 bg-white border border-slate-200 shadow-md"
        >
          {isMobileOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <svg
              className="h-4 w-4"
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
      )}
    </>
  );
}
