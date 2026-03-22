"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { ArrowLeft, Calendar, Warehouse, Save, Loader2, ClipboardList, LayoutGrid, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auditService, CreateAuditPlanRequest } from "@/services/audit-service";
import { warehouseApi, WarehouseListItemDto } from "@/services/warehouse-service";
import axiosClient from "@/lib/axios-client"; // Thêm axiosClient để gọi API lấy Bin
import { toast } from "sonner";

// Định nghĩa interface cho Bin
interface BinDto {
  binId: number;
  code: string;
}

export default function CreateAuditPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const [warehouses, setWarehouses] = useState<WarehouseListItemDto[]>([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(true);

  // STATE MỚI: Quản lý danh sách Bin và trạng thái chọn
  const [bins, setBins] = useState<BinDto[]>([]);
  const [isLoadingBins, setIsLoadingBins] = useState(false);
  const [selectAllBins, setSelectAllBins] = useState(false);

  const [formData, setFormData] = useState<CreateAuditPlanRequest>({
    title: "",
    warehouseId: 0, 
    binLocationIds: [], // Khởi tạo mảng rỗng
    plannedStartDate: "",
    plannedEndDate: "",
    notes: ""
  });

  // 1. Fetch Warehouses ban đầu
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const response = await warehouseApi.getAll();
        setWarehouses(response.data);
      } catch (error) {
        toast.error("Không thể tải danh sách kho.");
      } finally {
        setIsLoadingWarehouses(false);
      }
    };
    fetchWarehouses();
  }, []);

