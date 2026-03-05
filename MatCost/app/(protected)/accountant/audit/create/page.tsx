"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { ArrowLeft, Calendar, Warehouse, Save, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { auditService, CreateAuditPlanRequest } from "@/services/audit-service";
import { warehouseApi, WarehouseListItemDto } from "@/services/warehouse-service";

export default function CreateAuditPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // 2. State để lưu danh sách kho lấy từ API
  const [warehouses, setWarehouses] = useState<WarehouseListItemDto[]>([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(true);

  const [formData, setFormData] = useState<CreateAuditPlanRequest>({
    title: "",
    warehouseId: 0, 
    plannedStartDate: "",
    plannedEndDate: "",
    notes: ""
  });

  // 3. useEffect gọi API khi vào trang
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const response = await warehouseApi.getAll();
        setWarehouses(response.data);
      } catch (error) {
        console.error("Failed to load warehouses", error);
        alert("Không thể tải danh sách kho. Hãy kiểm tra kết nối Server.");
      } finally {
        setIsLoadingWarehouses(false);
      }
    };

    fetchWarehouses();
  }, []);

  const handleSave = async () => {
    if (!formData.title || !formData.warehouseId || !formData.plannedStartDate || !formData.plannedEndDate) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      setIsLoading(true);
      await auditService.createPlan(formData);
      alert("Audit Plan created successfully!");
      router.push("/accountant/audit");
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to create audit plan.");
    } finally {
      setIsLoading(false);
    }
  };

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
                  <h2 className="text-lg font-semibold text-slate-900">Create New Audit Plan</h2>
                </div>
                <UserDropdown align="end" trigger={<Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"><User className="h-5 w-5" /></Button>} />
             </div>
        </header>

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 flex justify-center">
          <Card className="w-full max-w-3xl shadow-lg border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle>Audit Configuration</CardTitle>
              <CardDescription>Define scope, location and timeline for the new audit.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-indigo-600" /> 1. Scope & Location
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Audit ID</label>
                    <Input 
                        placeholder="Enter audit ID..." 
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Warehouse</label>
                    
                    {/* 4. Select Box Động */}
                    <Select 
                      onValueChange={(val) => setFormData({...formData, warehouseId: parseInt(val)})}
                      disabled={isLoadingWarehouses}
                    >
                      <SelectTrigger>
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

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" /> 2. Schedule
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Planned Start Date</label>
                    <Input 
                        type="date" 
                        value={formData.plannedStartDate}
                        onChange={(e) => setFormData({...formData, plannedStartDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Planned End Date</label>
                    <Input 
                        type="date" 
                        value={formData.plannedEndDate}
                        onChange={(e) => setFormData({...formData, plannedEndDate: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => router.back()} disabled={isLoading}>Cancel</Button>
                <Button 
                  onClick={handleSave}
                  disabled={isLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px]"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save & Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}