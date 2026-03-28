"use client";

import { User, Settings, LogOut, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { setAccessToken } from "@/lib/axios-client";
import Link from "next/link";
import { authApi } from "@/services/auth-service";
import i18n from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { showConfirmToast } from "@/hooks/confirm-toast";

interface UserDropdownProps {
  trigger: React.ReactNode;
  align?: "center" | "start" | "end";
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

export function UserDropdown({
  trigger,
  align = "end",
  side = "bottom",
  className,
}: UserDropdownProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      localStorage.removeItem("auth_token");
      if (typeof setAccessToken === "function") {
        setAccessToken(null);
      }
      router.push("/");
    } catch (error) {
      console.error("Logout error", error);
      router.push("/");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className={className}>
        {trigger}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        side={side}
        className="w-56 rounded-xl shadow-xl border-slate-100"
      >
        <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {t("Account")}
        </div>

        <DropdownMenuItem asChild>
          <Link
            href="/profile"
            className="cursor-pointer rounded-lg group focus:bg-indigo-600 focus:text-white flex items-center w-full"
          >
            <User className="mr-2 h-4 w-4 text-slate-500 group-focus:text-white transition-colors" />
            <span>{t("Profile")}</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer rounded-lg group focus:bg-indigo-600 focus:text-white">
            <Globe className="mr-2 h-4 w-4 text-slate-500 group-focus:text-white transition-colors" />
            <span>{t("Language")}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="min-w-[150px] rounded-xl shadow-lg">
              <DropdownMenuItem
                className={`cursor-pointer rounded-lg ${i18n.language === "en" ? "bg-indigo-50 text-indigo-700 font-semibold" : ""}`}
                onClick={() => i18n.changeLanguage("en")}
              >
                English
              </DropdownMenuItem>
              <DropdownMenuItem
                className={`cursor-pointer rounded-lg ${i18n.language === "vi" ? "bg-indigo-50 text-indigo-700 font-semibold" : ""}`}
                onClick={() => i18n.changeLanguage("vi")}
              >
                Tiếng Việt
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSeparator className="bg-slate-100" />

        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg"
          onClick={() => {
            showConfirmToast({
              title: t("Sign out?"),
              description: t("Are you sure you want to sign out?"),
              confirmLabel: t("Yes, Sign out"),
              onConfirm: () => handleLogout(),
            });
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t("Sign out")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
