"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, MapPin, Calendar, Package, Truck, CheckCircle2, Factory } from "lucide-react";
import { toast } from "sonner";
import { directPurchaseApi } from "@/services/directPurchase-service";
import { issueSlipApi } from '@/services/issueslip-service';
import axiosClient from "@/lib/axios-client";
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

      toast.success(`Đã xác nhận nhận chuyến xe ${shipment.licensePlate} thành công!`);
      
      // Xóa chuyến xe khỏi danh sách chờ
      setShipments(prev => prev.filter(s => (s.recordId || s.id) !== targetId));
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

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500"/></div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      
      {/* HEADER & THANH TÌM KIẾM */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-4 z-10">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
          <Truck className="w-6 h-6 text-indigo-600" /> Hàng Chờ Nhận Tại Cổng
        </h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input 
            className="pl-10 h-12 text-lg bg-slate-50 border-slate-300 focus-visible:ring-indigo-500 rounded-lg"
            placeholder="Nhập biển số xe (VD: 29C) hoặc tên NCC..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* DANH SÁCH CHUYẾN XE */}
      <div className="space-y-4 pb-20">
        {filteredShipments.length === 0 ? (
          <div className="text-center p-10 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
            Không có chuyến xe nào đang chờ.
          </div>
        ) : (
          filteredShipments.map((shipment) => {
            const isInternal = shipment.type === 'Issue_Slip';

            return (
              <Card key={shipment.code} className={`border-l-4 shadow-sm ${isInternal ? 'border-l-emerald-500' : 'border-l-indigo-500'}`}>
                <CardHeader className="p-4 pb-2 flex flex-row justify-between items-start bg-slate-50/50">
                  <div>
                    <Badge variant="outline" className={`mb-2 font-bold ${isInternal ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-indigo-700 bg-indigo-50 border-indigo-200'}`}>
                      {isInternal ? 'Xuất từ Kho' : 'Mua Mới (NCC)'}
                    </Badge>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">{shipment.code}</h3>
                  </div>
                  {shipment.licensePlate && (
                    <div className="bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded border border-yellow-500 text-lg shadow-sm">
                      {shipment.licensePlate}
                    </div>
                  )}
                </CardHeader>
                
                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 text-base font-medium">
                    {isInternal ? <Factory className="w-5 h-5 text-slate-400"/> : <MapPin className="w-5 h-5 text-slate-400"/>}
                    {shipment.sourceName}
                  </div>
                  
                  <div className="flex items-start gap-2 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <Package className="w-5 h-5 text-slate-400 mt-0.5 shrink-0"/>
                    <span className="line-clamp-2">{shipment.itemsSummary}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm text-slate-500 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" /> 
                      {shipment.expectedDate ? new Date(shipment.expectedDate).toLocaleString('vi-VN', {hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit'}) : 'Chưa có lịch'}
                    </div>
                    <span className="text-amber-600 font-medium flex items-center gap-1">
                      <Truck className="w-4 h-4"/> {shipment.status}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="p-4 pt-0">
                  <Button 
                    size="lg" 
                    className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-transform active:scale-[0.98]"
                    onClick={() => handleConfirmReceipt(shipment)}
                    disabled={processingId === shipment.code}
                  >
                    {processingId === shipment.code ? (
                      <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6 mr-2" />
                    )}
                    XÁC NHẬN ĐỦ HÀNG
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}