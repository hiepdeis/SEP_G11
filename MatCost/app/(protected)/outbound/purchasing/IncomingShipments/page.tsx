"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Truck, CheckCircle2, FileSignature, Eraser, Loader2, Package, MapPin, Search } from "lucide-react";
import SignatureCanvas from 'react-signature-canvas';
import { toast } from "sonner";
import axiosClient from "@/lib/axios-client";
import { projectApi, ProjectDto } from "@/services/project-services";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function IncomingShipments() {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  
  // States cho Modal Ký nhận
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const sigCanvas = useRef(null);

  // 0. LẤY DANH SÁCH DỰ ÁN
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await projectApi.getProjects();
        setProjects(data);
        // Nếu chỉ có 1 dự án, tự động chọn luôn
        if (data.length === 1) {
          setSelectedProjectId(data[0].projectId.toString());
        }
      } catch (error) {
        toast.error("Không thể tải danh sách dự án.");
      }
    };
    fetchProjects();
  }, []);

  // 1. LẤY DỮ LIỆU TỪ API HỢP NHẤT
  const fetchShipments = async (id: string) => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await axiosClient.get(`/projects/${id}/incoming-shipments`);
      setShipments(res.data);
    } catch (error) {
      console.error("Lỗi khi tải hàng đang giao:", error);
      toast.error("Không thể tải danh sách hàng đang giao.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchShipments(selectedProjectId);
    } else {
      setShipments([]);
    }
  }, [selectedProjectId]);

  // Xóa chữ ký
  const clearSignature = () => {
    sigCanvas.current?.clear();
    setIsSigned(false);
  };

  // Mở Modal
  const handleOpenSignModal = (shipment) => {
    setSelectedShipment(shipment);
    setIsSignModalOpen(true);
  };

  // 2. XỬ LÝ NÚT CHỐT NHẬN HÀNG (ĐÂY LÀ CHỖ CHIA NHÁNH THẦN THÁNH)
  const handleConfirmReceipt = async () => {
    if (!isSigned) return toast.error("Vui lòng ký xác nhận nhận hàng.");
    
    try {
      setReviewing(true);
      const idStr = selectedShipment.shipmentId; // VD: "IS_43" hoặc "DPO_15"
      
      // Tách tiền tố để biết là gọi API nào
      if (idStr.startsWith("IS_")) {
        const actualId = idStr.replace("IS_", "");
        // Gọi API của kho (Thêm action Completed vào C# sau nhé)
        await axiosClient.post(`/IssueSlips/${actualId}/change-status`, { 
            action: "Completed", 
            reason: "Kỹ sư hiện trường đã nhận đủ hàng." 
        });
      } 
      else if (idStr.startsWith("DPO_")) {
        const actualId = idStr.replace("DPO_", "");
        // Gọi API của Mua xuất thẳng (Cái API xác nhận nhận hàng DPO bạn đã có)
        await axiosClient.post(`/DirectPurchaseOrder/${actualId}/confirm-receipt`);
      }

      toast.success("Tuyệt vời! Đã ký nhận hàng thành công.");
      setIsSignModalOpen(false);
      clearSignature();
      fetchShipments(selectedProjectId); // Reload lại list

    } catch (error) {
      toast.error("Có lỗi xảy ra khi xác nhận.");
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-white border-b border-slate-100 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                <Truck className="w-5 h-5 text-indigo-600" /> Hàng Đang Giao Đến Công Trường
              </CardTitle>
              <p className="text-sm text-slate-500 font-normal mt-1">Danh sách vật tư từ Kho và Nhà cung cấp đang trên đường vận chuyển.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500 whitespace-nowrap">Dự án:</span>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-[250px] bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Chọn dự án để xem hàng..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.projectId} value={p.projectId.toString()}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="pl-6 w-[180px]">Mã Chuyến / Yêu cầu</TableHead>
                <TableHead>Nguồn Hàng</TableHead>
                <TableHead>Tóm tắt Vật tư</TableHead>
                <TableHead className="text-center w-[150px]">Trạng thái</TableHead>
                <TableHead className="text-right pr-6 w-[150px]">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400"/></TableCell></TableRow>
              ) : !selectedProjectId ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-slate-500 italic">Vui lòng chọn dự án để xem danh sách hàng đang giao.</TableCell></TableRow>
              ) : shipments.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-slate-500">Hiện không có chuyến hàng nào đang giao.</TableCell></TableRow>
              ) : (
                shipments.map((ship) => (
                  <TableRow key={ship.shipmentId} className="hover:bg-slate-50/50">
                    <TableCell className="pl-6">
                      <div className="font-bold text-slate-800">{ship.shipmentCode}</div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                        Ref: {ship.referenceCode}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        {ship.shipmentId.startsWith("IS_") ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Kho Nội Bộ</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Nhà Cung Cấp</Badge>
                        )}
                        <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400"/> {ship.supplierName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-700">
                        {ship.items.slice(0, 2).map((i, idx) => (
                          <div key={idx}>• <span className="font-semibold text-indigo-600">{i.quantity}</span> x {i.materialName}</div>
                        ))}
                        {ship.items.length > 2 && <div className="text-xs text-slate-400 italic mt-1">+ {ship.items.length - 2} vật tư khác...</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-none shadow-none font-medium">
                        <Truck className="w-3 h-3 mr-1" /> {ship.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button 
                        size="sm" 
                        className="bg-emerald-600 hover:bg-emerald-700 shadow-sm text-white"
                        onClick={() => handleOpenSignModal(ship)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Nhận hàng
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ================= MODAL KÝ NHẬN ================= */}
      <Dialog open={isSignModalOpen} onOpenChange={(open) => { 
        setIsSignModalOpen(open); 
        if (!open) clearSignature(); 
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <FileSignature className="w-5 h-5" /> Ký Xác Nhận Nhận Hàng
            </DialogTitle>
            <DialogDescription>
              Vui lòng kiểm tra kỹ số lượng vật tư trước khi ký nhận. Hành động này sẽ hạch toán chi phí vào dự án.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2">
            {/* Hiển thị tóm tắt đơn hàng */}
            {selectedShipment && (
              <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="text-sm font-semibold text-slate-800 mb-2 border-b pb-2">📦 {selectedShipment.shipmentCode}</div>
                <div className="max-h-[150px] overflow-y-auto space-y-1.5">
                  {selectedShipment.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-slate-600 truncate pr-4">{i.materialName}</span>
                      <span className="font-bold text-slate-800 shrink-0">{i.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-end mb-2">
              <label className="text-sm font-semibold text-slate-700">Ký tên người nhận <span className="text-red-500">*</span></label>
              {isSigned && (
                <button onClick={clearSignature} className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors">
                  <Eraser className="w-3 h-3" /> Vẽ lại
                </button>
              )}
            </div>
            <div className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 overflow-hidden relative group">
              <SignatureCanvas 
                ref={sigCanvas} 
                onEnd={() => setIsSigned(true)} 
                penColor="black" 
                canvasProps={{ className: "w-full h-32 cursor-crosshair bg-white" }}
              />
              {!isSigned && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40">
                  <span className="text-slate-400 select-none italic text-sm">Ký vào khung này...</span>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsSignModalOpen(false)}>Hủy</Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white" 
              onClick={handleConfirmReceipt} 
              disabled={reviewing || !isSigned}
            >
              {reviewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>} 
              Xác Nhận Đủ Hàng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}