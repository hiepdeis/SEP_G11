"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  Search, Filter, FileInput, FileClock, 
  ArrowRight, MoreHorizontal, Bell, User,
  ClipboardList, Loader2
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
import { useRouter } from "next/navigation"; // Giả lập router

// Fake Data: Danh sách việc cần làm của Accountant
const INBOUND_TASKS = [
  { 
    id: "REQ-2023-005", 
    type: "request", // Yêu cầu mới từ Site
    project: "Skyline Tower A", 
    requester: "Construction Team C", 
    submittedDate: "2023-10-27", 
    itemsCount: 15,
    status: "Ready to Import",
    priority: "High"
  },
  { 
    id: "GRN-DRAFT-882", 
    type: "draft", // Phiếu nhập đang làm dở
    project: "Riverside Villa", 
    requester: "Accountant (You)", 
    submittedDate: "2023-10-26", 
    itemsCount: 8,
    status: "Draft Mode",
    priority: "Normal"
  },
  { 
    id: "REQ-2023-004", 
    type: "request", 
    project: "City Mall Renovation", 
    requester: "Site Manager B", 
    submittedDate: "2023-10-25", 
    itemsCount: 4,
    status: "Ready to Import",
    priority: "Normal"
  },
];

export default function ImportProcessingListPage() {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "request" | "draft">("all");

  const handleProcess = (id: string) => {
    setLoadingId(id);
    // Giả lập chuyển trang
    setTimeout(() => {
      // Trong thực tế: router.push(`/import/create?sourceId=${id}`);
      setLoadingId(null);
      router.push(`inbound-processing/create`);
    }, 200);
  };

  const filteredTasks = INBOUND_TASKS.filter(task => {
    if (filter === "all") return true;
    return task.type === filter;
  });

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Inbound Processing</h2>
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
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Process Requests</h1>
              <p className="text-sm text-slate-500">
                Convert approved material requests into Goods Receipt Notes (GRN).
              </p>
            </div>
          </div>

          {/* Stats / Quick Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Card 
                className={`cursor-pointer transition-all ${filter === 'all' ? 'ring-2 ring-indigo-500 border-indigo-500' : 'hover:border-indigo-300'}`}
                onClick={() => setFilter("all")}
             >
                <CardContent className="p-4 flex items-center gap-4">
                   <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                      <ClipboardList className="w-6 h-6" />
                   </div>
                   <div>
                      <p className="text-sm text-slate-500 font-medium">All Tasks</p>
                      <h3 className="text-2xl font-bold text-slate-900">{INBOUND_TASKS.length}</h3>
                   </div>
                </CardContent>
             </Card>

             <Card 
                className={`cursor-pointer transition-all ${filter === 'request' ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-blue-300'}`}
                onClick={() => setFilter("request")}
             >
                <CardContent className="p-4 flex items-center gap-4">
                   <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                      <FileInput className="w-6 h-6" />
                   </div>
                   <div>
                      <p className="text-sm text-slate-500 font-medium">New Requests</p>
                      <h3 className="text-2xl font-bold text-slate-900">
                         {INBOUND_TASKS.filter(t => t.type === 'request').length}
                      </h3>
                   </div>
                </CardContent>
             </Card>

             <Card 
                className={`cursor-pointer transition-all ${filter === 'draft' ? 'ring-2 ring-yellow-500 border-yellow-500' : 'hover:border-yellow-300'}`}
                onClick={() => setFilter("draft")}
             >
                <CardContent className="p-4 flex items-center gap-4">
                   <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
                      <FileClock className="w-6 h-6" />
                   </div>
                   <div>
                      <p className="text-sm text-slate-500 font-medium">Drafts</p>
                      <h3 className="text-2xl font-bold text-slate-900">
                         {INBOUND_TASKS.filter(t => t.type === 'draft').length}
                      </h3>
                   </div>
                </CardContent>
             </Card>
          </div>

          {/* Main List */}
          <Card className="border-slate-200 shadow-sm bg-white min-h-[400px]">
             <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                   <CardTitle className="text-base font-semibold">Incoming Queue</CardTitle>
                   <div className="relative w-64">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                      <Input placeholder="Search project or ID..." className="pl-9 h-9" />
                   </div>
                </div>
             </CardHeader>
             <CardContent className="p-0">
                <Table>
                   <TableHeader>
                      <TableRow className="bg-slate-50">
                         <TableHead>Source ID</TableHead>
                         <TableHead>Project</TableHead>
                         <TableHead>Requester</TableHead>
                         <TableHead>Date</TableHead>
                         <TableHead>Status</TableHead>
                         <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                   </TableHeader>
                   <TableBody>
                      {filteredTasks.length === 0 ? (
                         <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                               No tasks found in this category.
                            </TableCell>
                         </TableRow>
                      ) : (
                         filteredTasks.map((task) => (
                            <TableRow key={task.id} className="group hover:bg-slate-50/50">
                               <TableCell>
                                  <div className="flex items-center gap-2">
                                     <span className="font-semibold text-slate-700">{task.id}</span>
                                     {task.type === 'draft' && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 border-yellow-300 text-yellow-700 bg-yellow-50">
                                           Draft
                                        </Badge>
                                     )}
                                  </div>
                               </TableCell>
                               <TableCell className="font-medium text-slate-600">{task.project}</TableCell>
                               <TableCell>{task.requester}</TableCell>
                               <TableCell className="text-slate-500">{task.submittedDate}</TableCell>
                               <TableCell>
                                  <Badge 
                                     variant="secondary" 
                                     className={
                                        task.type === 'request' 
                                        ? "bg-blue-50 text-blue-700 hover:bg-blue-100" 
                                        : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                                     }
                                  >
                                     {task.status}
                                  </Badge>
                               </TableCell>
                               <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                     <Button 
                                        size="sm" 
                                        onClick={() => handleProcess(task.id)}
                                        disabled={loadingId === task.id}
                                        className={
                                           task.type === 'request' 
                                           ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                                           : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                                        }
                                     >
                                        {loadingId === task.id ? (
                                           <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : task.type === 'request' ? (
                                           <>Create GRN <ArrowRight className="w-3 h-3 ml-1.5" /></>
                                        ) : (
                                           <>Resume Edit</>
                                        )}
                                     </Button>
                                     
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                           <Button variant="ghost" size="icon" className="h-8 w-8">
                                              <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                           </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                           <DropdownMenuItem>View Details</DropdownMenuItem>
                                           <DropdownMenuItem className="text-red-600">Reject Request</DropdownMenuItem>
                                        </DropdownMenuContent>
                                     </DropdownMenu>
                                  </div>
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