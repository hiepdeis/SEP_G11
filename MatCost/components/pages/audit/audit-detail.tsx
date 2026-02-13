"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { ArrowLeft, Lock, AlertTriangle, CheckCircle, FileSignature, Download, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type UserRole = "admin" | "manager" | "accountant" | "staff";

interface AuditDetailProps {
  role: UserRole;
}

const RECON_ROWS = [
  { id: 1, item: "Steel Beam I-200", sys: 500, count: 500, diff: 0, status: "Matched" },
  { id: 2, item: "Cement Ha Tien", sys: 200, count: 195, diff: -5, status: "Discrepancy" },
];

export default function SharedAuditDetail({ role }: AuditDetailProps) {
  const router = useRouter();
  const [isFinalizing, setIsFinalizing] = useState(false);

  const canExport = ["accountant", "admin"].includes(role);
  const canResolve = ["manager"].includes(role);
  const canFinalize = ["manager"].includes(role);

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </Button>
              <h2 className="text-lg font-semibold text-slate-900">Audit Detail ({role})</h2>
            </div>
            <UserDropdown align="end" trigger={<Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"><User className="h-5 w-5" /></Button>} />
          </div>
        </header>

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-8">
          {/* Stats Cards */}

          <Card className="border-slate-200 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
              <CardTitle>Reconciliation Data</CardTitle>
              {/* CHỈ ACCOUNTANT/ADMIN THẤY NÚT EXPORT */}
              {canExport && (
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" /> Export Data
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">System Qty</TableHead>
                    <TableHead className="text-right">Physical Count</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RECON_ROWS.map((row) => (
                    <TableRow key={row.id} className={row.diff !== 0 ? "bg-red-50/20" : ""}>
                      <TableCell>{row.item}</TableCell>
                      <TableCell className="text-right">{row.sys}</TableCell>
                      <TableCell className="text-right font-bold">{row.count}</TableCell>
                      <TableCell className={`text-right font-bold ${row.diff < 0 ? "text-red-600" : "text-green-600"}`}>
                        {row.diff}
                      </TableCell>
                      <TableCell className="text-right">
                        {/* CHỈ MANAGER MỚI CÓ QUYỀN RESOLVE */}
                        {row.diff !== 0 ? (
                          canResolve ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">Resolve</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Resolve Variance</DialogTitle></DialogHeader>
                                {/* Form Resolve */}
                                <DialogFooter><Button className="bg-red-600 text-white">Confirm</Button></DialogFooter>
                              </DialogContent>
                            </Dialog>
                          ) : <span className="text-xs text-red-400 italic">Pending Mgr</span>
                        ) : <span className="text-xs text-green-500">Matched</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* CHỈ MANAGER THẤY PHẦN KÝ DUYỆT */}
          {canFinalize && (
            <div className="mt-8">
              <Card className="bg-slate-50 border-slate-200">
                <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
                  <h3 className="text-xl font-bold text-slate-900">Finalize & Sign Audit</h3>
                  <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg" onClick={() => alert("Signed!")}>
                    <FileSignature className="w-5 h-5 mr-2" /> Complete & Unlock
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}