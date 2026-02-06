"use client";

import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserDropdown } from "@/components/user-dropdown";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
      <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <div className="flex items-center gap-4 ml-auto">
          <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 relative">
            <Bell className="w-5 h-5" />
            {/* Có thể thêm chấm đỏ thông báo ở đây nếu cần */}
            {/* <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span> */}
          </button>
          
          <UserDropdown
            align="end"
            trigger={
              <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                <User className="h-5 w-5" />
              </Button>
            }
          />
        </div>
      </div>
    </header>
  );
}