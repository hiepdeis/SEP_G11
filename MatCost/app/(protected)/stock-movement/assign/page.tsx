"use client";

import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  ArrowRightLeft, UserCircle, Container, 
  Map, Bell, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

const MOVEMENT_TASKS = [
  { id: "MV-01", item: "Steel I-200 Bundle", from: "Deep Zone A-12", to: "Loading Gate 1", weight: "2.5 Tons" },
  { id: "MV-02", item: "Pallet Cement #55", from: "Shelf C-05 (High)", to: "Loading Gate 1", weight: "1.2 Tons" },
];

export default function MovementPlanPage() {
  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Internal Movement</h2>
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

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
           <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-900">Deep Storage Retrieval</h1>
              <Button variant="outline"><Map className="w-4 h-4 mr-2"/> View Warehouse Map</Button>
           </div>

           <div className="grid gap-4">
              {MOVEMENT_TASKS.map((task, idx) => (
                 <motion.div 
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                 >
                    <Card className="border-slate-200 shadow-sm">
                       <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                          
                          <div className="flex items-center gap-4">
                             <div className="p-4 bg-orange-100 text-orange-600 rounded-full">
                                <Container className="w-6 h-6" />
                             </div>
                             <div>
                                <h3 className="font-bold text-slate-900">{task.item}</h3>
                                <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                   <span className="font-medium text-slate-700">{task.from}</span>
                                   <ArrowRightLeft className="w-4 h-4" />
                                   <span className="font-medium text-slate-700">{task.to}</span>
                                </div>
                                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded mt-2 inline-block">
                                   Weight: {task.weight}
                                </span>
                             </div>
                          </div>

                          <div className="flex items-center gap-4 w-full md:w-auto">
                             <div className="w-full md:w-48">
                                <Select>
                                   <SelectTrigger className="bg-white">
                                      <SelectValue placeholder="Assign Operator" />
                                   </SelectTrigger>
                                   <SelectContent>
                                      <SelectItem value="driver-1">Driver: Tran Van A (Forklift)</SelectItem>
                                      <SelectItem value="driver-2">Driver: Le Van B (Crane)</SelectItem>
                                   </SelectContent>
                                </Select>
                             </div>
                             <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                Assign
                             </Button>
                          </div>
                       </CardContent>
                    </Card>
                 </motion.div>
              ))}
           </div>
        </div>
      </main>
    </div>
  );
}