"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import {
  Plus,
  Search,
  Calendar,
  Lock,
  Unlock,
  ArrowRight,
  Bell,
  User,
  ClipboardList,
  Users, // Import thêm icon Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";

// Fake Data
const AUDIT_SESSIONS = [
  {
    id: "AUD-2026-Q1", // Dữ liệu mới cho dòng Assign Team
    title: "Q1 2026 Opening Stock",
    warehouse: "Central Storage D1",
    date: "2026-01-10",
    status: "Planned", // Trạng thái mới
    progress: "0%",
    isLocked: false,
  },
  {
    id: "AUD-2025-Q4",
    title: "Q4 2025 Full Count",
    warehouse: "Central Storage D1",
    date: "2025-10-25",
    status: "In Progress",
    progress: "85%",
    isLocked: true,
  },
  {
    id: "AUD-2025-Q3",
    title: "Q3 2025 Spot Check",
    warehouse: "Zone B - Cement",
    date: "2025-07-15",
    status: "Completed",
    progress: "100%",
    isLocked: false,
  },
];

export default function AuditListPage() {
  const router = useRouter();

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Inventory Audit
            </h2>
            <div className="flex items-center gap-4 ml-auto">
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 relative">
                <Bell className="w-5 h-5" />
              </button>
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

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Audit Sessions
              </h1>
              <p className="text-sm text-slate-500">
                Manage stocktaking plans and reconciliation.
              </p>
            </div>
            <Button
              onClick={() => router.push("/audit/create")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" /> New Audit Plan
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-slate-200">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total Audits
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">12</h3>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500 shadow-sm">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    System Locked
                  </p>
                  <h3 className="text-2xl font-bold text-red-600">1 Active</h3>
                  <p className="text-xs text-red-400">Transactions frozen</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main List */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input placeholder="Search audit title..." className="pl-9" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Audit Title</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>System Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {AUDIT_SESSIONS.map((audit) => (
                    <TableRow
                      key={audit.id}
                      className="group hover:bg-slate-50/50"
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700">
                            {audit.title}
                          </span>
                          <span className="text-xs text-slate-400">
                            {audit.id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{audit.warehouse}</TableCell>
                      <TableCell className="text-slate-500 flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> {audit.date}
                      </TableCell>
                      <TableCell>
                        {audit.isLocked ? (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-200 gap-1 border-red-200">
                            <Lock className="w-3 h-3" /> Locked
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-slate-500 gap-1"
                          >
                            <Unlock className="w-3 h-3" /> Open
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-100 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ width: audit.progress }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium">
                            {audit.progress}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        
                        {/* Logic hiển thị nút bấm dựa trên trạng thái */}
                        {audit.status === "Planned" ? (
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={() => router.push(`/audit/assign-team`)}
                          >
                            <Users className="w-3 h-3 mr-2" /> Assign Team
                          </Button>
                        ) : (
                          // Các nút cho trạng thái In Progress / Completed
                          <div className="flex flex-col gap-2 items-end">
                            {audit.status === "In Progress" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/audit/manual-count`)}
                              >
                                Manual Count
                                <ArrowRight className="w-3 h-3 ml-1" />
                              </Button>
                            )}
                            
                            <Button
                              size="sm"
                              variant={
                                audit.status === "Completed" ? "outline" : "default"
                              }
                              className={
                                audit.status === "Completed"
                                  ? ""
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
                              }
                              onClick={() => router.push(`/audit/detail`)}
                            >
                              {audit.status === "Completed"
                                ? "View Report"
                                : "Reconcile"}
                              <ArrowRight className="w-3 h-3 ml-1" />
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