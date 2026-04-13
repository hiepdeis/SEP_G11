"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { ArrowLeft, Send, Check, Search, Save, Loader2, PenLine, AlertTriangle, RefreshCcw, Filter, MapPin, CheckCircle2, Eraser, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { auditService, CountItemDto, MaterialBatchDto } from "@/services/audit-service";
import { toast } from "sonner";
import { showConfirmToast } from "@/hooks/confirm-toast";
import { useTranslation } from "react-i18next";
import ReactSignatureCanvas from "react-signature-canvas";

export default function StaffCountingPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const stockTakeId = Number(params?.id);

  const [activeTab, setActiveTab] = useState<"normal" | "recount">("normal");
  const [uncountedTasks, setUncountedTasks] = useState<MaterialBatchDto[]>([]);
  const [countedTasks, setCountedTasks] = useState<MaterialBatchDto[]>([]);
  const [recountTasks, setRecountTasks] = useState<CountItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [uncountedOnly, setUncountedOnly] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingItem, setEditingItem] = useState<MaterialBatchDto | CountItemDto | null>(null);
  const [tempCount, setTempCount] = useState("");
  const [tempBin, setTempBin] = useState("");
  const [savingItem, setSavingItem] = useState(false);
  
  // Signature Signature
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const sigCanvas = useRef<ReactSignatureCanvas>(null);

  const loadTasks = async () => {
    try {
        setLoading(true);
        setAccessDenied(false); 
        const [uncountedData, countedData, recountData] = await Promise.all([
           auditService.getUncountedItems(stockTakeId),
           auditService.getCountedItems(stockTakeId),
           auditService.getRecountItems(stockTakeId, "")
        ]);
        setUncountedTasks(uncountedData);
        setCountedTasks(countedData);
        setRecountTasks(recountData);
        if (recountData.length > 0 && activeTab === "normal") setActiveTab("recount");
    } catch (error: any) {
        const status = error.response?.status;
        if (status === 401 || status === 403) {
            setAccessDenied(true); 
        } else {
            toast.error(t("Error loading tasks. Please try again."));
        }
    } finally { setLoading(false); }
  };

  useEffect(() => { if (stockTakeId) loadTasks(); }, [stockTakeId]);

  const startEdit = (item: any, isRecount: boolean) => {
    setEditingItem(item);
    if (isRecount) { setTempCount(""); setTempBin(item.binCode || ""); } 
    else { setTempCount(""); setTempBin(""); }
  };

  const saveCount = async () => {
    if (!editingItem) return;
    if (!tempBin.trim()) return toast.error(t("Please enter Bin Code!"));
    const qty = parseFloat(tempCount);
    if (isNaN(qty) || qty < 0) return toast.error(t("Invalid quantity!"));

    try {
        setSavingItem(true);
        const payload = { materialId: editingItem.materialId, binCode: tempBin.trim(), batchCode: editingItem.batchCode || "", countQty: qty };
        if (activeTab === "recount") await auditService.submitRecount(stockTakeId, payload);
        else await auditService.submitCount(stockTakeId, payload);
        
        toast.success(t("Saved successfully!"));
        setSearchTerm("");
        await loadTasks(); 
        setEditingItem(null);
    } catch (error: any) { toast.error(error.response?.data?.message || t("Error saving quantity.")); } 
    finally { setSavingItem(false); }
  };

  const handleCompleteAudit = () => {
    if (recountTasks.length > 0) return toast.error(t("You must complete all recount tasks before submitting!"));
    setIsSignatureModalOpen(true);
  };

  const handleSignatureEnd = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) setIsSigned(true);
  };

  const clearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setIsSigned(false);
    }
  };

  const handleConfirmFullSubmit = async () => {
    if (!isSigned || !sigCanvas.current || sigCanvas.current.isEmpty()) {
       return toast.error(t("Please provide your signature before submitting"));
    }

    try {
      setIsSubmittingFinal(true);
      const signatureData = sigCanvas.current.toDataURL(); // Base64 signature
      
      await auditService.signOff(stockTakeId, signatureData);
      
      toast.success(t("Audit results submitted and signed successfully!"));
      router.push('/staff/audit');
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("Error submitting results."));
    } finally {
      setIsSubmittingFinal(false);
    }
  };

  const totalTasks = uncountedTasks.length + countedTasks.length;
  const progress = totalTasks > 0 ? Math.round((countedTasks.length / totalTasks) * 100) : 0;
  const displayNormalData = uncountedOnly ? uncountedTasks : countedTasks;
  const filteredData = displayNormalData.filter(task => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return task.materialName.toLowerCase().includes(term) || (task.batchCode && task.batchCode.toLowerCase().includes(term));
  });
  const displayRecountData = uncountedOnly ? recountTasks : [];
  const filteredRecountData = displayRecountData.filter(task => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return task.materialName?.toLowerCase().includes(term) || (task.batchCode && task.batchCode.toLowerCase().includes(term));
  });

  return (
    <div className="flex flex-row h-screen w-screen bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Manual Count Task")} />
        <div className="flex-1 w-full overflow-y-auto">
          {loading ? (
             <div className="flex flex-col items-center justify-center pt-32"><Loader2 className="animate-spin w-8 h-8 text-indigo-600 mb-4" /><p className="text-slate-500 font-medium">{t("Loading audit data...")}</p></div>
          ) : accessDenied ? (
             <div className="flex flex-col items-center justify-center pt-32 pb-20 space-y-5 px-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center shadow-sm"><CheckCircle2 className="w-12 h-12 text-emerald-600" /></div>
                  <h2 className="text-3xl font-extrabold text-slate-800 text-center">{t("Task Completed!")}</h2>
                  <p className="text-slate-600 text-center max-w-md text-base leading-relaxed">
                      {t("You have submitted the count results for this audit.")}<br/><br/>
                      {t("Please wait for Manager's review. If there are discrepancies, 'Recount' list will appear here.")}
                  </p>
                  <Button size="lg" className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md h-12 px-8" onClick={() => router.push('/staff/audit')}><ArrowLeft className="w-5 h-5 mr-2" /> {t("Back to List")}</Button>
             </div>
          ) : (
            <div className="p-4 lg:p-8 space-y-6 max-w-2xl mx-auto w-full pb-28">
              <div className="flex items-center justify-between">
                  <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:text-indigo-600"><ArrowLeft className="w-4 h-4 mr-2" /> {t("Back")}</Button>
                  <div className="text-sm font-medium">Audit ID: #{stockTakeId}</div>
              </div>
              <div className="bg-indigo-600 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
                  <div className="flex justify-between items-end mb-4">
                    <div><h2 className="text-2xl font-bold">{t("Your Progress")}</h2><p className="text-indigo-100 text-sm mt-1">{t("Blind Counting Approach")}</p></div>
                    <div className="text-4xl font-black">{progress}%</div>
                  </div>
                  <div className="w-full bg-indigo-900/40 h-2.5 rounded-full overflow-hidden"><div className="bg-emerald-400 h-full rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
              </div>
              <div className="flex gap-2 bg-slate-200/50 p-1.5 rounded-xl shadow-inner">
                  <button onClick={() => setActiveTab("normal")} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "normal" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>{t("First Count")}</button>
                  <button onClick={() => setActiveTab("recount")} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === "recount" ? "bg-white text-rose-700 shadow-sm" : "text-slate-500"}`}>
                    {t("Recount Tasks")}{recountTasks.length > 0 && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{recountTasks.length}</span>}
                  </button>
              </div>
              <div className="flex gap-3 items-center">
                  <div className="relative flex-1"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><Input placeholder={t("Search name or batch...")} className="pl-10 h-11 bg-white shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                  <Button variant={uncountedOnly ? "default" : "outline"} onClick={() => setUncountedOnly(!uncountedOnly)} className={`h-11 w-[140px] flex-shrink-0 transition-colors ${uncountedOnly ? "bg-indigo-600 text-white border-indigo-600" : "bg-white"}`}><Filter className="w-4 h-4 mr-2 flex-shrink-0" /> <span className="truncate">{uncountedOnly ? t("Uncounted") : t("Counted")}</span></Button>
              </div>
              <div className="space-y-3">
                {activeTab === "recount" ? filteredRecountData.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">{searchTerm || !uncountedOnly ? t("No items found.") : t("List is empty.")}</div>
                ) : filteredRecountData.map(task => (
                    <Card key={task.id} className="border-l-4 border-l-rose-500 bg-rose-50/10 shadow-sm">
                        <CardContent className="p-4 flex justify-between items-center">
                          <div>
                              <div className="font-bold flex items-center gap-2 text-slate-800">{task.materialName} <AlertTriangle className="w-4 h-4 text-rose-500"/></div>
                              <div className="text-xs text-slate-500 mt-1">{t("Batch:")} {task.batchCode} | {t("Round:")} {task.countRound || 1}</div>
                              <div className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/> {t("Bin Code:")} {task.binCode}</div>
                          </div>
                          <Button size="sm" onClick={() => startEdit(task, true)} className="bg-rose-100 text-rose-700 hover:bg-rose-200"><RefreshCcw className="w-3 h-3 mr-1.5" /> {t("Recount")}</Button>
                        </CardContent>
                    </Card>
                )) : filteredData.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">{searchTerm ? t("No items found.") : t("List is empty.")}</div>
                ) : filteredData.map(task => (
                    <Card key={`${task.materialId}-${task.batchId}`} className={`border-l-4 ${uncountedOnly ? "border-l-indigo-400" : "border-l-emerald-500 bg-emerald-50/20"} shadow-sm`}>
                        <CardContent className="p-4 flex justify-between items-center">
                          <div>
                              <div className="font-bold flex items-center gap-2 text-slate-800">{task.materialName} {!uncountedOnly && <Check className="w-4 h-4 text-emerald-600"/>}</div>
                              <div className="text-xs text-slate-500 mt-1">{t("Batch:")} {task.batchCode}</div>
                          </div>
                          <Button size="sm" onClick={() => startEdit(task, false)} variant={uncountedOnly ? "default" : "outline"} className={uncountedOnly ? "bg-indigo-600 text-white" : ""}><PenLine className="w-3 h-3 mr-1.5"/> {uncountedOnly ? t("Count") : t("Edit")}</Button>
                        </CardContent>
                    </Card>
                ))}
              </div>
            </div>
          )}
        </div>
        {!accessDenied && !loading && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-center z-20">
            <Button size="lg" className={`w-full max-w-2xl font-bold ${progress < 100 || recountTasks.length > 0 ? "bg-slate-300 hover:bg-slate-300 text-slate-500" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`} onClick={handleCompleteAudit} disabled={progress < 100 || recountTasks.length > 0}><Send className="w-5 h-5 mr-2" /> {t("Finish & Submit Count")}</Button>
          </div>
        )}

        <Dialog open={editingItem !== null} onOpenChange={(o) => !o && setEditingItem(null)}>
          <DialogContent className="sm:max-w-[400px]">
              <DialogHeader><DialogTitle>{activeTab === "recount" ? t("Re-enter Quantity") : t("Enter Count Quantity")}</DialogTitle></DialogHeader>
              <div className="py-4 space-y-4">
                <p className="font-bold text-center text-lg text-slate-800">{editingItem?.materialName}</p>
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-slate-500">{t("Bin Code *")}</label>
                    <Input value={tempBin} onChange={e => setTempBin(e.target.value)} disabled={activeTab === "recount"} className="uppercase font-bold bg-slate-50 focus:bg-white" placeholder="VD: ZONE-A1" autoFocus={activeTab === "normal"}/>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-slate-500">{t("Actual Quantity *")}</label>
                    <div className="flex items-center gap-2">
                      <Input type="number" value={tempCount} onChange={e => setTempCount(e.target.value)} className="text-center text-3xl h-16 font-black bg-slate-50 focus:bg-white" autoFocus={activeTab === "recount"}/>
                      {(editingItem as CountItemDto)?.unitName && <span className="text-lg font-bold text-slate-500">{(editingItem as CountItemDto).unitName}</span>}
                    </div>
                </div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setEditingItem(null)}>{t("Cancel")}</Button><Button onClick={saveCount} disabled={savingItem} className="bg-indigo-600 text-white hover:bg-indigo-700">{savingItem ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4 mr-2"/>} {t("Save")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* SIGNATURE MODAL */}
        <Dialog open={isSignatureModalOpen} onOpenChange={(o) => { if (!isSubmittingFinal) setIsSignatureModalOpen(o); }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-indigo-700">
                <FileSignature className="w-5 h-5" /> {t("Sign Audit Record")}
              </DialogTitle>
              <DialogDescription>
                {t("All staff members must sign to finalize the count. Your signature confirms the data entered above is accurate.")}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6 flex flex-col items-center">
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-1 bg-white w-full">
                <ReactSignatureCanvas
                  ref={sigCanvas}
                  penColor="navy"
                  onEnd={handleSignatureEnd}
                  canvasProps={{
                    className: "w-full h-48 rounded-md cursor-crosshair",
                    style: { width: '100%' }
                  }}
                />
              </div>
              <div className="flex w-full justify-between items-center mt-3">
                <span className="text-xs text-slate-400 italic">{t("Sign inside the area above")}</span>
                <Button variant="ghost" size="sm" onClick={clearSignature} className="text-slate-500 hover:text-rose-600 h-8 px-2 transition-colors">
                  <Eraser className="w-3.5 h-3.5 mr-1.5" /> {t("Clear")}
                </Button>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsSignatureModalOpen(false)} disabled={isSubmittingFinal}>
                {t("Cancel")}
              </Button>
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 shadow-md"
                onClick={handleConfirmFullSubmit}
                disabled={!isSigned || isSubmittingFinal}
              >
                {isSubmittingFinal ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {t("Submit & Return to List")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}