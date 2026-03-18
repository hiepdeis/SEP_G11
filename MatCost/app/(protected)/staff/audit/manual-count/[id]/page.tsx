"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { ArrowLeft, Send, Check, Search, LayoutGrid, Save, Loader2, PenLine, AlertTriangle, RefreshCcw, Filter } from "lucide-react";
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

  const [activeTab, setActiveTab] = useState<"normal" | "recount">("normal");
  
  const [tasks, setTasks] = useState<CountItemDto[]>([]);
  const [recountTasks, setRecountTasks] = useState<CountItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  
  // STATE MỚI: Dùng để lưu trạng thái của bộ lọc
  const [uncountedOnly, setUncountedOnly] = useState(false);
  
  const [editingItem, setEditingItem] = useState<CountItemDto | null>(null);
  const [tempCount, setTempCount] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  // CẬP NHẬT: Truyền uncountedOnly vào API
  const loadTasks = async () => {
    try {
        setLoading(true);
        const [normalData, recountData] = await Promise.all([
           auditService.getCountItems(stockTakeId, "", uncountedOnly), // <--- TRUYỀN PARAM VÀO ĐÂY
           auditService.getRecountItems(stockTakeId, "")
        ]);
        setTasks(normalData);
        setRecountTasks(recountData);
        
        if (recountData.length > 0 && activeTab === "normal" && !uncountedOnly) {
           setActiveTab("recount");
        }
    } catch (error) {
        console.error(error);
        toast.error("Không thể tải danh sách kiểm kê.");
    } finally {
        setLoading(false);
    }
  };

  // CẬP NHẬT: Thêm uncountedOnly vào mảng dependency để tự gọi lại API khi bấm nút Lọc
  useEffect(() => {
    if (stockTakeId) loadTasks();
  }, [stockTakeId, uncountedOnly]);

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

        if (activeTab === "recount") {
           await auditService.submitRecount(stockTakeId, {
               materialId: editingItem.materialId,
               binCode: editingItem.binCode || "",
               batchCode: editingItem.batchCode || "",
               countQty: qty,
           });
        } else {
           await auditService.submitCount(stockTakeId, {
               materialId: editingItem.materialId,
               binCode: editingItem.binCode || "",
               batchCode: editingItem.batchCode || "",
               countQty: qty,
           });
        }
        
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
    if (recountTasks.length > 0) {
       toast.error("Bạn phải hoàn thành tất cả các mục đếm lại trước khi nộp!");
       return;
    }

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

  // Nếu đang bật uncountedOnly, progress tạm coi là "đang lọc" nên có thể ẩn thanh tiến độ hoặc để nguyên
  // Ở đây tôi vẫn tính dựa trên tổng tasks trả về (hoặc nếu BE chỉ trả uncounted thì tự gán = 0)
  const progress = tasks.length > 0 && !uncountedOnly
    ? Math.round((tasks.filter(t => t.countQty !== null && t.countQty !== undefined).length / tasks.length) * 100) 
    : uncountedOnly ? 0 : 0; 

  const displayData = activeTab === "normal" ? tasks : recountTasks;

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

           {/* Progress Card (Ẩn % khi đang lọc để tránh gây hiểu nhầm) */}
           <div className="bg-indigo-600 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex justify-between items-end mb-4 relative z-10">
                 <div>
                    <h2 className="text-2xl font-bold">Your Progress</h2>
                    <p className="text-indigo-100 text-sm mt-1">
                      {uncountedOnly ? "Đang lọc các mục chưa đếm" : "Counting assigned inventory"}
                    </p>
                 </div>
                 {!uncountedOnly && <div className="text-4xl font-black">{progress}%</div>}
              </div>
              {!uncountedOnly && (
                <div className="w-full bg-indigo-900/40 h-2.5 rounded-full overflow-hidden relative z-10">
                   <div className="bg-emerald-400 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
                </div>
              )}
           </div>

           <div className="flex gap-2 bg-slate-200/50 p-1.5 rounded-xl shadow-inner">
              <button
                onClick={() => setActiveTab("normal")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  activeTab === "normal"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
              >
                First Count
              </button>
              <button
                onClick={() => setActiveTab("recount")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === "recount"
                    ? "bg-white text-rose-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
              >
                Recount Tasks
                {recountTasks.length > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                    {recountTasks.length}
                  </span>
                )}
              </button>
           </div>

           {/* CẬP NHẬT: Search Bar + Nút Filter nằm cùng 1 hàng */}
           <div className="flex gap-3 items-center">
              <div className="relative shadow-sm flex-1">
                 <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                 <Input placeholder="Scan barcode or search by name..." className="pl-10 bg-white h-11" />
              </div>
              {/* Nút lọc chỉ xuất hiện ở tab First Count */}
              {activeTab === "normal" && (
                <Button 
                  variant={uncountedOnly ? "default" : "outline"}
                  onClick={() => setUncountedOnly(!uncountedOnly)}
                  className={`h-11 shadow-sm px-4 flex-shrink-0 transition-colors ${uncountedOnly ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600" : "bg-white text-slate-600"}`}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {uncountedOnly ? "Chưa đếm" : "Tất cả"}
                </Button>
              )}
           </div>

           {/* Task List */}
           {loading ? (
               <div className="text-center py-10 text-slate-500 flex flex-col items-center gap-2">
                   <Loader2 className="animate-spin w-6 h-6 text-indigo-500"/>
                   <span>Loading items...</span>
               </div>
           ) : (
               <div className="space-y-3 pb-24">
                  {displayData.length === 0 ? (
                     <div className="text-center py-10 px-4 bg-white rounded-xl border border-dashed border-slate-300">
                        <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                        <p className="text-slate-500 font-medium">
                           {activeTab === "recount" 
                              ? "Tuyệt vời! Không có mặt hàng nào cần đếm lại." 
                              : uncountedOnly 
                                 ? "Tuyệt vời! Bạn đã đếm xong tất cả." 
                                 : "Chưa có mặt hàng nào để đếm."}
                        </p>
                     </div>
                  ) : (
                     displayData.map((task) => (
                        <Card 
                           key={`${task.materialId}-${task.batchId}-${task.binId}`}
                           className={`overflow-hidden transition-all duration-200 shadow-sm border ${
                              activeTab === "recount" 
                                 ? 'border-l-4 border-l-rose-500 bg-rose-50/10' 
                                 : task.countQty !== null ? 'border-l-4 border-l-emerald-500 bg-emerald-50/20' : 'border-slate-200 hover:border-indigo-300'
                           }`}
                        >
                           <CardContent className="p-4 flex justify-between items-center gap-4">
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-slate-800 truncate">{task.materialName}</h3>
                                    {activeTab === "normal" && task.countQty !== null && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                                    {activeTab === "recount" && <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />}
                                 </div>
                                 <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">Batch: {task.batchCode}</span>
                                    <span className="flex items-center gap-1 font-medium"><LayoutGrid className="w-3 h-3 text-indigo-400" /> {task.binCode}</span>
                                 </div>
                              </div>
                              
                              <div className="text-right flex-shrink-0">
                                 {task.countQty !== null && activeTab === "normal" ? (
                                    <div className="flex flex-col items-end gap-1">
                                       <div className="text-xl font-black text-slate-900">{task.countQty}</div>
                                       <button onClick={() => startEdit(task)} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium">
                                           <PenLine className="w-3 h-3"/> Edit
                                       </button>
                                    </div>
                                 ) : (
                                    <Button 
                                       size="sm" 
                                       onClick={() => startEdit(task)} 
                                       className={activeTab === "recount" ? "bg-rose-100 text-rose-700 hover:bg-rose-200 border-none font-bold" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"}
                                    >
                                       {activeTab === "recount" ? <><RefreshCcw className="w-3 h-3 mr-1.5" /> Recount</> : "Input Qty"}
                                    </Button>
                                 )}
                              </div>
                           </CardContent>
                        </Card>
                     ))
                  )}
               </div>
           )}

           {/* Floating Submit Button */}
           <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 flex justify-center z-20">
             <div className="w-full max-w-2xl flex flex-col gap-2">
                 {recountTasks.length > 0 && (
                    <div className="bg-rose-50 text-rose-600 text-xs font-medium px-3 py-2 rounded-lg border border-rose-100 flex items-center gap-2">
                       <AlertTriangle className="w-4 h-4 flex-shrink-0" /> Bạn phải hoàn thành đếm lại {recountTasks.length} mục trước khi nộp.
                    </div>
                 )}
                 {/* Khóa nút Finish nếu vẫn còn hàng chưa đếm VÀ đang không bật chế độ lọc (progress < 100) */}
                 <Button 
                    size="lg" 
                    className={`w-full h-12 text-base font-bold shadow-lg ${(!uncountedOnly && progress < 100) || recountTasks.length > 0 ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
                    onClick={handleCompleteAudit}
                    disabled={(!uncountedOnly && progress < 100) || recountTasks.length > 0} 
                 >
                    <Send className="w-5 h-5 mr-2" /> Finish & Submit Count
                 </Button>
             </div>
           </div>

           {/* Edit Dialog */}
           <Dialog open={editingItem !== null} onOpenChange={(open) => !open && setEditingItem(null)}>
              <DialogContent className="sm:max-w-[400px]">
                 <DialogHeader>
                    <DialogTitle className={`text-xl flex items-center gap-2 ${activeTab === 'recount' ? 'text-rose-600' : 'text-indigo-700'}`}>
                       {activeTab === "recount" ? <RefreshCcw className="w-5 h-5"/> : <PenLine className="w-5 h-5" />}
                       {activeTab === "recount" ? "Nhập Số Lượng Đếm Lại" : "Enter Quantity"}
                    </DialogTitle>
                    <DialogDescription>
                       Physical count for <strong className="text-slate-800">{editingItem?.materialName}</strong>
                    </DialogDescription>
                 </DialogHeader>
                 <div className="py-6">
                    <div className="flex justify-center mb-6 text-sm text-slate-500 gap-4">
                        <span className="bg-slate-100 px-2 py-1 rounded font-medium text-slate-700">Batch: {editingItem?.batchCode}</span>
                        <span className="bg-slate-100 px-2 py-1 rounded font-medium text-slate-700">Bin: {editingItem?.binCode}</span>
                    </div>
                    <Input 
                       type="number" 
                       className={`text-center text-4xl h-20 font-black bg-slate-50 border-2 ${activeTab === 'recount' ? 'text-rose-700 focus-visible:ring-rose-500' : 'text-indigo-700 focus-visible:ring-indigo-500'}`} 
                       autoFocus 
                       value={tempCount}
                       onChange={(e) => setTempCount(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && saveCount()}
                    />
                 </div>
                 <DialogFooter className="grid grid-cols-2 gap-3 sm:space-x-0">
                    <Button variant="outline" onClick={() => setEditingItem(null)} disabled={savingItem} className="h-12 text-base">Cancel</Button>
                    <Button onClick={saveCount} disabled={savingItem} className={`h-12 text-base font-bold text-white ${activeTab === 'recount' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
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