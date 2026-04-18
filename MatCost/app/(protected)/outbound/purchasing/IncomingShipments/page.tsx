"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, MapPin, Calendar, Package, Truck, CheckCircle2, Factory, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { directPurchaseApi } from "@/services/directPurchase-service";
import { issueSlipApi } from '@/services/issueslip-service';
import axiosClient from "@/lib/axios-client";
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/ui/custom/header';

export default function IncomingShipments() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

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
          licensePlate: item.licensePlate
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

  // 2. XỬ LÝ KHI KỸ SƯ BẤM NHẬN HÀNG
  const handleConfirmReceipt = async (shipment: any) => {
    try {
      setProcessingId(shipment.code);
      // Phân luồng gọi API tùy theo loại phiếu (Sẽ code Backend ở bước sau)
      if (shipment.type === 'Issue_Slip') {
        await issueSlipApi.changeStatus(shipment.recordId, { action: 'Completed' });
      } else {
        await axiosClient.post(`/DirectPurchase/${shipment.recordId}/confirm-receipt`);
      }

      toast.success(`Đã xác nhận nhận chuyến xe ${shipment.licensePlate || shipment.code} thành công!`);
      
      // Xóa chuyến xe khỏi danh sách chờ
      setShipments(prev => prev.filter(s => (s.recordId || s.id) !== shipment.recordId));
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
                       <TableHead className="pl-6 w-[20%] text-slate-800 font-bold">Shipment Info</TableHead>
                       <TableHead className="w-[20%] text-slate-800 font-bold">Source & License</TableHead>
                       <TableHead className="w-[22%] text-slate-800 font-bold">Contents</TableHead>
                       <TableHead className="w-[15%] text-slate-800 font-bold">Expected Time</TableHead>
                       <TableHead className="w-[8%] text-center text-slate-800 font-bold">Status</TableHead>
                       <TableHead className="w-[15%] text-right pr-6 text-slate-800 font-bold">Action</TableHead>
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
                         return (
                           <TableRow key={shipment.code} className="hover:bg-slate-50/50 transition-colors">
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
                                        <Truck className="w-3 h-3" /> {shipment.licensePlate}
                                     </div>
                                  )}
                                </div>
                             </TableCell>
                             <TableCell>
                                <div className="flex items-start gap-2 text-slate-600 bg-slate-50 p-2 rounded-md border border-slate-100 max-h-[60px] overflow-hidden">
                                  <Package className="w-4 h-4 text-slate-400 mt-0.5 shrink-0"/>
                                  <span className="text-xs line-clamp-2" title={shipment.itemsSummary}>{shipment.itemsSummary}</span>
                                </div>
                             </TableCell>
                             <TableCell>
                               <span className="text-sm text-slate-500 flex items-center gap-1.5">
                                 <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                                 {shipment.expectedDate ? new Date(shipment.expectedDate).toLocaleString('vi-VN', {hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit'}) : 'Unscheduled'}
                               </span>
                             </TableCell>
                             <TableCell className="text-center">
                               <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1 border-none font-medium whitespace-nowrap">
                                  <Truck className="w-3 h-3" /> {shipment.status}
                               </Badge>
                             </TableCell>
                             <TableCell className="text-right pr-6">
                               <Button 
                                  size="sm" 
                                  className="font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
                                  onClick={() => handleConfirmReceipt(shipment)}
                                  disabled={processingId === shipment.code}
                                >
                                  {processingId === shipment.code ? (
                                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                  )}
                                  Confirm Receipt
                                </Button>
                             </TableCell>
                           </TableRow>
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