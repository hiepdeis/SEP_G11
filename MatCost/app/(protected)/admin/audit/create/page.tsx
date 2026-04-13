"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { ArrowLeft, Calendar as CalendarIcon, Warehouse, Save, Loader2, ClipboardList, LayoutGrid, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auditService, CreateAuditPlanRequest } from "@/services/audit-service";
import { warehouseApi, WarehouseListItemDto } from "@/services/warehouse-service";
import axiosClient from "@/lib/axios-client";
import { toast } from "sonner";
import { startOfDay } from "date-fns";
import { useTranslation } from "react-i18next";
import { DateTimePicker } from "@/components/ui/custom/date-time-picker";

interface BinDto { binId: number; code: string; }

export default function AdminCreateAuditPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseListItemDto[]>([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(true);
  const [bins, setBins] = useState<BinDto[]>([]);
  const [isLoadingBins, setIsLoadingBins] = useState(false);
  const [selectAllBins, setSelectAllBins] = useState(false);

  const [formData, setFormData] = useState<CreateAuditPlanRequest>({
    title: "", warehouseId: 0, binLocationIds: [], plannedStartDate: "", plannedEndDate: "", notes: ""
  });

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const response = await warehouseApi.getAll();
        setWarehouses(response.data);
      } catch (error) { toast.error(t("Cannot load warehouse list.")); } finally { setIsLoadingWarehouses(false); }
    };
    fetchWarehouses();
  }, [t]);

  useEffect(() => {
    const fetchBins = async () => {
      if (formData.warehouseId <= 0) {
        setBins([]); setFormData(prev => ({ ...prev, binLocationIds: [] })); setSelectAllBins(false); return;
      }
      try {
        setIsLoadingBins(true);
        const response = await axiosClient.get(`/admin/master-data/bin-locations`);
        const allBins = response.data.items || response.data || [];
        const filteredBins = allBins.filter((b: any) => b.warehouseId === formData.warehouseId);
        setBins(filteredBins);
      } catch (error) {
        toast.error(t("Cannot load bin list."));
        setBins([]);
      } finally { setIsLoadingBins(false); setFormData(prev => ({ ...prev, binLocationIds: [] })); setSelectAllBins(false); }
    };
    fetchBins();
  }, [formData.warehouseId, t]);

  const handleSelectAll = (checked: boolean) => {
    setSelectAllBins(checked);
    if (checked) setFormData(prev => ({ ...prev, binLocationIds: bins.map(b => b.binId) }));
    else setFormData(prev => ({ ...prev, binLocationIds: [] }));
  };

  const handleSelectBin = (binId: number, checked: boolean) => {
    setFormData(prev => {
      const currentIds = prev.binLocationIds || [];
      const newIds = checked ? [...currentIds, binId] : currentIds.filter(id => id !== binId);
      setSelectAllBins(newIds.length === bins.length && bins.length > 0);
      return { ...prev, binLocationIds: newIds };
    });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.warehouseId || !formData.plannedStartDate || !formData.plannedEndDate) return toast.error(t("Please fill in all required fields."));
    if (!formData.binLocationIds || formData.binLocationIds.length === 0) return toast.error(t("Please select at least 1 Bin to audit."));

    const now = new Date();
    const startDate = new Date(formData.plannedStartDate);
    const endDate = new Date(formData.plannedEndDate);

    if (startDate < now) return toast.error(t("Planned start date must be in the future."));
    if (endDate <= startDate) return toast.error(t("End date must be after start date."));

    try {
      setIsLoading(true);
      await auditService.createPlan(formData);
      toast.success(t("Audit plan created successfully!"));
      router.push("/admin/audit");
    } catch (error: any) { toast.error(error.response?.data?.message || t("Error creating Audit Plan.")); } finally { setIsLoading(false); }
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("Create Audit Plan")} (ADMIN)`} />
        <div className="flex-1 overflow-y-auto w-full">
          <div className="p-6 lg:p-10 space-y-6 max-w-4xl mx-auto w-full pb-20">
            <div className="flex items-center justify-between"><Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:bg-transparent hover:text-indigo-600"><ArrowLeft className="w-4 h-4 mr-2" /> {t("Back to List")}</Button></div>
            <Card className="border-slate-200 shadow-sm gap-0 overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-100 py-5">
                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800"><ClipboardList className="w-5 h-5 text-indigo-600" /> {t("Audit Configuration")}</CardTitle>
                <CardDescription>{t("Define the scope, location, and timeline for the new inventory audit.")}</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-8 bg-slate-50/50">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2"><Warehouse className="w-4 h-4 text-slate-400" /> 1. {t("Scope & Location")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                    <div className="space-y-2"><label className="text-sm font-medium text-slate-700">{t("Audit Title *")}</label><Input placeholder={t("e.g. Q1 2026 Opening Stock")} value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="bg-slate-50 focus:bg-white"/></div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">{t("Target Warehouse *")}</label>
                      <Select value={formData.warehouseId.toString()} onValueChange={(val) => setFormData({...formData, warehouseId: parseInt(val)})} disabled={isLoadingWarehouses}>
                        <SelectTrigger className="w-full bg-slate-50 focus:bg-white"><SelectValue placeholder={isLoadingWarehouses ? t("Loading...") : t("Select warehouse...")} /></SelectTrigger>
                        <SelectContent showSearch className="w-full">
                          {warehouses.length > 0 ? (warehouses.map((wh) => (<SelectItem key={wh.warehouseId} value={wh.warehouseId.toString()}>{wh.name}</SelectItem>))) : (<SelectItem value="0" disabled>{t("No warehouses found")}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {formData.warehouseId > 0 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-slate-400" /> 2. {t("Specific Bin Locations")}</h3>
                    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div><p className="font-semibold text-slate-800">{t("Available Bins")}</p><p className="text-xs text-slate-500">{t("Select the specific bins to audit, or select all for a full warehouse audit.")}</p></div>
                        <Button variant={selectAllBins ? "default" : "outline"} size="sm" onClick={() => handleSelectAll(!selectAllBins)} className={`w-[210px] transition-colors ${selectAllBins ? "bg-indigo-600 text-white border-indigo-600" : "text-slate-700"}`} disabled={isLoadingBins || bins.length === 0}><CheckSquare className="w-4 h-4 flex-shrink-0" /><span className="truncate">{selectAllBins ? t("All Bins Selected") : t("Select All Bins")}</span></Button>
                      </div>
                      {isLoadingBins ? (<div className="flex justify-center items-center py-6 text-indigo-500"><Loader2 className="w-6 h-6 animate-spin" /></div>) : bins.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-1 pr-2">
                          {bins.map((bin) => {
                            const isChecked = formData.binLocationIds?.includes(bin.binId);
                            return (<label key={bin.binId} className={`flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-colors ${isChecked ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 hover:border-indigo-300 text-slate-700'}`}><input type="checkbox" className="w-4 h-4 accent-indigo-600 cursor-pointer" checked={isChecked} onChange={(e) => handleSelectBin(bin.binId, e.target.checked)} /><span className="font-medium text-sm">{bin.code}</span></label>);
                          })}
                        </div>
                      ) : (<div className="text-center py-6 text-sm text-slate-500">{t("No bins available in this warehouse.")}</div>)}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2"><CalendarDays className="w-4 h-4 text-slate-400" /> {formData.warehouseId > 0 ? '3' : '2'}. {t("Schedule")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                    <div className="space-y-2 flex flex-col">
                      <label className="text-sm font-medium text-slate-700">{t("Planned Start Date *")}</label>
                      <DateTimePicker 
                        value={formData.plannedStartDate ? new Date(formData.plannedStartDate) : undefined} 
                        onChange={(date) => setFormData({...formData, plannedStartDate: date ? date.toISOString() : ""})} 
                        disablePastDates 
                      />
                    </div>
                    <div className="space-y-2 flex flex-col">
                      <label className="text-sm font-medium text-slate-700">{t("Planned End Date *")}</label>
                      <DateTimePicker 
                        value={formData.plannedEndDate ? new Date(formData.plannedEndDate) : undefined} 
                        onChange={(date) => setFormData({...formData, plannedEndDate: date ? date.toISOString() : ""})} 
                        minDate={formData.plannedStartDate ? new Date(formData.plannedStartDate) : undefined} 
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-white border-t border-slate-100 p-6 flex justify-end gap-3"><Button variant="outline" onClick={() => router.back()} disabled={isLoading}>{t("Cancel")}</Button><Button onClick={handleSave} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px] shadow-sm">{isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4" />} {t("Save & Close")}</Button></CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
