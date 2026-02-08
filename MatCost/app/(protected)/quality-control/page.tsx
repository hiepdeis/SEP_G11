"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  ClipboardList, Search, Box, ArrowRight, 
  Clock, AlertTriangle, CheckCircle2, Bell, User, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

// Fake Data: Danh sách nhiệm vụ QC
const QC_TASKS = [
  { 
    id: "GRN-8821", 
    supplier: "Hoa Phat Steel Group", 
    itemsCount: 2, 
    arrivalDate: "2025-10-26 08:30 AM",
    status: "Pending", // Chưa làm
    priority: "High"
  },
  { 
    id: "GRN-8820", 
    supplier: "Ha Tien Cement", 
    itemsCount: 5, 
    arrivalDate: "2025-10-26 09:15 AM",
    status: "In Progress", // Đang làm dở
    progress: "2/5 checked",
    priority: "Normal"
  },
  { 
    id: "GRN-8815", 
    supplier: "Dong Nai Brick", 
    itemsCount: 1, 
    arrivalDate: "2025-10-25 04:00 PM",
    status: "Issue Found", // Đã xong nhưng có lỗi
    priority: "High"
  },
];

export default function QCListPage() {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"todo" | "history">("todo");

  const handleStartInspection = (id: string) => {
    setLoadingId(id);
    // Giả lập chuyển hướng sang trang chi tiết (QualityControlPage)
    setTimeout(() => {
      setLoadingId(null);
      router.push(`/quality-control/review/`); 
    }, 800);
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">QC Tasks</h2>
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

        <div className="flex-grow overflow-y-auto p-4 lg:p-8 space-y-6">
          
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Incoming Inspections</h1>
            <p className="text-sm text-slate-500">Select a Goods Receipt Note to start checking quality.</p>
          </div>

          {/* KPI / Overview Cards (Mobile Friendly) */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
             <Card className="bg-blue-600 text-white border-none shadow-md">
                <CardContent className="p-4 flex flex-col items-center text-center justify-center h-full">
                   <span className="text-3xl font-bold">5</span>
                   <span className="text-xs font-medium opacity-80 uppercase tracking-wide">To Inspect</span>
                </CardContent>
             </Card>
             <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4 flex flex-col items-center text-center justify-center h-full">
                   <span className="text-3xl font-bold text-orange-600">2</span>
                   <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">In Progress</span>
                </CardContent>
             </Card>
             <Card className="bg-white border-slate-200 shadow-sm hidden md:block">
                <CardContent className="p-4 flex flex-col items-center text-center justify-center h-full">
                   <span className="text-3xl font-bold text-green-600">12</span>
                   <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Completed Today</span>
                </CardContent>
             </Card>
          </div>

          {/* Search & Filter */}
          <div className="flex gap-2">
             <div className="relative flex-grow">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input placeholder="Scan GRN barcode or search..." className="pl-10 h-10 bg-white" />
             </div>
             <Button variant="outline" className="h-10 px-4">
                Filter
             </Button>
          </div>

          {/* Task List - Using Cards for better touch targets */}
          <div className="space-y-4 pb-10">
             {QC_TASKS.map((task, idx) => (
                <motion.div 
                   key={task.id}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: idx * 0.1 }}
                >
                   <Card className="border-slate-200 hover:shadow-md transition-shadow cursor-pointer bg-white group">
                      <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                         
                         {/* Left Info */}
                         <div className="space-y-2">
                            <div className="flex items-center gap-2">
                               <Badge 
                                  className={
                                     task.status === 'Pending' ? "bg-blue-100 text-blue-700 hover:bg-blue-200" :
                                     task.status === 'In Progress' ? "bg-orange-100 text-orange-700 hover:bg-orange-200" :
                                     "bg-red-100 text-red-700 hover:bg-red-200"
                                  }
                               >
                                  {task.status}
                               </Badge>
                               {task.priority === 'High' && (
                                  <Badge variant="outline" className="border-red-200 text-red-600 text-[10px] px-1.5 py-0 h-5">
                                     High Priority
                                  </Badge>
                               )}
                            </div>
                            <div>
                               <h3 className="text-lg font-bold text-slate-800">{task.id}</h3>
                               <p className="text-slate-500 font-medium">{task.supplier}</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                               <div className="flex items-center gap-1">
                                  <Box className="w-3.5 h-3.5" /> {task.itemsCount} Items
                               </div>
                               <div className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> {task.arrivalDate}
                               </div>
                            </div>
                         </div>

                         {/* Right Action */}
                         <div className="w-full sm:w-auto">
                            <Button 
                               onClick={() => handleStartInspection(task.id)}
                               disabled={loadingId === task.id}
                               className={`w-full sm:w-32 h-10 shadow-sm ${
                                  task.status === 'In Progress' 
                                  ? "bg-orange-600 hover:bg-orange-700 text-white" 
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
                               }`}
                            >
                               {loadingId === task.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                               ) : task.status === 'In Progress' ? (
                                  <>Continue <ArrowRight className="ml-1 w-4 h-4" /></>
                               ) : (
                                  <>Start <ArrowRight className="ml-1 w-4 h-4" /></>
                               )}
                            </Button>
                            {task.status === 'In Progress' && (
                               <p className="text-xs text-center text-orange-600 mt-2 sm:mt-1 font-medium">
                                  {task.progress}
                               </p>
                            )}
                         </div>

                      </CardContent>
                   </Card>
                </motion.div>
             ))}

             {/* Finished State Placeholder */}
             <div className="pt-4 text-center">
                <p className="text-sm text-slate-400">End of pending tasks.</p>
                <Button variant="link" className="text-indigo-600 text-sm mt-1">
                   View Completed History
                </Button>
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}