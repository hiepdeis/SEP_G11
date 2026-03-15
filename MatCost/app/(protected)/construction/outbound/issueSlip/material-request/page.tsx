"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { projectApi, ProjectDto } from "@/services/project-services";
import { warehouseApi, WarehouseListItemDto } from "@/services/warehouse-service";
import { issueSlipApi } from "@/services/issueslip-service";
import axiosClient from "@/lib/axios-client"; 
import * as XLSX from "xlsx";
import {
  ArrowLeft, Save, Loader2, ClipboardList, UploadCloud, Plus,
  Trash2, PenLine, FileSpreadsheet, CheckCircle2, ChevronLeft, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const MATERIAL_SUGGESTIONS = [
  { code: "MAT-XM-01", name: "Xi măng Hà Tiên Đa Dụng", unit: "Bao", price: 85000 },
  { code: "MAT-TH-01", name: "Thép hộp I-200 Hòa Phát", unit: "Thanh", price: 450000 },
  { code: "MAT-GA-01", name: "Gạch ống 4 lỗ Tuynel", unit: "Viên", price: 1200 },
  { code: "MAT-PE-01", name: "Băng dính trắng 5F100R", unit: "Cuộn", price: 14000 },
];

type MaterialRow = {
  id: string;
  name: string;
  unit: string;
  unitPrice: number;
  qty: number;
  isEditing: boolean;
};

export default function IssueMaterialPage() {
  const router = useRouter();
  
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseListItemDto[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number>(1);

  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [shakeFields, setShakeFields] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    projectId: "",
    workItem: "",
    requester: "Đang tải...",
    department: "Phòng Kỹ Thuật", 
    warehouseId: "",
    deliveryLocation: "",
    requestCode: "",
    requestDate: new Date().toISOString().split('T')[0],
    status: "Chưa gửi (Draft)",
    reference: "",
    notes: ""
  });

  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- STATE PHÂN TRANG ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  useEffect(() => {
    const initData = async () => {
      setIsLoadingData(true);
      try {
        const now = new Date();
        const code = `REQ-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-${Math.floor(1000 + Math.random() * 9000)}`;
        
        const [projRes, whRes, userRes] = await Promise.all([
          projectApi.getProjects(),
          warehouseApi.getAll(),
          axiosClient.get("/Auth/me").catch(() => null) 
        ]);

        setProjects(projRes);
        setWarehouses(whRes.data || []);
        
        const userData = userRes?.data;
        if (userData) {
           setCurrentUserId(userData.userId);
        }

        setFormData(prev => ({ 
          ...prev, 
          requestCode: code,
          requester: userData?.fullName || "Đang tải...",
        //   department: userData?.roleName || "Phòng Kỹ Thuật"
        }));

      } catch (error) {
        toast.error("Không thể tải dữ liệu khởi tạo.");
      } finally {
        setIsLoadingData(false);
      }
    };
    initData();
  }, []);

  // Đưa user về trang cuối khi thêm dòng mới
  const addRow = () => {
    const newRow: MaterialRow = {
      id: Date.now().toString(),
      name: "", unit: "", unitPrice: 0, qty: 1, isEditing: true
    };
    const newMaterials = [...materials, newRow];
    setMaterials(newMaterials);
    
    // Tự động chuyển đến trang cuối cùng
    if (itemsPerPage !== -1) {
       const newTotalPages = Math.ceil(newMaterials.length / itemsPerPage);
       setCurrentPage(newTotalPages);
    }
  };

  const deleteRow = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const toggleEdit = (id: string) => {
    setMaterials(materials.map(m => m.id === id ? { ...m, isEditing: !m.isEditing } : m));
  };

  const updateCell = (id: string, field: keyof MaterialRow, value: any) => {
    setMaterials(materials.map(m => {
      if (m.id === id) {
        const updated = { ...m, [field]: value };
        if (field === 'name') {
          const found = MATERIAL_SUGGESTIONS.find(s => s.name === value);
          if (found) {
            updated.unit = found.unit;
            updated.unitPrice = found.price;
          }
        }
        return updated;
      }
      return m;
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const aoa = XLSX.utils.sheet_to_json<any[][]>(ws, { header: 1 });
        let headerRowIndex = -1;
        
        for (let i = 0; i < aoa.length; i++) {
          const row = aoa[i];
          if (row && row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('tên'))) {
            headerRowIndex = i;
            break;
          }
        }
        if (headerRowIndex === -1) {
          toast.error("Không tìm thấy dòng tiêu đề vật tư trong file Excel!");
          return;
        }

        const extractedData: MaterialRow[] = [];
        let startRow = headerRowIndex + 1;
        const nextRow = aoa[startRow];
        if (nextRow && nextRow.some(cell => cell === 'A' || cell === 'B' || cell === '1')) {
          startRow++;
        }

        for (let i = startRow; i < aoa.length; i++) {
          const row = aoa[i];
          if (!row || row.length === 0) continue;
          const stt = row[0];
          const name = row[1];
          if (!stt || !name || String(name).trim() === '' || String(name).toLowerCase().includes('tổng')) {
             break;
          }
          extractedData.push({
            id: Date.now().toString() + i,
            name: String(name).trim(),
            unit: row[2] ? String(row[2]).trim() : "",
            unitPrice: parseFloat(row[3]) || 0,
            qty: parseFloat(row[4]) || 0,
            isEditing: false
          });
        }

        setMaterials(prev => [...prev, ...extractedData]);
        toast.success(`Đã import thành công ${extractedData.length} vật tư!`);
        setIsImportModalOpen(false);
      } catch (error) {
        toast.error("File không đúng định dạng hoặc bị lỗi!");
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    const newErrors: string[] = [];
    if (!formData.projectId) newErrors.push("projectId");
    if (!formData.workItem) newErrors.push("workItem");
    if (!formData.warehouseId) newErrors.push("warehouseId");
    if (!formData.deliveryLocation.trim()) newErrors.push("deliveryLocation");

    if (newErrors.length > 0) {
      setFormErrors(newErrors);
      setShakeFields(newErrors);
      setTimeout(() => setShakeFields([]), 600);
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc!");
      return;
    }

    if (materials.length === 0) {
      toast.error("Vui lòng thêm ít nhất 1 vật tư!");
      return;
    }
    if (materials.some(m => m.isEditing)) {
      toast.warning("Vui lòng lưu các dòng đang chỉnh sửa trước khi gửi!");
      return;
    }

    try {
      setIsSubmitting(true);

      const slipPayload = {
        projectId: parseInt(formData.projectId),
        warehouseId: parseInt(formData.warehouseId),
        issueCode: formData.requestCode,
        userId: currentUserId, 
        description: formData.notes,
        WorkItem: formData.workItem,
        Department: formData.department,
        DeliveryLocation: formData.deliveryLocation,
        ReferenceCode: formData.reference
      };

      const createdSlip = await issueSlipApi.createIssueSlip(slipPayload);
      const issueId = createdSlip.issueId;

      const detailsPayload = materials.map(m => ({
         materialId: MATERIAL_SUGGESTIONS.find(s => s.name === m.name)?.code === "MAT-XM-01" ? 1 : 2, 
         quantity: m.qty,
         unitPrice: m.unitPrice
      }));

      await issueSlipApi.createIssueSlipDetails(issueId, detailsPayload);

      toast.success("Đã gửi yêu cầu xuất vật tư thành công!");
      router.push("/construction/outbound/issueSlip");
    } catch (error: any) {
      const backendError = error.response?.data?.title || error.response?.data?.message || JSON.stringify(error.response?.data) || "Có lỗi xảy ra khi gửi yêu cầu.";
      toast.error(`Lỗi: ${backendError}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- LOGIC PHÂN TRANG ---
  const isAll = itemsPerPage === -1;
  const totalPages = isAll ? 1 : Math.ceil(materials.length / itemsPerPage) || 1;
  // Đảm bảo currentPage không vượt quá totalPages khi xóa dòng
  if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);

  const startIndex = (currentPage - 1) * (isAll ? materials.length : itemsPerPage);
  const endIndex = isAll ? materials.length : startIndex + itemsPerPage;
  const paginatedMaterials = materials.slice(startIndex, endIndex);

  const grandTotal = materials.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-5px); }
          40%, 80% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>

      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title="Material Request Form" />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6 max-w-6xl mx-auto w-full">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:bg-transparent hover:text-indigo-600">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
            </Button>
            <div className="flex items-center gap-3">
              <Badge className="bg-amber-100 text-amber-800 border-none px-3 py-1 text-sm font-medium">Draft</Badge>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Submit Request
              </Button>
            </div>
          </div>

          <datalist id="material-suggestions">
            {MATERIAL_SUGGESTIONS.map(m => <option key={m.code} value={m.name} />)}
          </datalist>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* THÔNG TIN CHUNG */}
            <Card className="border-slate-200 shadow-sm gap-0 h-full">
              <CardHeader className="bg-white border-b border-slate-100 py-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                  <ClipboardList className="w-5 h-5 text-indigo-600" /> Thông tin chung
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 bg-white">
                <div className={`space-y-2 ${shakeFields.includes('projectId') ? 'animate-shake' : ''}`}>
                  <label className="text-xs font-bold text-slate-700 uppercase">Công trình <span className="text-red-500">*</span></label>
                  <Select value={formData.projectId} onValueChange={(val) => { setFormData({...formData, projectId: val}); setFormErrors(prev => prev.filter(e => e !== 'projectId')); }}>
                    <SelectTrigger className={`w-full bg-slate-50 focus:bg-white ${formErrors.includes('projectId') ? 'border-red-500 ring-1 ring-red-500' : ''}`}><SelectValue placeholder="Chọn công trình..." /></SelectTrigger>
                    <SelectContent>{projects.map(p => <SelectItem key={p.projectId} value={p.projectId.toString()}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className={`space-y-2 ${shakeFields.includes('workItem') ? 'animate-shake' : ''}`}>
                  <label className="text-xs font-bold text-slate-700 uppercase">Hạng mục <span className="text-red-500">*</span></label>
                  <Select value={formData.workItem} onValueChange={(val) => { setFormData({...formData, workItem: val}); setFormErrors(prev => prev.filter(e => e !== 'workItem')); }}>
                    <SelectTrigger className={`w-full bg-slate-50 focus:bg-white ${formErrors.includes('workItem') ? 'border-red-500 ring-1 ring-red-500' : ''}`}><SelectValue placeholder="Chọn hạng mục..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="foundation">Móng</SelectItem>
                      <SelectItem value="body">Thân</SelectItem>
                      <SelectItem value="roof">Mái</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">Người yêu cầu</label>
                  <Input value={formData.requester} disabled className="bg-slate-100 text-slate-600 font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">Đơn vị yêu cầu</label>
                  <Input value={formData.department} disabled className="bg-slate-100 text-slate-600" />
                </div>
                <div className={`space-y-2 ${shakeFields.includes('warehouseId') ? 'animate-shake' : ''}`}>
                  <label className="text-xs font-bold text-slate-700 uppercase">Kho xuất <span className="text-red-500">*</span></label>
                  <Select value={formData.warehouseId} onValueChange={(val) => { setFormData({...formData, warehouseId: val}); setFormErrors(prev => prev.filter(e => e !== 'warehouseId')); }}>
                    <SelectTrigger className={`w-full bg-slate-50 focus:bg-white ${formErrors.includes('warehouseId') ? 'border-red-500 ring-1 ring-red-500' : ''}`}><SelectValue placeholder="Chọn kho..." /></SelectTrigger>
                    <SelectContent>{warehouses.map(wh => <SelectItem key={wh.warehouseId} value={wh.warehouseId.toString()}>{wh.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className={`space-y-2 ${shakeFields.includes('deliveryLocation') ? 'animate-shake' : ''}`}>
                  <label className="text-xs font-bold text-slate-700 uppercase">Nơi nhận <span className="text-red-500">*</span></label>
                  <Input placeholder="Vị trí giao hàng..." value={formData.deliveryLocation} onChange={e => { setFormData({...formData, deliveryLocation: e.target.value}); if(e.target.value.trim()) setFormErrors(prev => prev.filter(err => err !== 'deliveryLocation')); }} className={`w-full bg-slate-50 focus:bg-white ${formErrors.includes('deliveryLocation') ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                </div>
              </CardContent>
            </Card>

            {/* THÔNG TIN HỆ THỐNG */}
            <Card className="border-slate-200 shadow-sm gap-0 h-full flex flex-col">
              <CardHeader className="bg-white border-b border-slate-100 py-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600" /> Thông tin hệ thống
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 bg-white flex-grow">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">Mã Yêu Cầu</label>
                  <Input value={formData.requestCode} disabled className="bg-slate-100 font-mono text-indigo-700 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">Ngày yêu cầu</label>
                  <Input type="date" value={formData.requestDate} disabled className="bg-slate-100 text-slate-600" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">Trạng thái</label>
                  <Input value={formData.status} disabled className="bg-slate-100 text-amber-700 font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">Mã tham chiếu</label>
                  <Input placeholder="Mã chứng từ liên quan..." value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} className="bg-slate-50 focus:bg-white" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">Ghi chú</label>
                  <Textarea placeholder="Nhập lý do xuất, lưu ý đặc biệt cho thủ kho..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="bg-slate-50 focus:bg-white min-h-[80px] resize-none" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* === BẢNG VẬT TƯ === */}
          <Card className="border-slate-200 shadow-sm gap-0 flex flex-col min-h-[400px]">
            <CardHeader className="bg-white border-b border-slate-100 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-800">Danh sách Nguyên vật liệu</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-9" onClick={() => setIsImportModalOpen(true)}><UploadCloud className="w-4 h-4 mr-2" /> Import Excel</Button>
                <Button variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 h-9" onClick={addRow}><Plus className="w-4 h-4 mr-2" /> Thêm dòng</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 bg-white flex flex-col justify-between flex-1">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-[60px] text-center font-bold">STT</TableHead>
                      <TableHead className="font-bold min-w-[250px]">Tên nhãn hiệu, quy cách vật tư</TableHead>
                      <TableHead className="w-[100px] text-center font-bold">ĐVT</TableHead>
                      <TableHead className="w-[150px] text-right font-bold">Đơn giá</TableHead>
                      <TableHead className="w-[120px] text-right font-bold">Số lượng</TableHead>
                      <TableHead className="w-[150px] text-right font-bold">Thành tiền</TableHead>
                      <TableHead className="w-[100px] text-center font-bold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMaterials.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-slate-500">Chưa có vật tư nào. Vui lòng thêm tay hoặc Import từ Excel.</TableCell>
                      </TableRow>
                    ) : (
                      paginatedMaterials.map((item, index) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/50">
                          {/* STT chạy theo phân trang */}
                          <TableCell className="text-center font-medium text-slate-500">{startIndex + index + 1}</TableCell>
                          <TableCell>
                            {item.isEditing ? (
                              <Input list="material-suggestions" placeholder="Nhập tên vật tư..." value={item.name} onChange={(e) => updateCell(item.id, 'name', e.target.value)} className="h-8 border-indigo-200 focus-visible:ring-indigo-500" />
                            ) : <span className="font-medium text-slate-700">{item.name || <span className="text-red-400 italic">Chưa nhập tên</span>}</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.isEditing ? (
                              <Input value={item.unit} onChange={(e) => updateCell(item.id, 'unit', e.target.value)} className="h-8 text-center" />
                            ) : <span className="text-slate-600">{item.unit}</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.isEditing ? (
                              <Input type="number" min={0} value={item.unitPrice} onChange={(e) => updateCell(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className="h-8 text-right" />
                            ) : <span className="text-slate-600">{item.unitPrice.toLocaleString('vi-VN')}</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.isEditing ? (
                              <Input type="number" min={1} value={item.qty} onChange={(e) => updateCell(item.id, 'qty', parseFloat(e.target.value) || 0)} className="h-8 text-right font-bold text-indigo-600" />
                            ) : <span className="font-bold text-slate-900">{item.qty}</span>}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-emerald-600 bg-emerald-50/30">
                            {(item.qty * item.unitPrice).toLocaleString('vi-VN')}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              {item.isEditing ? (
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={() => toggleEdit(item.id)}><CheckCircle2 className="w-4 h-4" /></Button>
                              ) : (
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50" onClick={() => toggleEdit(item.id)}><PenLine className="w-4 h-4" /></Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50" onClick={() => deleteRow(item.id)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {materials.length > 0 && (
                      <TableRow className="bg-slate-100/50">
                        <TableCell colSpan={5} className="text-right font-bold text-slate-800 uppercase tracking-wider">Tổng cộng toàn phiếu:</TableCell>
                        <TableCell className="text-right font-black text-emerald-700 text-lg">{grandTotal.toLocaleString('vi-VN')} VNĐ</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* FOOTER PHÂN TRANG */}
              {materials.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-4 mt-auto">
                  <div className="text-sm text-slate-500">
                    Hiển thị <span className="font-medium text-slate-900">{startIndex + 1}</span> đến <span className="font-medium text-slate-900">{Math.min(endIndex, materials.length)}</span> trong tổng số <span className="font-medium text-slate-900">{materials.length}</span> vật tư
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">Số dòng:</span>
                      <Select value={itemsPerPage.toString()} onValueChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}>
                        <SelectTrigger className="h-8 w-[70px] bg-white border-slate-200"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="-1">Tất cả</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="h-8"><ChevronLeft className="w-4 h-4" /></Button>
                      <div className="text-sm font-medium text-slate-600 px-2">Trang {currentPage} / {totalPages}</div>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="h-8"><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* MODAL IMPORT EXCEL */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-indigo-700"><FileSpreadsheet className="w-5 h-5" /> Import từ file Excel</DialogTitle></DialogHeader>
          <div className="py-6 flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 rounded-lg bg-indigo-50/50 hover:bg-indigo-50 transition-colors">
             <UploadCloud className="w-12 h-12 text-indigo-400 mb-3" />
             <p className="font-semibold text-slate-700 mb-1">Click để tải lên hoặc kéo thả file vào đây</p>
             <p className="text-sm text-slate-500 mb-4">Chỉ hỗ trợ định dạng .xls, .xlsx</p>
             <Button className="relative bg-indigo-600 hover:bg-indigo-700">
               Chọn file Excel
               <input type="file" ref={fileInputRef} accept=".xlsx, .xls" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
             </Button>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsImportModalOpen(false)}>Hủy bỏ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}