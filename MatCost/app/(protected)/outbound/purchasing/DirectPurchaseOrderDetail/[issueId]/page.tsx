"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation'; // Hoặc react-router-dom tùy stack của bạn
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Building2, Calendar, MapPin, DollarSign, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import axiosClient from "@/lib/axios-client"; // Đổi theo config axios của bạn
import { directPurchaseApi } from '@/services/directPurchase-service';
import { supplierApi } from '@/services/supplier-service';

import { useTranslation } from "react-i18next"; 



export default function DirectPurchaseOrderDetail() {
  const params = useParams();
  const issueId = Array.isArray(params.issueId) ? params.issueId[0] : params.issueId;
 const { t } = useTranslation();
  const [dpoDetail, setDpoDetail] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // States cho Form chốt đơn
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  
  // State quản lý đơn giá (Lưu theo DpoDetailId) để nhập liệu realtime
  const [editedPrices, setEditedPrices] = useState<Record<number, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
      //  setLoading(true);
        console.log("1. Bắt đầu gọi API Suppliers...");
        const supRes = await supplierApi.getSuppliers();
        setSuppliers(supRes);
        console.log("-> Đã lấy xong Suppliers:", supRes);

        console.log("2. Bắt đầu gọi API DPO detail với issueId =", issueId);
        // THỬ DÙNG TRỰC TIẾP AXIOS NHƯ THẾ NÀY TRƯỚC ĐỂ LOẠI TRỪ LỖI CỦA AXIOS SERVICE
        const dpoRes = await directPurchaseApi.getDirectPurchaseById(Number(issueId));
        console.log("-> API DPO detail trả về:", dpoRes); // In thẳng response ra console để xem cấu trúc
        const data = dpoRes;
        console.log("-> Đã lấy xong DPO Detail:", data);

        setDpoDetail(data);

        if (data.supplierId) setSelectedSupplierId(data.supplierId.toString());
       // setDeliveryAddress(data.deliveryAddress || "Công trường dự án"); 
        
        const initialPrices: Record<number, number> = {};
        data.details.forEach((item: any) => {
          initialPrices[item.dpoDetailId] = item.negotiatedUnitPrice;
        });
        setEditedPrices(initialPrices);

      } catch (error: any) {
        console.error("LỖI RỒI NHÉ:", error); // In thẳng lỗi ra console
        toast.error(error.response?.data?.message || error.message || "Lỗi khi tải dữ liệu đơn mua hàng.");
      } finally {
        setLoading(false);
      }
    };

    if (issueId) fetchData();
    else setLoading(false);
  }, [issueId]);

  // Tính lại tổng tiền realtime khi gõ giá mới
  const calculateTotal = () => {
    if (!dpoDetail) return 0;
    return dpoDetail.details.reduce((sum: number, item: any) => {
      const currentPrice = editedPrices[item.dpoDetailId] || 0;
      return sum + (item.quantity * currentPrice);
    }, 0);
  };

  // 2. XỬ LÝ CHỐT ĐƠN
  const handleConfirmOrder = async () => {
    if (!selectedSupplierId) return toast.error("Vui lòng chọn Nhà cung cấp!");

    try {
      setSubmitting(true);
      
      // Build Payload khớp 100% với DTO ConfirmDpoRequest ở Backend
      const payload = {
        supplierId: Number(selectedSupplierId),
        expectedDeliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : null,
        deliveryAddress: deliveryAddress,
        items: dpoDetail.details.map((item: any) => ({
          dpoDetailId: item.dpoDetailId,
          negotiatedUnitPrice: Number(editedPrices[item.dpoDetailId] || 0)
        }))
      };

      // 🚨 QUAN TRỌNG: Gọi Submit bằng DPO_ID thật sự, không dùng issueId
      await axiosClient.post(`/DirectPurchaseOrder/${dpoDetail.dpoId}/confirm-order`, payload);
      
      toast.success("Tuyệt vời! Đã chốt đơn và chuyển lệnh Giao hàng.");
      
      // Load lại trang hoặc back về list
      const dpoRes = await directPurchaseApi.getDirectPurchaseById(Number(issueId));
      setDpoDetail(dpoRes);
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi chốt đơn.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500"/></div>;
  if (!dpoDetail) return <div className="p-10 text-center text-slate-500">{t("Order not found")}</div>;

  // Nếu phiếu đã qua bước chốt đơn thì khóa không cho sửa nữa
  const isReadOnly = dpoDetail.status !== "Pending_Supplier_Selection" && dpoDetail.status !== "Draft_DPO";
  const currentTotal = calculateTotal();

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4">
      {/* HEADER TỔNG QUAN */}
      <div className="flex justify-between items-center bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-indigo-600" /> {t("Direct Purchase Order Processing")}
          </h1>
          <div className="text-sm text-slate-500 mt-1 flex items-center gap-3">
            <span>{t("Reference Code")}: <strong className="text-slate-700">{dpoDetail.referenceCode}</strong></span>
            <span>•</span>
            <span>{t("Purchase Code")}: <strong className="text-indigo-700">{dpoDetail.dpoCode}</strong></span>
          </div>
        </div>
        <Badge className={`text-sm py-1.5 px-3 border-none ${isReadOnly ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
          {dpoDetail.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CỘT TRÁI: THÔNG TIN ĐẶT HÀNG & CHỐT ĐƠN */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                <Building2 className="w-5 h-5 text-indigo-500"/> {t("Information Input")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">{t("Supplier")} <span className="text-red-500">*</span></label>
                <Select disabled={isReadOnly} value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder={t("Please select supplier!")} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.supplierId} value={s.supplierId.toString()}>
                        {s.code} - {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400"/> {t("Expected Delivery Date")}
                </label>
                <Input 
                  type="date" 
                  disabled={isReadOnly}
                  className="bg-white"
                  value={deliveryDate} 
                  onChange={(e) => setDeliveryDate(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400"/> {t("Delivery Address")}
                </label>
                <Input 
                  disabled={isReadOnly}
                  className="bg-white"
                  value={deliveryAddress} 
                  onChange={(e) => setDeliveryAddress(e.target.value)} 
                  placeholder={t("Please enter the delivery address...")}
                />
              </div>
            </CardContent>
          </Card>

          {/* CARD HIỂN THỊ TỔNG TIỀN */}
          <Card className="shadow-sm border-indigo-200 bg-indigo-50/50">
            <CardContent className="p-6">
              <div className="text-sm text-indigo-600 font-semibold mb-1 uppercase tracking-wider">{t("Total Order Value")}</div>
              <div className="text-3xl font-bold text-indigo-900 flex items-center gap-2">
                {currentTotal.toLocaleString()} <span className="text-base text-indigo-600 font-medium">VNĐ</span>
              </div>
              
              {!isReadOnly && (
                <Button 
                  onClick={handleConfirmOrder} 
                  disabled={submitting}
                  className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-base shadow-md transition-all"
                >
                  {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin"/> : <CheckCircle2 className="w-5 h-5 mr-2"/>}
                  {t("Confirm Order")}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* CỘT PHẢI: BẢNG VẬT TƯ & ÉP GIÁ */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm border-slate-200 h-full flex flex-col">
            <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                <DollarSign className="w-5 h-5 text-emerald-500"/> {t("Material Details & Price Negotiation")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="w-[50px] text-center pl-4">STT</TableHead>
                    <TableHead>{t("Material Code / Name")}</TableHead>
                    <TableHead className="text-right">{t("Quantity Needed")}</TableHead>
                    <TableHead className="text-right w-[180px]">{t("Actual Unit Price (VND)")}</TableHead>
                    <TableHead className="text-right pr-4">{t("Line Total (VND)")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dpoDetail.details.map((item: any, idx: number) => {
                    const currentPrice = editedPrices[item.dpoDetailId] || 0;
                    const lineTotal = currentPrice * item.quantity;
                    
                    return (
                      <TableRow key={item.dpoDetailId} className="hover:bg-slate-50/50">
                        <TableCell className="text-center text-slate-500 font-medium pl-4">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="font-bold text-slate-700">{item.materialName}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{t("Material Code")}: {item.materialId}</div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-800 text-base">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input 
                            type="number"
                            min="0"
                            disabled={isReadOnly}
                            className={`text-right font-bold h-9 ${isReadOnly ? 'bg-slate-50 text-slate-500' : 'bg-white text-indigo-700 border-indigo-200 focus-visible:ring-indigo-500'}`}
                            value={editedPrices[item.dpoDetailId] || ""}
                            onChange={(e) => setEditedPrices(prev => ({
                              ...prev,
                              [item.dpoDetailId]: Number(e.target.value)
                            }))}
                          />
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600 pr-4">
                          {lineTotal.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}