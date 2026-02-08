"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  CheckCircle2, Clock, XCircle, Search, Filter, 
  ArrowRight, FileCheck, Bell, User, Loader2,
  CalendarDays
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

// Fake Data: Danh sách các phiếu GRN chờ duyệt
const APPROVAL_QUEUE = [
  { 
    id: "GRN-8821", 
    supplier: "Hoa Phat Steel Group", 
    submittedBy: "Accountant User", 
    date: "2025-10-26", 
    totalValue: "767,000,000 VND",
    status: "Pending",
    contractId: "CTR-2023-001"
  },
  { 
    id: "GRN-8820", 
    supplier: "Ha Tien Cement", 
    submittedBy: "Accountant User", 
    date: "2025-10-25", 
    totalValue: "120,500,000 VND",
    status: "Approved",
    contractId: "CTR-2023-089"
  },
  { 
    id: "GRN-8819", 
    supplier: "Dong Nai Brick Co", 
    submittedBy: "Accountant User", 
    date: "2025-10-24", 
    totalValue: "45,000,000 VND",
    status: "Rejected",
    contractId: "CTR-2022-112"
  },
  { 
    id: "GRN-8818", 
    supplier: "Local Sand Supplier", 
    submittedBy: "Accountant User", 
    date: "2025-10-24", 
    totalValue: "12,000,000 VND",
    status: "Pending",
    contractId: "N/A"
  },
];

export default function ImportApprovalListPage() {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"All" | "Pending" | "History">("Pending");

  // Filter Logic
  const filteredData = APPROVAL_QUEUE.filter(item => {
    if (filterStatus === "All") return true;
    if (filterStatus === "Pending") return item.status === "Pending";
    if (filterStatus === "History") return item.status !== "Pending";
    return true;
  });

  const handleReview = (id: string) => {
    setLoadingId(id);
    // Giả lập chuyển trang sang trang Chi tiết (Detail Page)
    setTimeout(() => {
      setLoadingId(null);
      router.push(`/import-request/review`);
    }, 800);
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Approvals</h2>
            <div className="flex items-center gap-4 ml-auto">
               <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
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

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inbound Approvals</h1>
              <p className="text-sm text-slate-500">Review and digitally sign Goods Receipt Notes (GRN).</p>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                   <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
                      <Clock className="w-6 h-6" />
                   </div>
                   <div>
                      <p className="text-sm text-slate-500 font-medium">Pending Review</p>
                      <h3 className="text-2xl font-bold text-slate-900">
                         {APPROVAL_QUEUE.filter(i => i.status === 'Pending').length}
                      </h3>
                   </div>
                </CardContent>
             </Card>
             <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                   <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                      <FileCheck className="w-6 h-6" />
                   </div>
                   <div>
                      <p className="text-sm text-slate-500 font-medium">Approved Today</p>
                      <h3 className="text-2xl font-bold text-slate-900">12</h3>
                   </div>
                </CardContent>
             </Card>
             <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                   <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                      <XCircle className="w-6 h-6" />
                   </div>
                   <div>
                      <p className="text-sm text-slate-500 font-medium">Rejected This Month</p>
                      <h3 className="text-2xl font-bold text-slate-900">3</h3>
                   </div>
                </CardContent>
             </Card>
          </div>

          {/* Main List */}
          <Card className="border-slate-200 shadow-sm bg-white min-h-[500px]">
             <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                   <div className="flex items-center gap-2">
                      <Button 
                         variant={filterStatus === 'Pending' ? 'default' : 'outline'}
                         onClick={() => setFilterStatus('Pending')}
                         className={filterStatus === 'Pending' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                      >
                         Pending
                      </Button>
                      <Button 
                         variant={filterStatus === 'History' ? 'default' : 'outline'}
                         onClick={() => setFilterStatus('History')}
                         className={filterStatus === 'History' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                      >
                         History
                      </Button>
                      <Button 
                         variant={filterStatus === 'All' ? 'default' : 'outline'}
                         onClick={() => setFilterStatus('All')}
                         className={filterStatus === 'All' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                      >
                         All
                      </Button>
                   </div>
                   
                   <div className="relative w-full md:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                      <Input placeholder="Search GRN, Supplier..." className="pl-9" />
                   </div>
                </div>
             </CardHeader>
             <CardContent className="p-0">
                <Table>
                   <TableHeader>
                      <TableRow className="bg-slate-50">
                         <TableHead>GRN ID</TableHead>
                         <TableHead>Supplier</TableHead>
                         <TableHead>Value</TableHead>
                         <TableHead>Submitted By</TableHead>
                         <TableHead>Status</TableHead>
                         <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                   </TableHeader>
                   <TableBody>
                      {filteredData.length === 0 ? (
                         <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                               No records found.
                            </TableCell>
                         </TableRow>
                      ) : (
                         filteredData.map((item) => (
                            <TableRow key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                               <TableCell>
                                  <div className="flex flex-col">
                                     <span className="font-semibold text-slate-700">{item.id}</span>
                                     <span className="text-xs text-slate-400 flex items-center gap-1">
                                        <CalendarDays className="w-3 h-3" /> {item.date}
                                     </span>
                                  </div>
                               </TableCell>
                               <TableCell>
                                  <div className="flex flex-col">
                                     <span className="text-slate-700 font-medium">{item.supplier}</span>
                                     <span className="text-xs text-slate-400">{item.contractId}</span>
                                  </div>
                               </TableCell>
                               <TableCell className="font-medium text-slate-900">
                                  {item.totalValue}
                               </TableCell>
                               <TableCell className="text-slate-600">{item.submittedBy}</TableCell>
                               <TableCell>
                                  <Badge 
                                     variant="outline" 
                                     className={
                                        item.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                        item.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                        'bg-red-50 text-red-700 border-red-200'
                                     }
                                  >
                                     {item.status === 'Pending' ? (
                                        <Clock className="w-3 h-3 mr-1" />
                                     ) : item.status === 'Approved' ? (
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                     ) : (
                                        <XCircle className="w-3 h-3 mr-1" />
                                     )}
                                     {item.status}
                                  </Badge>
                               </TableCell>
                               <TableCell className="text-right">
                                  {item.status === 'Pending' ? (
                                     <Button 
                                        size="sm" 
                                        onClick={() => handleReview(item.id)}
                                        disabled={loadingId === item.id}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                     >
                                        {loadingId === item.id ? (
                                           <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                           <>Review <ArrowRight className="w-4 h-4 ml-1.5" /></>
                                        )}
                                     </Button>
                                  ) : (
                                     <Button variant="ghost" size="sm" className="text-slate-500">View Details</Button>
                                  )}
                               </TableCell>
                            </TableRow>
                         ))
                      )}
                   </TableBody>
                </Table>
             </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}