"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  ArrowRight, MapPin, CheckCircle2, 
  Search, Bell, User, Truck, Box, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox"; // Giả định có component này
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner"; // Hoặc library toast bạn dùng

// Fake Data: Nhiệm vụ di chuyển được giao cho Staff
const MY_TASKS = [
  { 
    id: "MV-101", 
    item: "Steel Beam I-200", 
    sku: "89350012",
    qty: "50 pcs", 
    from: "Zone A - Shelf 12", 
    to: "Loading Gate 1", 
    type: "Export", // Xuất hàng
    priority: "High"
  },
  { 
    id: "MV-102", 
    item: "Cement Ha Tien", 
    sku: "89350088",
    qty: "20 bags", 
    from: "Zone B - Floor", 
    to: "Zone C - Shelf 05", 
    type: "Internal", // Chuyển kho nội bộ
    priority: "Normal"
  },
  { 
    id: "MV-103", 
    item: "Red Brick Pallet", 
    sku: "89350099",
    qty: "1 Pallet", 
    from: "Deep Storage 01", 
    to: "Zone A - Shelf 02", 
    type: "Replenish", // Bổ sung hàng
    priority: "Normal"
  },
];

export default function StaffMovementListPage() {
  const [tasks, setTasks] = useState(MY_TASKS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toggle chọn 1 item
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Toggle chọn tất cả
  const toggleSelectAll = () => {
    if (selectedIds.length === tasks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tasks.map(t => t.id));
    }
  };

  // Xử lý xác nhận hoàn thành
  const handleConfirm = async () => {
    setIsSubmitting(true);
    // Fake API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Xóa các task đã chọn khỏi danh sách (giả lập là đã xong)
    setTasks(prev => prev.filter(t => !selectedIds.includes(t.id)));
    setSelectedIds([]);
    setIsSubmitting(false);
    
    // Show toast message
    // toast.success("Movements confirmed successfully!"); 
    alert("Movements confirmed successfully!");
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">My Movement Tasks</h2>
            <div className="flex items-center gap-4 ml-auto">
               <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 relative">
                  <Bell className="w-5 h-5" />
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

        <div className="flex-grow overflow-y-auto p-4 lg:p-8 space-y-6 pb-24">
           
           {/* Stats Summary */}
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-md">
                 <p className="text-xs font-medium opacity-80">Pending Moves</p>
                 <h3 className="text-3xl font-bold">{tasks.length}</h3>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                 <p className="text-xs font-medium text-slate-500">Completed Today</p>
                 <h3 className="text-3xl font-bold text-slate-900">12</h3>
              </div>
           </div>

           {/* Search & Actions */}
           <div className="flex items-center justify-between gap-4">
              <div className="relative flex-grow">
                 <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                 <Input placeholder="Search Item or Loc..." className="pl-9 bg-white" />
              </div>
              <Button variant="outline" size="icon" className="shrink-0">
                 <Filter className="w-4 h-4" />
              </Button>
           </div>

           {/* List Header: Select All */}
           <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                 <Checkbox 
                    checked={tasks.length > 0 && selectedIds.length === tasks.length}
                    onCheckedChange={toggleSelectAll}
                    id="select-all"
                 />
                 <label htmlFor="select-all" className="text-sm font-medium text-slate-600 cursor-pointer select-none">
                    Select All ({tasks.length})
                 </label>
              </div>
              <span className="text-xs text-slate-400">Swipe to view more details</span>
           </div>

           {/* Task List */}
           <div className="space-y-3">
              <AnimatePresence>
                 {tasks.map((task) => (
                    <motion.div 
                       key={task.id}
                       layout
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, x: -50 }}
                    >
                       <Card 
                          className={`border-l-4 shadow-sm transition-all ${
                             selectedIds.includes(task.id) ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/30' : 'border-slate-300 bg-white'
                          }`}
                          onClick={() => toggleSelection(task.id)}
                       >
                          <CardContent className="p-4 flex gap-4 items-center cursor-pointer">
                             {/* Checkbox */}
                             <Checkbox 
                                checked={selectedIds.includes(task.id)}
                                onCheckedChange={() => toggleSelection(task.id)}
                                className="mt-1"
                             />

                             {/* Content */}
                             <div className="flex-grow space-y-2">
                                <div className="flex justify-between items-start">
                                   <div>
                                      <h3 className="font-bold text-slate-900">{task.item}</h3>
                                      <p className="text-xs text-slate-500">SKU: {task.sku}</p>
                                   </div>
                                   <div className="text-right">
                                      <Badge variant="secondary" className="mb-1">{task.type}</Badge>
                                      {task.priority === 'High' && (
                                         <p className="text-[10px] font-bold text-red-600 uppercase">High Priority</p>
                                      )}
                                   </div>
                                </div>

                                {/* Movement Visual */}
                                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100 text-sm">
                                   <div className="flex items-center gap-2 text-slate-600">
                                      <Box className="w-4 h-4" /> 
                                      <span className="font-medium truncate max-w-[80px] sm:max-w-none">{task.from}</span>
                                   </div>
                                   <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0 mx-2" />
                                   <div className="flex items-center gap-2 text-slate-900">
                                      <MapPin className="w-4 h-4 text-green-600" /> 
                                      <span className="font-bold truncate max-w-[80px] sm:max-w-none">{task.to}</span>
                                   </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                   <Truck className="w-3 h-3" /> Qty to move: <span className="font-bold text-slate-800">{task.qty}</span>
                                </div>
                             </div>
                          </CardContent>
                       </Card>
                    </motion.div>
                 ))}
              </AnimatePresence>
              
              {tasks.length === 0 && (
                 <div className="text-center py-10 text-slate-400">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No pending movements.</p>
                 </div>
              )}
           </div>

        </div>

        {/* Floating Bottom Bar (Only visible when items selected) */}
        <AnimatePresence>
           {selectedIds.length > 0 && (
              <motion.div 
                 initial={{ y: 100 }}
                 animate={{ y: 0 }}
                 exit={{ y: 100 }}
                 className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40"
              >
                 <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <div>
                       <p className="font-bold text-slate-900">{selectedIds.length} tasks selected</p>
                       <p className="text-xs text-slate-500">Confirm physical movement</p>
                    </div>
                    <Button 
                       onClick={handleConfirm} 
                       disabled={isSubmitting}
                       className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg"
                    >
                       {isSubmitting ? "Processing..." : "Confirm Done"}
                    </Button>
                 </div>
              </motion.div>
           )}
        </AnimatePresence>

      </main>
    </div>
  );
}