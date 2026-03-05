"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import {
  Plus, Search, Calendar, Lock, Unlock, ArrowRight,
  Bell, User, ClipboardList, Users, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { auditService, AuditListItemDto } from "@/services/audit-service";

type UserRole = "admin" | "manager" | "accountant" | "staff";

interface AuditListProps {
  role: UserRole;
}

export default function SharedAuditList({ role }: AuditListProps) {
  const router = useRouter();
  
  const [audits, setAudits] = useState<AuditListItemDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await auditService.getAll(); 
        setAudits(data);
      } catch (error) {
        console.error("Failed to load audits:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const navigateTo = (action: string, auditId?: string) => {
    if (action === "create") {
       router.push(`/${role}/audit/create`);
       return;
    }
    if (!auditId) return;

    if (action === "assign-team") {
        router.push(`/${role}/audit/assign-team/${auditId}`);
    } else if (action === "manual-count") {
        router.push(`/${role}/audit/manual-count/${auditId}`);
    } else if (action === "detail") {
        router.push(`/${role}/audit/detail/${auditId}`); 
    }
  };

  const getStatusBadge = (status: string) => {
      const s = status?.toLowerCase() || "";
      if (s === "locked" || s === "completed") {
          return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 gap-1 border-red-200"><Lock className="w-3 h-3" /> {status}</Badge>;
      }
      return <Badge variant="outline" className="text-slate-500 gap-1"><Unlock className="w-3 h-3" /> {status || "Open"}</Badge>;
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Inventory Audit ({role.toUpperCase()})
            </h2>
            <div className="flex items-center gap-4 ml-auto">
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 relative">
                <Bell className="w-5 h-5" />
              </button>
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
            {role === "accountant" && (
              <Button onClick={() => navigateTo("create")} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                <Plus className="w-4 h-4 mr-2" /> New Audit Plan
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-slate-200">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><ClipboardList className="w-6 h-6" /></div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Audits</p>
                  <h3 className="text-2xl font-bold text-slate-900">{audits.length}</h3>
                </div>
              </CardContent>
            </Card>
          </div>

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
                    <TableHead>Start Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500"><Loader2 className="w-5 h-5 animate-spin mx-auto"/>Loading...</TableCell></TableRow>
                  ) : audits.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No audit sessions found.</TableCell></TableRow>
                  ) : (
                    audits.map((audit) => (
                    <TableRow key={audit.stockTakeId} className="group hover:bg-slate-50/50">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700">{audit.title}</span>
                          <span className="text-xs text-slate-400">ID: {audit.stockTakeId}</span>
                        </div>
                      </TableCell>
                      <TableCell>{audit.warehouseName || `Warehouse #${audit.warehouseId}`}</TableCell>
                      <TableCell className="text-slate-500">
                        {audit.plannedStartDate ? new Date(audit.plannedStartDate).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>{getStatusBadge(audit.status)}</TableCell>
                      <TableCell className="font-medium">{audit.countingProgress}%</TableCell>
                      
                      <TableCell className="text-right">
                        {role === "manager" && (
                            <div className="flex justify-end gap-2">
                                {(audit.status === "Planned" || audit.status === "Assigned") && (
                                    <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50" 
                                        onClick={() => navigateTo("assign-team", audit.stockTakeId.toString())}>
                                        <Users className="w-3 h-3 mr-2" /> Assign Team
                                    </Button>
                                )}
                                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    onClick={() => navigateTo("detail", audit.stockTakeId.toString())}>
                                    Detail
                                </Button>
                            </div>
                        )}
                        {role === "staff" && (
                             <Button size="sm" variant="outline" 
                                onClick={() => navigateTo("manual-count", audit.stockTakeId.toString())}>
                                Manual Count <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                        )}
                        {role === "accountant" && (
                             <Button size="sm" variant="ghost" onClick={() => navigateTo("detail", audit.stockTakeId.toString())}>
                                View Report
                             </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}