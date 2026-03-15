"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { ArrowLeft, Calendar, Warehouse, Save, Loader2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auditService, CreateAuditPlanRequest } from "@/services/audit-service";
import { warehouseApi, WarehouseListItemDto } from "@/services/warehouse-service";
import { toast } from "sonner";

export default function CreateAuditPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const [warehouses, setWarehouses] = useState<WarehouseListItemDto[]>([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(true);

  const [formData, setFormData] = useState<CreateAuditPlanRequest>({
    title: "",
    warehouseId: 0, 
    plannedStartDate: "",
    plannedEndDate: "",
    notes: ""
  });

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const response = await warehouseApi.getAll();
        setWarehouses(response.data);
      } catch (error) {
        console.error("Failed to load warehouses", error);
        toast.error("Không thể tải danh sách kho.");
      } finally {
        setIsLoadingWarehouses(false);
      }
    };
    fetchWarehouses();
  }, []);

  const handleSave = async () => {
    if (!formData.title || !formData.warehouseId || !formData.plannedStartDate || !formData.plannedEndDate) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc.");
      return;
    }

    try {
      setIsLoading(true);
      await auditService.createPlan(formData);
      toast.success("Tạo kế hoạch kiểm kê thành công!");
      router.push("/accountant/audit");
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Lỗi khi tạo Audit Plan.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title="Create Audit Plan" />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="pl-0 hover:bg-transparent hover:text-indigo-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
            </Button>
          </div>

          <Card className="border-slate-200 shadow-sm gap-0 overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 py-5">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                 <ClipboardList className="w-5 h-5 text-indigo-600" /> Audit Configuration
              </CardTitle>
              <CardDescription>
                Define the scope, location, and timeline for the new inventory audit.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8 bg-slate-50/50">
              {/* Section 1 */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-slate-400" /> 1. Scope & Location
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Audit Title <span className="text-red-500">*</span></label>
                    <Input 
                        placeholder="e.g. Q1 2026 Opening Stock" 
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Target Warehouse <span className="text-red-500">*</span></label>
                    <Select 
                      onValueChange={(val) => setFormData({...formData, warehouseId: parseInt(val)})}
                      disabled={isLoadingWarehouses}
                    >
                      <SelectTrigger className="bg-slate-50 focus:bg-white">
                        <SelectValue placeholder={isLoadingWarehouses ? "Loading..." : "Select Warehouse"} />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.length > 0 ? (
                          warehouses.map((wh) => (
                            <SelectItem key={wh.warehouseId} value={wh.warehouseId.toString()}>
                              {wh.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="0" disabled>No warehouses found</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section 2 */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" /> 2. Schedule
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Planned Start Date <span className="text-red-500">*</span></label>
                    <Input 
                        type="date" 
                        value={formData.plannedStartDate}
                        onChange={(e) => setFormData({...formData, plannedStartDate: e.target.value})}
                        className="bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Planned End Date <span className="text-red-500">*</span></label>
                    <Input 
                        type="date" 
                        value={formData.plannedEndDate}
                        onChange={(e) => setFormData({...formData, plannedEndDate: e.target.value})}
                        className="bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="bg-white border-t border-slate-100 p-6 flex justify-end gap-3">
               <Button variant="outline" onClick={() => router.back()} disabled={isLoading}>Cancel</Button>
               <Button 
                 onClick={handleSave}
                 disabled={isLoading}
                 className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px] shadow-sm"
               >
                 {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                 Save & Close
               </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}