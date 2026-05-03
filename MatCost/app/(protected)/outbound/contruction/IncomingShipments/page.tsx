"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, MapPin, Calendar, Package, Truck, CheckCircle2, Factory, ClipboardList, ListChecks, Check } from "lucide-react";
import { toast } from "sonner";
import { directPurchaseApi } from "@/services/directPurchase-service";
import { issueSlipApi } from '@/services/issueslip-service';
import axiosClient from "@/lib/axios-client";
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/ui/custom/header';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";

export default function IncomingShipments() {
  const { user } = useAuth();
  const router = useRouter();
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && !user.role?.toLowerCase().includes("construction")) {
      toast.error("Bạn không có quyền truy cập vào trang này.");
      router.push("/dashboard");
    }
  }, [user, router]);
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [checkedMaterials, setCheckedMaterials] = useState<Record<string, string[]>>({});

  const parseItemsSummary = (summary: string) => {
    if (!summary) return [];
    return summary.split(', ').map(item => {
      const parts = item.trim().split(' ');
      const quantity = parts[0];
      const name = parts.slice(1).join(' ');
      return { quantity, name, original: item };
    });
  };

  // 1. GỌI API LẤY TOÀN BỘ XE ĐANG GIAO ĐẾN (Hợp nhất cả IS và DPO)
  useEffect(() => {
    const fetchIncomingShipments = async () => {
      try {
        setLoading(true);
        // Tạm thời dùng mock data để bác test UI, sau này nối với API Hợp nhất của C#
        const data = await directPurchaseApi.getIncomingShipments();
        const mappedData = data.map((item: any) => ({
          recordId: item.recordId, 
          code: item.code,         
          type: item.type,
          sourceName: item.sourceName,
          expectedDate: item.expectedDate,
          status: item.status,
          itemsSummary: item.itemsSummary,
          parsedItems: parseItemsSummary(item.itemsSummary),
          extraInfo: item.licensePlate,
          licensePlate: item.type === 'Direct_PO' ? '' : (item.licensePlate?.length < 15 ? item.licensePlate : '')
        }));
        setShipments(mappedData);
      } catch (error) {
        toast.error("Lỗi khi tải danh sách chuyến xe.");
      } finally {
        setLoading(false);
      }
    };
    fetchIncomingShipments();
  }, []);

  const handleToggleMaterial = (shipmentCode: string, materialOriginal: string) => {
    setCheckedMaterials(prev => {
      const current = prev[shipmentCode] || [];
      const exists = current.includes(materialOriginal);
      const updated = exists 
        ? current.filter(m => m !== materialOriginal) 
        : [...current, materialOriginal];
      
      return { ...prev, [shipmentCode]: updated };
    });
  };

  // 2. XỬ LÝ KHI KỸ SƯ BẤM NHẬN HÀNG
  const handleConfirmReceipt = async (shipment: any) => {
    try {
      setProcessingId(shipment.code);
      // Phân luồng gọi API tùy theo loại phiếu (Sẽ code Backend ở bước sau)
      if (shipment.type === 'Issue_Slip') {
        await issueSlipApi.changeStatus(shipment.recordId, { action: 'Completed' ,  "reason": "Done"});
      } else {
        await axiosClient.post(`/DirectPurchase/${shipment.recordId}/confirm-receipt`);
      }

      toast.success(`Đã xác nhận nhận chuyến xe ${shipment.licensePlate || shipment.code} thành công!`);
      
      // Xóa chuyến xe khỏi danh sách chờ
      setShipments(prev => prev.filter(s => s.code !== shipment.code));
    } catch (error) {
      toast.error("Lỗi khi xác nhận nhận hàng!");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredShipments = shipments.filter(s => 
    s.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.licensePlate && s.licensePlate.toLowerCase().includes(searchQuery.toLowerCase())) ||
    s.sourceName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title="Incoming Shipments" />
        
        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-1">
               <h1 className="text-2xl font-bold tracking-tight text-slate-900">Incoming Shipments</h1>
               <p className="text-sm text-slate-500">Manage and confirm incoming shipments and delivery trucks.</p>
            </div>
          </div>

           <Card className="border-slate-200 shadow-sm bg-white flex flex-col gap-0 pb-0">
             <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                  <div className="flex items-center gap-2">
                     <span className="text-sm font-medium text-slate-700">Total:</span>
                     <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">{filteredShipments.length} shipments</Badge>
                  </div>
                  <div className="relative w-full sm:w-72 flex-shrink-0">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input 
                       placeholder="Search by code, license plate or source..." 
                       className="pl-9 bg-white shadow-sm h-9" 
                       value={searchQuery} 
                       onChange={(e) => setSearchQuery(e.target.value)} 
                    />
                  </div>
                </div>
             </CardHeader>
             
             <CardContent className="p-0 flex flex-col">
               <div className="w-full [&>div]:max-h-[calc(100vh-280px)] [&>div]:overflow-y-auto">
                 <Table className="w-full min-w-[900px] table-fixed">
                   <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm outline outline-1 outline-slate-200">
                     <TableRow className="bg-slate-50 hover:bg-slate-50">
                       <TableHead className="pl-6 w-[18%] text-slate-800 font-bold">Shipment Info</TableHead>
                       <TableHead className="w-[18%] text-slate-800 font-bold">Source & License</TableHead>
                       <TableHead className="w-[26%] text-slate-800 font-bold">Contents Checklist</TableHead>
                       <TableHead className="w-[15%] text-slate-800 font-bold">Expected Time</TableHead>
                       <TableHead className="w-[10%] text-center text-slate-800 font-bold">Status</TableHead>
                       <TableHead className="w-[13%] text-right pr-6 text-slate-800 font-bold">Action</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {loading ? (
                        <TableRow><TableCell colSpan={6} className="h-32 text-center"><div className="flex justify-center items-center gap-2 text-indigo-600"><Loader2 className="w-6 h-6 animate-spin" /> Loading shipments...</div></TableCell></TableRow>
                     ) : filteredShipments.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-500 border-b-0"><div className="flex flex-col items-center justify-center gap-2"><Truck className="w-8 h-8 text-slate-300" /><p>No incoming shipments currently.</p></div></TableCell></TableRow>
                     ) : (
                       filteredShipments.map((shipment) => {
                         const isInternal = shipment.type === 'Issue_Slip';
                         const checkedCount = checkedMaterials[shipment.code]?.length || 0;
                         const totalCount = shipment.parsedItems?.length || 0;
                         const isFullyChecked = checkedCount === totalCount && totalCount > 0;

                         return (
                           <React.Fragment key={shipment.code}>
                             <TableRow className="hover:bg-slate-50/50 transition-colors border-b-0">
                               <TableCell className="pl-6">
                                 <div className="flex justify-start">
                                   <Badge variant="outline" className={`mb-1 font-bold ${isInternal ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-indigo-700 bg-indigo-50 border-indigo-200'}`}>
                                     {isInternal ? 'Internal' : 'Supplier'}
                                   </Badge>
                                 </div>
                                 <div className="font-bold text-slate-800 truncate" title={shipment.code}>{shipment.code}</div>
                               </TableCell>
                               <TableCell>
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 truncate" title={shipment.sourceName}>
                                       {isInternal ? <Factory className="w-4 h-4 text-slate-400 shrink-0"/> : <MapPin className="w-4 h-4 text-slate-400 shrink-0"/>}
                                       {shipment.sourceName}
                                    </div>
                                    {shipment.licensePlate && (
                                       <div className="inline-flex items-center gap-1 w-fit bg-yellow-100 text-yellow-800 font-bold px-2 py-0.5 rounded border border-yellow-300 text-xs shadow-sm">
                                          <Truck className="w-3 h-3 shrink-0" /> {shipment.licensePlate}
                                       </div>
                                    )}
                                  </div>
                               </TableCell>
                               <TableCell>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button className={`flex items-center justify-between w-full gap-3 p-2.5 rounded-lg border transition-all ${isFullyChecked ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:shadow-sm'}`}>
                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                          {isFullyChecked ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <ListChecks className="w-4 h-4 shrink-0 text-slate-400" />}
                                          <span className="text-xs font-bold leading-none truncate">
                                            {isFullyChecked ? "Checklist Complete" : `Verify Materials (${checkedCount}/${totalCount})`}
                                          </span>
                                        </div>
                                        <div className={`p-1 rounded ${isFullyChecked ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                                          <Package className={`w-3.5 h-3.5 ${isFullyChecked ? 'text-emerald-700' : 'text-slate-500'}`} />
                                        </div>
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-0 shadow-xl border-slate-200 overflow-hidden rounded-xl" align="start">
                                      <div className="p-3 bg-slate-50 border-b border-slate-100">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                          <ClipboardList className="w-3.5 h-3.5 text-indigo-500" /> Shipment Contents
                                        </h4>
                                      </div>
                                      <div className="max-h-64 overflow-y-auto p-2">
                                        <div className="space-y-1">
                                          {shipment.parsedItems.map((item: any, idx: number) => {
                                            const isChecked = checkedMaterials[shipment.code]?.includes(item.original);
                                            return (
                                              <div 
                                                key={idx} 
                                                className={`flex items-center space-x-3 p-2.5 rounded-lg transition-colors cursor-pointer group ${isChecked ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}
                                                onClick={() => handleToggleMaterial(shipment.code, item.original)}
                                              >
                                                <Checkbox 
                                                  id={`item-${shipment.code}-${idx}`} 
                                                  checked={isChecked}
                                                  className={`data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 transition-colors shadow-none`}
                                                />
                                                <div className="flex-grow flex flex-col min-w-0">
                                                  <span className={`text-sm font-medium leading-none truncate ${isChecked ? 'text-emerald-900 line-through opacity-70' : 'text-slate-700'}`}>
                                                    {item.name}
                                                  </span>
                                                  <span className="text-[10px] text-slate-400 font-bold mt-1 uppercase">QTY: {item.quantity}</span>
                                                </div>
                                                {isChecked && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                      {isFullyChecked && (
                                        <div className="p-3 bg-emerald-50 border-t border-emerald-100 flex items-center justify-center gap-2">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Ready for confirmation</span>
                                        </div>
                                      )}
                                    </PopoverContent>
                                  </Popover>
                               </TableCell>
                               <TableCell>
                                 <span className="text-sm text-slate-500 flex items-center gap-1.5 font-medium">
                                   <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                                   {shipment.expectedDate ? new Date(shipment.expectedDate).toLocaleString('vi-VN', {hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit'}) : 'Unscheduled'}
                                 </span>
                               </TableCell>
                               <TableCell className="text-center">
                                 <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1.5 border-none font-bold text-[10px] uppercase tracking-tight py-1 px-2.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> {shipment.status}
                                 </Badge>
                               </TableCell>
                               <TableCell className="text-right pr-6">
                                 <Button 
                                    size="sm" 
                                    className={`font-bold shadow-sm transition-all h-9 px-4 ${isFullyChecked ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer' : 'bg-slate-100 text-slate-400 cursor-not-allowed hover:bg-slate-100'}`}
                                    onClick={() => handleConfirmReceipt(shipment)}
                                    disabled={processingId === shipment.code || !isFullyChecked}
                                  >
                                    {processingId === shipment.code ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Confirm Receipt
                                      </>
                                    )}
                                  </Button>
                               </TableCell>
                             </TableRow>
                             {shipment.extraInfo && (
                               <TableRow className="bg-white hover:bg-slate-50/50 border-t-0">
                                 <TableCell colSpan={6} className="pl-6 pr-6 pb-4 pt-0">
                                   <div className="flex items-start gap-2.5 text-[11px] bg-amber-50/70 text-amber-900 px-4 py-3 rounded-xl border border-amber-100 w-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                                     {isInternal ? <ClipboardList className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" /> : <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                                     <div className="flex-1 min-w-0 font-medium leading-relaxed whitespace-normal break-words">
                                       <span className="font-bold uppercase text-[9px] mr-2 text-amber-600/70 shrink-0 tracking-wider font-sans">{isInternal ? "Ghi chú hệ thống:" : "Địa chỉ giao hàng:"}</span>
                                       {shipment.extraInfo}
                                     </div>
                                   </div>
                                 </TableCell>
                               </TableRow>
                             )}
                           </React.Fragment>
                         );
                       })
                     )}
                   </TableBody>
                 </Table>
               </div>
             </CardContent>
           </Card>
        </div>
      </main>
    </div>
  );
}