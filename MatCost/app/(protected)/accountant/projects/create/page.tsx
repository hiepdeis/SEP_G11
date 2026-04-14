"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { ArrowLeft, Save, Loader2, Briefcase, CalendarDays, ClipboardList, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { projectService, SaveProjectRequest } from "@/services/project-service";

export default function CreateProjectPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState<SaveProjectRequest>({
    code: "",
    name: "",
    startDate: "",
    endDate: "",
    budget: undefined,
    status: "Pending"
  });

  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.name.trim() || !formData.startDate || !formData.endDate) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc.");
      return;
    }

    const validationTomorrow = new Date();
    validationTomorrow.setDate(validationTomorrow.getDate() + 1);
    validationTomorrow.setHours(0, 0, 0, 0);
    
    const startDate = new Date(formData.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(formData.endDate);
    endDate.setHours(0, 0, 0, 0);

    if (startDate < validationTomorrow) {
      toast.error("Dự án phải bắt đầu sớm nhất từ ngày mai.");
      return;
    }

    if (endDate <= startDate) {
      toast.error("Ngày kết thúc phải diễn ra sau ngày bắt đầu.");
      return;
    }

    try {
      setIsLoading(true);
      await projectService.save(formData);
      toast.success("Tạo dự án thành công!");
      router.push("/accountant/projects");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi tạo dự án.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-row h-screen w-screen bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col relative z-10 overflow-hidden">
        <Header title="Tạo Dự Án Mới" />
        <div className="flex-1 overflow-y-auto w-full">
          <div className="p-6 lg:p-10 space-y-6 max-w-4xl mx-auto w-full pb-20">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:bg-transparent hover:text-indigo-600">
                <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại danh sách
              </Button>
            </div>

            <Card className="border-slate-200 shadow-sm gap-0 overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-100 py-5">
                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                  <ClipboardList className="w-5 h-5 text-indigo-600" /> Thông tin thiết lập dự án
                </CardTitle>
                <CardDescription>Cung cấp mã dự án, tên và ngân sách để tạo hồ sơ quản lý mới.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-8 bg-slate-50/50">
                
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-slate-400" /> 1. Thông tin chung
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Mã Dự án (Code) <span className="text-red-500">*</span></label>
                      <Input placeholder="VD: PRJ-2026" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="bg-slate-50 focus:bg-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Tên Dự án <span className="text-red-500">*</span></label>
                      <Input placeholder="VD: Xây dựng tòa nhà A" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-slate-50 focus:bg-white" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium text-slate-700">Ngân sách dự kiến (VNĐ)</label>
                      <Input type="number" placeholder="VD: 5000000000" value={formData.budget || ''} onChange={e => setFormData({...formData, budget: parseFloat(e.target.value) || undefined})} className="bg-slate-50 focus:bg-white" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-slate-400" /> 2. Kế hoạch thời gian
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                    <div className="space-y-2 flex flex-col">
                      <label className="text-sm font-medium text-slate-700">Ngày bắt đầu <span className="text-red-500">*</span></label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10 bg-slate-50 border-slate-200", !formData.startDate && "text-slate-500")}>
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {formData.startDate ? format(new Date(formData.startDate), "dd/MM/yyyy") : <span>Chọn ngày...</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar 
                            mode="single" 
                            selected={formData.startDate ? new Date(formData.startDate) : undefined} 
                            onSelect={(date) => {
                              setFormData({...formData, startDate: date ? format(date, "yyyy-MM-dd") : ""});
                              if (date && formData.endDate && date >= new Date(formData.endDate)) {
                                setFormData(prev => ({...prev, endDate: ""}));
                              }
                            }} 
                            initialFocus 
                            disabled={(date) => date < tomorrow} 
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2 flex flex-col">
                      <label className="text-sm font-medium text-slate-700">Ngày kết thúc <span className="text-red-500">*</span></label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10 bg-slate-50 border-slate-200", !formData.endDate && "text-slate-500")}>
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {formData.endDate ? format(new Date(formData.endDate), "dd/MM/yyyy") : <span>Chọn ngày...</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar 
                            mode="single" 
                            selected={formData.endDate ? new Date(formData.endDate) : undefined} 
                            onSelect={(date) => setFormData({...formData, endDate: date ? format(date, "yyyy-MM-dd") : ""})} 
                            initialFocus 
                            disabled={(date) => formData.startDate ? date <= new Date(formData.startDate) : date <= tomorrow} 
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

              </CardContent>
              <CardFooter className="bg-white border-t border-slate-100 p-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => router.back()} disabled={isLoading}>Hủy bỏ</Button>
                <Button onClick={handleSave} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px] shadow-sm">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Lưu & Đóng
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}