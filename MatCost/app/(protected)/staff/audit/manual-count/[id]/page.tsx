"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { ArrowLeft, Send, Check, Search, LayoutGrid, Save, Loader2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { auditService, CountItemDto } from "@/services/audit-service";
import { toast } from "sonner";
import { showConfirmToast } from "@/hooks/confirm-toast";

export default function StaffCountingPage() {
  const router = useRouter();
  const params = useParams();
  const stockTakeId = Number(params?.id);

  const [tasks, setTasks] = useState<CountItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingItem, setEditingItem] = useState<CountItemDto | null>(null);
  const [tempCount, setTempCount] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  const loadTasks = async () => {
    try {
        setLoading(true);
        const data = await auditService.getCountItems(stockTakeId, "", false);
        setTasks(data);
    } catch (error) {
        console.error(error);
        toast.error("Không thể tải danh sách kiểm kê.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (stockTakeId) loadTasks();
  }, [stockTakeId]);

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
            toast.error("Số lượng không hợp lệ!");
            return;
        }

        await auditService.submitCount(stockTakeId, {
            materialId: editingItem.materialId,
            binCode: editingItem.binCode,
            batchCode: editingItem.batchCode,
            countQty: qty,
            reason: "" 
        });
        
        toast.success(`Đã lưu: ${editingItem.materialName} - ${qty}`);
        await loadTasks(); 
        setEditingItem(null);
    } catch (error: any) {
        toast.error(error.response?.data?.message || "Lỗi khi lưu số lượng.");
    } finally {
        setSavingItem(false);
    }
  };

  const handleCompleteAudit = () => {
    showConfirmToast({
       title: "Xác nhận hoàn thành?",
       description: "Sau khi gửi, bạn sẽ không thể sửa lại số liệu đếm được nữa.",
       confirmLabel: "Gửi kết quả",
       onConfirm: async () => {
          try {
             await auditService.finishWork(stockTakeId);
             toast.success("Đã nộp kết quả kiểm kê!");
             router.push("/staff/audit");
          } catch (error: any) {
             toast.error(error.response?.data?.message || "Lỗi khi nộp kết quả.");
          }
       }
    });
  };

  const progress = tasks.length > 0 
    ? Math.round((tasks.filter(t => t.countQty !== null && t.countQty !== undefined).length / tasks.length) * 100) 
    : 0;

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title="Manual Count Task" />

        <div className="flex-grow overflow-y-auto p-4 lg:p-8 space-y-6 max-w-2xl mx-auto w-full">
           <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:bg-transparent hover:text-indigo-600">
                 <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <div className="text-sm text-slate-500 font-medium">
                 Audit ID: <span className="text-slate-800">#{stockTakeId}</span>
              </div>
           </div>

           {/* Progress Card */}
           <div className="bg-indigo-600 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex justify-between items-end mb-4 relative z-10">
                 <div>
                    <h2 className="text-2xl font-bold">Your Progress</h2>
                    <p className="text-indigo-100 text-sm mt-1">Counting assigned inventory</p>
                 </div>
                 <div className="text-4xl font-black">{progress}%</div>
              </div>
              <div className="w-full bg-indigo-900/40 h-2.5 rounded-full overflow-hidden relative z-10">
                 <div className="bg-emerald-400 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
              </div>
           </div>

           {/* Search */}
           <div className="relative shadow-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input placeholder="Scan barcode or search by name..." className="pl-10 bg-white h-11" />
           </div>

           {/* Task List */}
           {loading ? (
               <div className="text-center py-10 text-slate-500 flex flex-col items-center gap-2">
                   <Loader2 className="animate-spin w-6 h-6 text-indigo-500"/>
                   <span>Loading items...</span>
               </div>
           ) : (
               <div className="space-y-3 pb-20">
                  {tasks.map((task) => (
                     <Card 
                        key={`${task.materialId}-${task.batchId}-${task.binId}`}
                        className={`overflow-hidden transition-all duration-200 shadow-sm border ${task.countQty !== null ? 'border-l-4 border-l-emerald-500 bg-emerald-50/20' : 'border-slate-200 hover:border-indigo-300'}`}
                     >
                        <CardContent className="p-4 flex justify-between items-center gap-4">
                           <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                 <h3 className="font-bold text-slate-800 truncate">{task.materialName}</h3>
                                 {task.countQty !== null && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                 <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Batch: {task.batchCode}</span>
                                 <span className="flex items-center gap-1"><LayoutGrid className="w-3 h-3 text-indigo-400" /> {task.binCode}</span>
                              </div>
                           </div>
                           
                           <div className="text-right flex-shrink-0">
                              {task.countQty !== null ? (
                                 <div className="flex flex-col items-end gap-1">
                                    <div className="text-xl font-black text-slate-900">{task.countQty}</div>
                                    <button onClick={() => startEdit(task)} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium">
                                        <PenLine className="w-3 h-3"/> Edit
                                    </button>
                                 </div>
                              ) : (
                                 <Button size="sm" onClick={() => startEdit(task)} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 border border-indigo-200">
                                    Input Qty
                                 </Button>
                              )}
                           </div>
                        </CardContent>
                     </Card>
                  ))}
               </div>
           )}

           {/* Floating Submit Button (Dính dưới đáy) */}
           <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 flex justify-center z-20">
             <div className="w-full max-w-2xl">
                 <Button 
                    size="lg" 
                    className="w-full h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                    onClick={handleCompleteAudit}
                    disabled={progress < 100} // Ép buộc đếm xong mới cho nộp (tùy logic của bạn)
                 >
                    <Send className="w-5 h-5 mr-2" /> Finish & Submit Count
                 </Button>
                 {progress < 100 && <p className="text-center text-xs text-slate-500 mt-2">You must complete counting all items to submit.</p>}
             </div>
           </div>

           {/* Edit Dialog (Shadcn UI) */}
           <Dialog open={editingItem !== null} onOpenChange={(open) => !open && setEditingItem(null)}>
              <DialogContent className="sm:max-w-[400px]">
                 <DialogHeader>
                    <DialogTitle className="text-indigo-700 text-xl">Enter Quantity</DialogTitle>
                    <DialogDescription>
                       Physical count for <strong className="text-slate-800">{editingItem?.materialName}</strong>
                    </DialogDescription>
                 </DialogHeader>
                 <div className="py-6">
                    <div className="flex justify-center mb-6 text-sm text-slate-500 gap-4">
                        <span className="bg-slate-100 px-2 py-1 rounded">Batch: {editingItem?.batchCode}</span>
                        <span className="bg-slate-100 px-2 py-1 rounded">Bin: {editingItem?.binCode}</span>
                    </div>
                    <Input 
                       type="number" 
                       className="text-center text-4xl h-20 font-black text-indigo-700 bg-slate-50 border-2 focus-visible:ring-indigo-500" 
                       autoFocus 
                       value={tempCount}
                       onChange={(e) => setTempCount(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && saveCount()}
                    />
                 </div>
                 <DialogFooter className="grid grid-cols-2 gap-3 sm:space-x-0">
                    <Button variant="outline" onClick={() => setEditingItem(null)} disabled={savingItem} className="h-12 text-base">Cancel</Button>
                    <Button onClick={saveCount} disabled={savingItem} className="h-12 text-base bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                       {savingItem ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />} Save
                    </Button>
                 </DialogFooter>
              </DialogContent>
           </Dialog>
        </div>
      </main>
    </div>
  );
}