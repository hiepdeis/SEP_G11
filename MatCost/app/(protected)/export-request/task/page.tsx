"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  CheckSquare, Square, Truck, CheckCircle, 
  ChevronRight, Bell, User, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const PICK_LIST = [
  { id: 1, name: "Steel Beam I-200", qty: "50 pcs", location: "Zone A-12", picked: false },
  { id: 2, name: "Cement Ha Tien", qty: "20 bags", location: "Zone B-05", picked: false },
];

export default function GoodsIssueTaskPage() {
  const [tasks, setTasks] = useState(PICK_LIST);
  const [isCompleting, setIsCompleting] = useState(false);

  const togglePick = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, picked: !t.picked } : t));
  };

  const allPicked = tasks.every(t => t.picked);

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Picking Task</h2>
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

        <div className="flex-grow overflow-y-auto p-4 lg:p-8 max-w-lg mx-auto w-full space-y-6">
           
           <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                 <h2 className="text-xl font-bold text-slate-900">Task #GP-101</h2>
                 <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">Priority</span>
              </div>
              <p className="text-slate-500 text-sm flex items-center gap-2">
                 <Truck className="w-4 h-4" /> Vehicle: 59C-123.45 (Gate A)
              </p>
           </div>

           <div className="space-y-3">
              {tasks.map((item) => (
                 <motion.div key={item.id} layout>
                    <Card 
                       onClick={() => togglePick(item.id)}
                       className={`border-2 cursor-pointer transition-all ${
                          item.picked ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-indigo-300'
                       }`}
                    >
                       <CardContent className="p-4 flex items-center justify-between">
                          <div>
                             <h3 className={`font-bold text-lg ${item.picked ? 'text-green-800 line-through decoration-2' : 'text-slate-900'}`}>
                                {item.name}
                             </h3>
                             <p className="text-slate-600 font-medium">Qty: {item.qty}</p>
                             <p className="text-xs text-slate-400 mt-1">Loc: {item.location}</p>
                          </div>
                          <div>
                             {item.picked ? (
                                <CheckSquare className="w-8 h-8 text-green-600" />
                             ) : (
                                <Square className="w-8 h-8 text-slate-300" />
                             )}
                          </div>
                       </CardContent>
                    </Card>
                 </motion.div>
              ))}
           </div>

           <Button 
              disabled={!allPicked || isCompleting}
              className={`w-full h-14 text-lg font-bold shadow-lg mt-4 ${
                 allPicked ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-slate-200 text-slate-400'
              }`}
              onClick={() => setIsCompleting(true)}
           >
              {isCompleting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                 <>
                    <CheckCircle className="w-6 h-6 mr-2" /> Signal Ready
                 </>
              )}
           </Button>

        </div>
      </main>
    </div>
  );
}   