// 2. Fetch Bins mỗi khi Warehouse thay đổi
  useEffect(() => {
    const fetchBins = async () => {
      if (formData.warehouseId <= 0) {
        setBins([]);
        setFormData(prev => ({ ...prev, binLocationIds: [] }));
        setSelectAllBins(false);
        return;
      }

      try {
        setIsLoadingBins(true);
        // GỌI VÀO API CỦA ADMIN: Lấy toàn bộ danh sách Bin của hệ thống
        const response = await axiosClient.get(`/admin/master-data/bin-locations`);
        
        // Dữ liệu có thể nằm ở response.data hoặc response.data.items tùy cách BE viết
        const allBins = response.data.items || response.data || [];
        
        // XỬ LÝ LỌC TẠI FRONTEND: Chỉ giữ lại các Bin thuộc về kho đang được chọn
        const filteredBins = allBins.filter((b: any) => b.warehouseId === formData.warehouseId);
        
        setBins(filteredBins);
      } catch (error) {
        console.error("Lỗi fetch Bins:", error);
        toast.error("Không thể tải danh sách vị trí. Có thể tài khoản Kế toán không có quyền gọi API Admin này.");
        setBins([]);
      } finally {
        setIsLoadingBins(false);
        // Reset lựa chọn khi đổi kho
        setFormData(prev => ({ ...prev, binLocationIds: [] }));
        setSelectAllBins(false);
      }
    };

    fetchBins();
  }, [formData.warehouseId]);

  // Logic Xử lý Chọn tất cả Bin
  const handleSelectAll = (checked: boolean) => {
    setSelectAllBins(checked);
    if (checked) {
      setFormData(prev => ({ ...prev, binLocationIds: bins.map(b => b.binId) }));
    } else {
      setFormData(prev => ({ ...prev, binLocationIds: [] }));
    }
  };

  // Logic Xử lý Chọn từng Bin
  const handleSelectBin = (binId: number, checked: boolean) => {
    setFormData(prev => {
      const currentIds = prev.binLocationIds || [];
      const newIds = checked 
        ? [...currentIds, binId] 
        : currentIds.filter(id => id !== binId);
      
      setSelectAllBins(newIds.length === bins.length && bins.length > 0);
      return { ...prev, binLocationIds: newIds };
    });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.warehouseId || !formData.plannedStartDate || !formData.plannedEndDate) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc.");
      return;
    }

    if (!formData.binLocationIds || formData.binLocationIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 vị trí (Bin) để kiểm kê.");
      return;
    }

    try {
      setIsLoading(true);
      await auditService.createPlan(formData);
      toast.success("Tạo kế hoạch kiểm kê thành công!");
      router.push("/accountant/audit");
    } catch (error: any) {
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
            <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:bg-transparent hover:text-indigo-600">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
            </Button>
          </div>

          <Card className="border-slate-200 shadow-sm gap-0 overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 py-5">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                 <ClipboardList className="w-5 h-5 text-indigo-600" /> Audit Configuration
              </CardTitle>
              <CardDescription>Define the scope, location, and timeline for the new inventory audit.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8 bg-slate-50/50">
              
              {/* Section 1: Thông tin chung */}
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
                    <Select onValueChange={(val) => setFormData({...formData, warehouseId: parseInt(val)})} disabled={isLoadingWarehouses}>
                      <SelectTrigger className="bg-slate-50 focus:bg-white">
                        <SelectValue placeholder={isLoadingWarehouses ? "Loading..." : "Select Warehouse"} />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.length > 0 ? (
                          warehouses.map((wh) => (
                            <SelectItem key={wh.warehouseId} value={wh.warehouseId.toString()}>{wh.name}</SelectItem>
                          ))
                        ) : (
                          <SelectItem value="0" disabled>No warehouses found</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* TÍNH NĂNG MỚI: Chọn Bin (Chỉ hiện khi đã chọn kho) */}
              {formData.warehouseId > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-slate-400" /> 2. Specific Bin Locations
                  </h3>
                  <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <p className="font-semibold text-slate-800">Available Bins</p>
                        <p className="text-xs text-slate-500">Select the specific bins to audit, or select all for a full warehouse audit.</p>
                      </div>
                      
                      <Button 
                        variant={selectAllBins ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => handleSelectAll(!selectAllBins)}
                        className={selectAllBins ? "bg-indigo-600 text-white" : ""}
                        disabled={isLoadingBins || bins.length === 0}
                      >
                        <CheckSquare className="w-4 h-4 mr-2" />
                        {selectAllBins ? "Đã chọn toàn kho" : "Quét toàn kho (Select All)"}
                      </Button>
                    </div>

                    {isLoadingBins ? (
                      <div className="flex justify-center items-center py-6 text-indigo-500">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : bins.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-1">
                        {bins.map((bin) => {
                          const isChecked = formData.binLocationIds?.includes(bin.binId);
                          return (
                            <label 
                              key={bin.binId} 
                              className={`flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-colors ${isChecked ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 hover:border-indigo-300 text-slate-700'}`}
                            >
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 accent-indigo-600 cursor-pointer"
                                checked={isChecked}
                                onChange={(e) => handleSelectBin(bin.binId, e.target.checked)}
                              />
                              <span className="font-medium text-sm">{bin.code}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-sm text-slate-500">
                        Kho này hiện chưa có vị trí (Bin) nào.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section 3: Lịch trình */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" /> {formData.warehouseId > 0 ? '3' : '2'}. Schedule
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Planned Start Date <span className="text-red-500">*</span></label>
                    <Input type="date" value={formData.plannedStartDate} onChange={(e) => setFormData({...formData, plannedStartDate: e.target.value})} className="bg-slate-50 focus:bg-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Planned End Date <span className="text-red-500">*</span></label>
                    <Input type="date" value={formData.plannedEndDate} onChange={(e) => setFormData({...formData, plannedEndDate: e.target.value})} className="bg-slate-50 focus:bg-white" />
                  </div>
                </div>
              </div>

            </CardContent>
            
            <CardFooter className="bg-white border-t border-slate-100 p-6 flex justify-end gap-3">
               <Button variant="outline" onClick={() => router.back()} disabled={isLoading}>Cancel</Button>
               <Button onClick={handleSave} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px] shadow-sm">
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