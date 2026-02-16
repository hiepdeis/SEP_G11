"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { ArrowLeft, Send, Check, Search, User, LayoutGrid, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import { auditService, CountItemDto } from "@/services/audit-service";

export default function StaffCountingPage() {
  const router = useRouter();
  const params = useParams();
  const stockTakeId = Number(params?.id);

  const [tasks, setTasks] = useState<CountItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingItem, setEditingItem] = useState<CountItemDto | null>(null);
  const [tempCount, setTempCount] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  useEffect(() => {
    if (!stockTakeId) return;
    loadTasks();
  }, [stockTakeId]);

  const loadTasks = async () => {
    try {
        setLoading(true);
        // uncountedOnly = false để hiện tất cả
        const data = await auditService.getCountItems(stockTakeId, "", false);
        setTasks(data);
    } catch (error) {
        console.error(error);
        alert("Failed to load tasks.");
    } finally {
        setLoading(false);
    }
  };

  const startEdit = (item: CountItemDto) => {
    setEditingItem(item);
    setTempCount(item.countQty !== null && item.countQty !== undefined ? item.countQty.toString() : "");
  };

  const saveCount = async () => {
    if (!editingItem) return;
    try {
        setSavingItem(true);
        const qty = parseFloat(tempCount);
        if (isNaN(qty) || qty < 0) {
            alert("Invalid quantity");
            return;
        }

        await auditService.submitCount(stockTakeId, {
            materialId: editingItem.materialId,
            binCode: editingItem.binCode,
            batchCode: editingItem.batchCode,
            countQty: qty,
            reason: "" 
        });

        await loadTasks(); 
        setEditingItem(null);
    } catch (error: any) {
        alert(error.response?.data?.message || "Failed to save count.");
    } finally {
        setSavingItem(false);
    }
  };

  const handleCompleteAudit = async () => {
    if(!confirm("Are you sure you have finished all your tasks?")) return;
    try {
        await auditService.finishWork(stockTakeId);
        alert("Marked as finished!");
        router.push("/staff/audit");
    } catch (error: any) {
         alert(error.response?.data?.message || "Failed to finish.");
    }
  };

  const progress = tasks.length > 0 
    ? Math.round((tasks.filter(t => t.countQty !== null && t.countQty !== undefined).length / tasks.length) * 100) 
    : 0;

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
                <h2 className="text-lg font-semibold text-slate-900">My Count Tasks (Audit #{stockTakeId})</h2>
            </div>
            <UserDropdown align="end" trigger={<Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"><User className="h-5 w-5" /></Button>} />
          </div>
        </header>

        <div className="flex-grow overflow-y-auto p-4 lg:p-8 space-y-6 max-w-lg mx-auto w-full">
           <div className="bg-indigo-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex justify-between items-end mb-2">
                 <div>
                    <h2 className="text-2xl font-bold">Progress</h2>
                    <p className="opacity-80 text-sm">Counting assigned items</p>
                 </div>
                 <div className="text-3xl font-bold">{progress}%</div>
              </div>
              <div className="w-full bg-indigo-900/30 h-2 rounded-full overflow-hidden">
                 <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
           </div>

           <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input placeholder="Scan item or search..." className="pl-10 bg-white" />
           </div>

           {loading ? <div className="text-center py-4">Loading items...</div> : (
               <div className="space-y-3">
                  {tasks.map((task) => (
                     <motion.div key={`${task.materialId}-${task.batchId}-${task.binId}`} layout>
                        <Card 
                           className={`border-l-4 shadow-sm cursor-pointer ${task.countQty !== null ? 'border-green-500 bg-green-50/30' : 'border-slate-300'}`}
                           onClick={() => startEdit(task)}
                        >
                           <CardContent className="p-4 flex justify-between items-center">
                              <div>
                                 <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-900">{task.materialName}</h3>
                                    {task.countQty !== null && <Check className="w-4 h-4 text-green-600" />}
                                 </div>
                                 <p className="text-xs text-slate-500">Batch: {task.batchCode}</p>
                                 <div className="flex items-center gap-1 mt-1">
                                    <LayoutGrid className="w-3 h-3 text-indigo-500" />
                                    <span className="text-xs font-medium text-indigo-700">{task.binCode}</span>
                                 </div>
                              </div>
                              <div className="text-right">
                                 {task.countQty !== null ? (
                                    <div className="text-xl font-bold text-slate-900">{task.countQty}</div>
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
           )}

           <div className="pt-4">
             <Button 
                size="lg" 
                className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700 text-white shadow-md"
                onClick={handleCompleteAudit}
             >
                <Send className="w-5 h-5 mr-2" /> Finish My Work
             </Button>
           </div>

           {editingItem && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                 <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-white w-full max-w-sm rounded-xl p-6 shadow-2xl space-y-4"
                 >
                    <div className="text-center">
                       <h3 className="text-lg font-bold">Enter Quantity</h3>
                       <p className="text-slate-500 text-sm">Physical count for {editingItem.materialName} ({editingItem.batchCode})</p>
                    </div>
                    
                    <Input 
                       type="number" 
                       className="text-center text-3xl h-16 font-bold" 
                       autoFocus 
                       value={tempCount}
                       onChange={(e) => setTempCount(e.target.value)}
                    />

                    <div className="grid grid-cols-2 gap-4">
                       <Button variant="outline" onClick={() => setEditingItem(null)} className="h-12" disabled={savingItem}>Cancel</Button>
                       <Button onClick={saveCount} className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold" disabled={savingItem}>
                          {savingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save
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