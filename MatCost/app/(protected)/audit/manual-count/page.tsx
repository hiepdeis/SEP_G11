"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  Calculator, ChevronRight, Save, Check, 
  Search, Bell, User, LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const COUNT_TASKS = [
  { id: 1, name: "Steel Beam I-200", sku: "89350012", location: "Zone A-12", counted: null as number | null },
  { id: 2, name: "Cement Ha Tien", sku: "89350088", location: "Zone B-05", counted: 195 },
  { id: 3, name: "Red Brick", sku: "89350099", location: "Deep Storage", counted: null as number | null },
];

export default function StaffCountingPage() {
  const [tasks, setTasks] = useState(COUNT_TASKS);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tempCount, setTempCount] = useState("");

  const startEdit = (id: number, currentVal: number | null) => {
    setEditingId(id);
    setTempCount(currentVal ? currentVal.toString() : "");
  };

  const saveCount = () => {
    if (editingId !== null) {
      setTasks(tasks.map(t => t.id === editingId ? { ...t, counted: parseInt(tempCount) || 0 } : t));
      setEditingId(null);
    }
  };

  const progress = Math.round((tasks.filter(t => t.counted !== null).length / tasks.length) * 100);

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">My Count Tasks</h2>
            <div className="flex items-center gap-4 ml-auto">
               <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 relative">
                  <Bell className="w-5 h-5" />
               </button>
               <UserDropdown align="end" trigger={<Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"><User className="h-5 w-5" /></Button>} />
            </div>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto p-4 lg:p-8 space-y-6 max-w-lg mx-auto w-full">
           
           {/* Progress Card */}
           <div className="bg-indigo-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex justify-between items-end mb-2">
                 <div>
                    <h2 className="text-2xl font-bold">Zone A Audit</h2>
                    <p className="opacity-80 text-sm">Assigned by Manager</p>
                 </div>
                 <div className="text-3xl font-bold">{progress}%</div>
              </div>
              <div className="w-full bg-indigo-900/30 h-2 rounded-full overflow-hidden">
                 <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
           </div>

           {/* Search */}
           <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input placeholder="Scan item or search..." className="pl-10 bg-white" />
           </div>

           {/* Task List */}
           <div className="space-y-3">
              {tasks.map((task) => (
                 <motion.div key={task.id} layout>
                    <Card 
                       className={`border-l-4 shadow-sm cursor-pointer ${task.counted !== null ? 'border-green-500 bg-green-50/30' : 'border-slate-300'}`}
                       onClick={() => startEdit(task.id, task.counted)}
                    >
                       <CardContent className="p-4 flex justify-between items-center">
                          <div>
                             <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-900">{task.name}</h3>
                                {task.counted !== null && <Check className="w-4 h-4 text-green-600" />}
                             </div>
                             <p className="text-xs text-slate-500">SKU: {task.sku}</p>
                             <div className="flex items-center gap-1 mt-1">
                                <LayoutGrid className="w-3 h-3 text-indigo-500" />
                                <span className="text-xs font-medium text-indigo-700">{task.location}</span>
                             </div>
                          </div>
                          
                          <div className="text-right">
                             {task.counted !== null ? (
                                <div className="text-xl font-bold text-slate-900">{task.counted}</div>
                             ) : (
                                <Button size="sm" variant="outline" className="border-dashed text-slate-400">
                                   Enter Qty
                                </Button>
                             )}
                          </div>
                       </CardContent>
                    </Card>
                 </motion.div>
              ))}
           </div>

           {/* Edit Modal / Bottom Sheet Simulation */}
           {editingId !== null && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                 <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-white w-full max-w-sm rounded-xl p-6 shadow-2xl space-y-4"
                 >
                    <div className="text-center">
                       <h3 className="text-lg font-bold">Enter Quantity</h3>
                       <p className="text-slate-500 text-sm">Physical count for {tasks.find(t => t.id === editingId)?.name}</p>
                    </div>
                    
                    <Input 
                       type="number" 
                       className="text-center text-3xl h-16 font-bold" 
                       autoFocus 
                       value={tempCount}
                       onChange={(e) => setTempCount(e.target.value)}
                    />

                    <div className="grid grid-cols-2 gap-4">
                       <Button variant="outline" onClick={() => setEditingId(null)} className="h-12">Cancel</Button>
                       <Button onClick={saveCount} className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                          <Save className="w-4 h-4 mr-2" /> Save
                       </Button>
                    </div>
                 </motion.div>
              </div>
           )}

        </div>
      </main>
    </div>
  );
}