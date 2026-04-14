"use client";

import { useState, useEffect, useMemo } from "react";
import { Bell, Loader2, Info, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "react-i18next";
import { adminNotificationApi, managerNotificationApi, NotificationDto } from "@/services/import-service";
import { staffNotificationApi, accountantNotificationApi, managerAuditNotificationApi } from "@/services/audit-service";

const ENTITY_URL_MAP: Record<string, string> = {
  "StockShortageAlert": "alerts",
  "Audit": "audit",
};

const ROLES_CONFIG = [
  { id: "Manager", label: "Manager", path: "/manager", api: managerAuditNotificationApi },
  { id: "Admin", label: "Admin", path: "/admin", api: adminNotificationApi },
  { id: "Accountant", label: "Accountant", path: "/accountant", api: accountantNotificationApi },
  { id: "Staff", label: "Staff", path: "/staff", api: staffNotificationApi },
] as const;

type RoleId = typeof ROLES_CONFIG[number]["id"];

export function NotificationDropdown() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState<RoleId>("Manager");
  const [notifications, setNotifications] = useState<Record<RoleId, NotificationDto[]>>({
    Manager: [],
    Admin: [],
    Accountant: [],
    Staff: [],
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const totalUnread = useMemo(() => 
    Object.values(notifications).reduce((acc, list) => acc + (list?.length || 0), 0), 
  [notifications]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const results = await Promise.all(
          ROLES_CONFIG.map(role => 
            role.api.getUnreadNotifications(0, 50).catch((err) => {
              console.warn(`Bỏ qua fetch thông báo cho role ${role.id} do lỗi phân quyền.`);
              return { data: [] };
            })
          )
        );
        
        const newNotifs = {} as Record<RoleId, NotificationDto[]>;
        ROLES_CONFIG.forEach((role, index) => {
          const resData = results[index]?.data;
          newNotifs[role.id] = Array.isArray(resData) ? resData : (resData?.items || []);
        });
        
        setNotifications(newNotifs);
      } catch (error) {
        console.error("Failed to fetch notifications", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, [isOpen]);

  const handleNotificationClick = (notif: NotificationDto) => {
    const currentRoleConfig = ROLES_CONFIG.find(r => r.id === activeTab);
    let entityPath = ENTITY_URL_MAP[notif.relatedEntityType] || "notifications";

    if (notif.relatedEntityType === "Audit" && activeTab === "Staff") {
        entityPath = "audit/manual-count"; 
    }
    
    const targetUrl = notif.relatedEntityId 
        ? `${currentRoleConfig?.path}/${entityPath}/${notif.relatedEntityId}`
        : `${currentRoleConfig?.path}/${entityPath}`;
    
    setIsOpen(false);
    router.push(targetUrl);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 relative outline-none">
          <Bell className="w-5 h-5" />
          {totalUnread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
          )}
        </button>
      </PopoverTrigger>
      
      <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-xl border-slate-200">
        <div className="flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 rounded-t-lg flex justify-between">
            <h3 className="font-semibold text-slate-800">{t("Notifications")}</h3>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              {activeTab} View
            </span>
          </div>

          {/* Tabs - Cuộn ngang nếu quá nhiều Role */}
          <div className="flex items-center border-b border-slate-100 overflow-x-auto no-scrollbar bg-white">
            {ROLES_CONFIG.map((role) => (
              <button
                key={role.id}
                onClick={() => setActiveTab(role.id)}
                className={`flex-none px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
                  activeTab === role.id
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/30"
                    : "border-transparent text-slate-500 hover:bg-slate-50"
                }`}
              >
                {role.label}
                {notifications[role.id]?.length > 0 && (
                  <span className="ml-1.5 bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                    {notifications[role.id].length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List Content */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>
            ) : !notifications[activeTab] || notifications[activeTab].length === 0 ? (
              <div className="py-10 text-center px-6">
                <CheckCircle2 className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-500 italic">No unread notifications for {activeTab}</p>
              </div>
            ) : (
              notifications[activeTab]?.map((notif) => (
                <div
                  key={notif.notiId}
                  onClick={() => handleNotificationClick(notif)}
                  className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer flex gap-3 group transition-colors"
                >
                  <div className="shrink-0 p-2 bg-slate-100 rounded-lg group-hover:bg-indigo-100 transition-colors flex items-center">
                    <Info className="w-4 h-4 text-slate-500 group-hover:text-indigo-600" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm text-slate-700 leading-snug group-hover:text-slate-900 font-medium">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {new Date(notif.createdAt).toLocaleString("vi-VN")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}