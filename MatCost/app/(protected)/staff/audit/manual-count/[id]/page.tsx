"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { ArrowLeft, Send, Check, Search, Save, Loader2, PenLine, AlertTriangle, RefreshCcw, Filter, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { auditService, CountItemDto, MaterialBatchDto } from "@/services/audit-service";
import { toast } from "sonner";
import { showConfirmToast } from "@/hooks/confirm-toast";

export default function StaffCountingPage() {
  const router = useRouter();
  const params = useParams();
  const stockTakeId = Number(params?.id);

  const [activeTab, setActiveTab] = useState<"normal" | "recount">("normal");
  
  const [uncountedTasks, setUncountedTasks] = useState<MaterialBatchDto[]>([]);
  const [countedTasks, setCountedTasks] = useState<MaterialBatchDto[]>([]);
  const [recountTasks, setRecountTasks] = useState<CountItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [uncountedOnly, setUncountedOnly] = useState(true);
  
  const [editingItem, setEditingItem] = useState<MaterialBatchDto | CountItemDto | null>(null);
  const [tempCount, setTempCount] = useState("");
  const [tempBin, setTempBin] = useState(""); // Thêm State nhập BinCode cho Blind Count
  const [savingItem, setSavingItem] = useState(false);

  const loadTasks = async () => {
    try {
        setLoading(true);
        const [uncountedData, countedData, recountData] = await Promise.all([
           auditService.getUncountedItems(stockTakeId),
           auditService.getCountedItems(stockTakeId),
           auditService.getRecountItems(stockTakeId, "")
        ]);
        setUncountedTasks(uncountedData);
        setCountedTasks(countedData);
        setRecountTasks(recountData);
        
        if (recountData.length > 0 && activeTab === "normal") {
           setActiveTab("recount");
        }
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

  const startEdit = (item: any, isRecount: boolean) => {
    setEditingItem(item);
    if (isRecount) {
      setTempCount(item.countQty?.toString() || "");
      setTempBin(item.binCode || ""); // Recount đã có sẵn Bin
    } else {
      setTempCount("");
      setTempBin(""); // Blind count bắt buộc gõ Bin
    }
  };

  const saveCount = async () => {
    if (!editingItem) return;
    if (!tempBin.trim()) { toast.error("Vui lòng nhập vị trí BinCode!"); return; }
    
    const qty = parseFloat(tempCount);
    if (isNaN(qty) || qty < 0) { toast.error("Số lượng không hợp lệ!"); return; }

    try {
        setSavingItem(true);
        const payload = {
            materialId: editingItem.materialId,
            binCode: tempBin.trim(),
            batchCode: editingItem.batchCode || "",
            countQty: qty,
        };

        if (activeTab === "recount") {
           await auditService.submitRecount(stockTakeId, payload);
        } else {
           await auditService.submitCount(stockTakeId, payload);
        }
        
        toast.success(`Đã lưu thành công!`);
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
       toast.error("Bạn phải hoàn thành tất cả các mục đếm lại trước khi nộp!"); return;
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
             toast.error(error.response?.data?.message || "Lỗi nộp kết quả.");
          }
       }
    });
  };

  const totalTasks = uncountedTasks.length + countedTasks.length;
  const progress = totalTasks > 0 ? Math.round((countedTasks.length / totalTasks) * 100) : 0;
  const displayNormalData = uncountedOnly ? uncountedTasks : countedTasks;

  return (
    <div className="flex flex-row h-screen w-screen bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title="Manual Count Task" />

        <div className="flex-grow overflow-y-auto p-4 lg:p-8 space-y-6 max-w-2xl mx-auto w-full">
           <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:text-indigo-600">
                 <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <div className="text-sm font-medium">Audit ID: #{stockTakeId}</div>
           </div>

           <div className="bg-indigo-600 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
              <div className="flex justify-between items-end mb-4">
                 <div>
                    <h2 className="text-2xl font-bold">Your Progress</h2>
                    <p className="text-indigo-100 text-sm mt-1">Blind Counting Approach</p>
                 </div>
                 <div className="text-4xl font-black">{progress}%</div>
              </div>
              <div className="w-full bg-indigo-900/40 h-2.5 rounded-full overflow-hidden">
                 <div className="bg-emerald-400 h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
           </div>

           <div className="flex gap-2 bg-slate-200/50 p-1.5 rounded-xl shadow-inner">
              <button
                onClick={() => setActiveTab("normal")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "normal" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}
              >
                First Count
              </button>
              <button
                onClick={() => setActiveTab("recount")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === "recount" ? "bg-white text-rose-700 shadow-sm" : "text-slate-500"}`}
              >
                Recount Tasks
                {recountTasks.length > 0 && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{recountTasks.length}</span>}
              </button>
           </div>

           {activeTab === "normal" && (
             <div className="flex gap-3 items-center">
                <div className="relative flex-1"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><Input placeholder="Scan barcode..." className="pl-10 h-11" /></div>
                <Button variant={uncountedOnly ? "default" : "outline"} onClick={() => setUncountedOnly(!uncountedOnly)} className={`h-11 px-4 ${uncountedOnly ? "bg-indigo-600 text-white" : ""}`}>
                  <Filter className="w-4 h-4 mr-2" /> {uncountedOnly ? "Chưa đếm" : "Đã đếm"}
                </Button>
             </div>
           )}

           {loading ? <Loader2 className="animate-spin w-6 h-6 text-indigo-500 mx-auto mt-10"/> : (
               <div className="space-y-3 pb-24">
                  {activeTab === "recount" ? recountTasks.map(task => (
                      <Card key={task.id} className="border-l-4 border-l-rose-500 bg-rose-50/10 shadow-sm">
                         <CardContent className="p-4 flex justify-between items-center">
                            <div>
                               <div className="font-bold flex items-center gap-2">{task.materialName} <AlertTriangle className="w-4 h-4 text-rose-500"/></div>
                               <div className="text-xs text-slate-500 mt-1">Batch: {task.batchCode} | Lần đếm: {task.countRound || 1}</div>
                               <div className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/> Bin: {task.binCode}</div>
                            </div>
                            <Button size="sm" onClick={() => startEdit(task, true)} className="bg-rose-100 text-rose-700 hover:bg-rose-200">
                               <RefreshCcw className="w-3 h-3 mr-1.5" /> Recount
                            </Button>
                         </CardContent>
                      </Card>
                  )) : displayNormalData.map(task => (
                      <Card key={`${task.materialId}-${task.batchId}`} className={`border-l-4 ${uncountedOnly ? "border-l-indigo-400" : "border-l-emerald-500 bg-emerald-50/20"} shadow-sm`}>
                         <CardContent className="p-4 flex justify-between items-center">
                            <div>
                               <div className="font-bold flex items-center gap-2">{task.materialName} {!uncountedOnly && <Check className="w-4 h-4 text-emerald-600"/>}</div>
                               <div className="text-xs text-slate-500 mt-1">Batch: {task.batchCode}</div>
                            </div>
                            <Button size="sm" onClick={() => startEdit(task, false)} variant={uncountedOnly ? "default" : "outline"}>
                               <PenLine className="w-3 h-3 mr-1.5"/> {uncountedOnly ? "Count" : "Edit"}
                            </Button>
                         </CardContent>
                      </Card>
                  ))}
               </div>
           )}

           <div className="fixed bottom-0 left-0 lg:left-64 right-0 p-4 bg-white border-t flex justify-center z-20">
             <Button size="lg" className={`w-full max-w-2xl font-bold ${progress < 100 || recountTasks.length > 0 ? "bg-slate-300" : "bg-emerald-600 text-white"}`} onClick={handleCompleteAudit} disabled={progress < 100 || recountTasks.length > 0}>
                <Send className="w-5 h-5 mr-2" /> Finish & Submit Count
             </Button>
           </div>

           <Dialog open={editingItem !== null} onOpenChange={(o) => !o && setEditingItem(null)}>
              <DialogContent className="sm:max-w-[400px]">
                 <DialogHeader><DialogTitle>{activeTab === "recount" ? "Nhập Lại Số Lượng" : "Nhập Số Lượng Đếm"}</DialogTitle></DialogHeader>
                 <div className="py-4 space-y-4">
                    <p className="font-bold text-center text-lg">{editingItem?.materialName}</p>
                    <div className="space-y-2">
                       <label className="text-xs font-semibold uppercase text-slate-500">Mã Vị Trí (Bin Code) <span className="text-red-500">*</span></label>
                       <Input value={tempBin} onChange={e => setTempBin(e.target.value)} disabled={activeTab === "recount"} className="uppercase font-bold" placeholder="VD: ZONE-A1" autoFocus={activeTab === "normal"}/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-semibold uppercase text-slate-500">Số lượng thực tế</label>
                       <div className="flex items-center gap-2">
                          <Input type="number" value={tempCount} onChange={e => setTempCount(e.target.value)} className="text-center text-3xl h-16 font-black" autoFocus={activeTab === "recount"}/>
                          {(editingItem as CountItemDto)?.unitName && <span className="text-lg font-bold text-slate-500">{(editingItem as CountItemDto).unitName}</span>}
                       </div>
                    </div>
                 </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingItem(null)}>Hủy</Button>
                    <Button onClick={saveCount} disabled={savingItem}>{savingItem ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4 mr-2"/>} Lưu</Button>
                 </DialogFooter>
              </DialogContent>
           </Dialog>
        </div>
      </main>
    </div>
  );
}