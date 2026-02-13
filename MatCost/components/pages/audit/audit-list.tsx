"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import {
  Plus, Search, Calendar, Lock, Unlock, ArrowRight, Bell, User, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type UserRole = "admin" | "manager" | "accountant" | "staff";

interface AuditListProps {
  role: UserRole;
}

const AUDIT_SESSIONS = [
  { id: "AUD-2026-Q1", title: "Q1 2026 Opening Stock", warehouse: "Central Storage D1", date: "2026-01-10", status: "Planned", progress: "0%", isLocked: false },
  { id: "AUD-2025-Q4", title: "Q4 2025 Full Count", warehouse: "Central Storage D1", date: "2025-10-25", status: "In Progress", progress: "85%", isLocked: true },
  { id: "AUD-2025-Q3", title: "Q3 2025 Spot Check", warehouse: "Zone B - Cement", date: "2025-07-15", status: "Completed", progress: "100%", isLocked: false },
];

export default function SharedAuditList({ role }: AuditListProps) {
  const router = useRouter();

  // Helper điều hướng theo Role
  const navigateTo = (path: string) => {
    // Nếu path bắt đầu bằng / thì đi thẳng, nếu không thì nối vào role hiện tại
    if (path.startsWith("/")) router.push(path);
    else router.push(`/${role}/audit/${path}`);
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Inventory Audit ({role.toUpperCase()})</h2>
            <div className="flex items-center gap-4 ml-auto">
               <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 relative"><Bell className="w-5 h-5" /></button>
               <UserDropdown align="end" trigger={<Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"><User className="h-5 w-5" /></Button>} />
            </div>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Audit Sessions</h1>
              <p className="text-sm text-slate-500">Manage stocktaking plans and reconciliation.</p>
            </div>
            
            {/* CHỈ ACCOUNTANT MỚI THẤY NÚT TẠO */}
            {role === "accountant" && (
              <Button onClick={() => navigateTo("create")} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                <Plus className="w-4 h-4 mr-2" /> New Audit Plan
              </Button>
            )}
          </div>

          {/* Table hiển thị */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Audit Title</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {AUDIT_SESSIONS.map((audit) => (
                    <TableRow key={audit.id} className="group hover:bg-slate-50/50">
                      <TableCell><span className="font-bold text-slate-700">{audit.title}</span></TableCell>
                      <TableCell>{audit.warehouse}</TableCell>
                      <TableCell className="text-slate-500 flex items-center gap-2"><Calendar className="w-3 h-3" /> {audit.date}</TableCell>
                      <TableCell>
                         {/* Badge Logic */}
                         {audit.status}
                      </TableCell>
                      <TableCell>{audit.progress}</TableCell>
                      <TableCell className="text-right">
                        
                        {/* LOGIC NÚT BẤM DỰA TRÊN ROLE */}
                        {audit.status === "Planned" ? (
                          // Chỉ Manager mới thấy Assign Team
                          role === "manager" ? (
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => navigateTo("assign-team")}>
                              <Users className="w-3 h-3 mr-2" /> Assign Team
                            </Button>
                          ) : <span className="text-slate-400 text-xs italic">Waiting for Manager</span>
                        ) : (
                          <div className="flex flex-col gap-2 items-end">
                            {/* Chỉ Staff mới thấy Manual Count */}
                            {audit.status === "In Progress" && role === "staff" && (
                              <Button size="sm" variant="outline" onClick={() => navigateTo("manual-count")}>
                                Manual Count <ArrowRight className="w-3 h-3 ml-1" />
                              </Button>
                            )}
                            
                            {/* Tất cả đều xem được Detail/Reconcile */}
                            <Button size="sm" 
                              variant={audit.status === "Completed" ? "outline" : "default"} 
                              className={audit.status === "Completed" ? "" : "bg-indigo-600 hover:bg-indigo-700 text-white"}
                              onClick={() => navigateTo("detail")}
                            >
                              {audit.status === "Completed" ? "View Report" : "Reconcile"} <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                        )}

                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}