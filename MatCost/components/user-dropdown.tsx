"use client";

import { User, Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { setAccessToken } from "@/lib/axios-client";
import Link from "next/link";

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
  const router = useRouter();

  const handleLogout = () => {
    try {
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
          Account
        </div>

        <DropdownMenuItem asChild>
          <Link
            href="/profile"
            className="cursor-pointer rounded-lg group focus:bg-indigo-600 focus:text-white flex items-center w-full"
          >
            <User className="mr-2 h-4 w-4 text-slate-500 group-focus:text-white transition-colors" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem className="cursor-pointer rounded-lg group focus:bg-indigo-600 focus:text-white">
          <Settings className="mr-2 h-4 w-4 text-slate-500 group-focus:text-white transition-colors" />
          <span>Preferences</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-slate-100" />

        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
