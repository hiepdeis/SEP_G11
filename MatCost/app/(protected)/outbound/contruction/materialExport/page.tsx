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
import { useTranslation } from "react-i18next";
import { materialApi, MaterialDto } from "@/services/materials-service";



type MaterialRow = { 
  id: string;
  materialId: number; 
  code: string;
  name: string;
  unit: string; 
  qty: number; 
  isEditing: boolean; 
};

export default function IssueMaterialPage() {
  const { t } = useTranslation();
  const router = useRouter();
  
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseListItemDto[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number>(1);

  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [shakeFields, setShakeFields] = useState<string[]>([]);

  const [materialList, setMaterialList] = useState<MaterialDto[]>([]);
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await materialApi.getMaterials();
        setMaterialList(response);
      } catch (error) {
        toast.error(t("Error fetching materials"));
      }
    };
    fetchMaterials();
  }, [t]);


  const [formData, setFormData] = useState({
    projectId: "", workItem: "", requester: t("Loading data..."), department: "", 
    warehouseId: "", deliveryLocation: "", requestCode: "", 
    requestDate: new Date().toISOString().split('T')[0], status: t("Draft"), reference: "", notes: ""
  });

  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  useEffect(() => {
    const initData = async () => {
      setIsLoadingData(true);
      try {
        const now = new Date();
        const code = `REQ-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-${Math.floor(1000 + Math.random() * 9000)}`;
        
        const [projRes, whRes, userRes] = await Promise.all([
          projectApi.getProjects(), warehouseApi.getAll(), axiosClient.get("/Auth/me").catch(() => null) 
        ]);
        setProjects(projRes);
        setWarehouses(whRes.data || []);
        
        const userData = userRes?.data;
        if (userData) setCurrentUserId(userData.userId);

        setFormData(prev => ({ 
          ...prev, requestCode: code, requester: userData?.fullName || t("Unknown"), department: t("Construction Team")
        }));
      } catch (error) {
        toast.error(t("Error"));
      } finally {
        setIsLoadingData(false);
      }
    };
    initData();
  }, [t]);

  const addRow = () => {
    const newMaterials = [...materials, { id: Date.now().toString(), materialId: 0, code: "", name: "", unit: "", qty: 1, isEditing: true }];
    setMaterials(newMaterials);
    if (itemsPerPage !== -1) setCurrentPage(Math.ceil(newMaterials.length / itemsPerPage));
  };

  const deleteRow = (id: string) => setMaterials(materials.filter(m => m.id !== id));
  const toggleEdit = (id: string) => setMaterials(materials.map(m => m.id === id ? { ...m, isEditing: !m.isEditing } : m));

  const normalize = (str: string) =>
  str.trim().toLowerCase();

  const updateCell = (id: string, field: keyof MaterialRow, value: any) => {
    setMaterials(materials.map(m => {
        if (m.id === id) {
          const updated = { ...m, [field]: value };
          let found;

        if (field === "name") {
          found = materialList.find(
            s => normalize(s.name) === normalize(value)
          );
        }

        if (field === "code") {
          found = materialList.find(
            s => normalize(s.code) === normalize(value)
          );
        }

        if (found) {
          updated.name = found.name;
          updated.code = found.code;
          updated.unit = found.unit;
          updated.materialId = found.materialId;
        }

        return updated;
      }
      return m;
    }));
  };

  const handleSaveRow = (id: string) => {
    const targetRow = materials.find(m => m.id === id);
    if (!targetRow) return;

    if (!targetRow.code.trim() || !targetRow.name.trim()) {
      toast.error("Vui lòng nhập Mã và Tên vật tư!");
      return;
    }

    const duplicateRow = materials.find(m => 
      m.id !== id && 
      normalize(m.code) === normalize(targetRow.code) &&
      normalize(m.name) === normalize(targetRow.name) &&
      normalize(m.unit) === normalize(targetRow.unit)
    );

    if (duplicateRow) {
      setMaterials(prev => prev.map(m => 
        m.id === duplicateRow.id 
          ? { ...m, qty: m.qty + targetRow.qty, isEditing: false } 
          : m
      ).filter(m => m.id !== id)); 
      
      toast.success("Đã gộp vật tư trùng lặp và cộng dồn số lượng!");
    } else {
      setMaterials(prev => prev.map(m => m.id === id ? { ...m, isEditing: false } : m));
    }
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
        const aoa = XLSX.utils.sheet_to_json<any[][]>(wb.Sheets[wsname], { header: 1 });
        
        let headerRowIndex = -1;
        for (let i = 0; i < aoa.length; i++) {
          if (aoa[i] && aoa[i].some(cell => typeof cell === 'string' && cell.toLowerCase().includes('tên'))) {
            headerRowIndex = i; break;
          }
        }
        if (headerRowIndex === -1) { toast.error(t("File error")); return; }

        const extractedData: MaterialRow[] = [];
        let startRow = headerRowIndex + 1;
        if (aoa[startRow] && aoa[startRow].some(cell => cell === 'A' || cell === 'B' || cell === '1')) startRow++;

        for (let i = startRow; i < aoa.length; i++) {
          const row = aoa[i];
          if (!row || row.length === 0) continue;
          if (!row[0] || !row[1] || String(row[1]).trim() === '' || String(row[1]).toLowerCase().includes('tổng')) break;

          extractedData.push({
            id: Date.now().toString() + i, materialId: 0, code: "", name: String(row[1]).trim(), unit: row[2] ? String(row[2]).trim() : "",
            qty: parseFloat(row[4]) || 0, isEditing: false
          });
        }
        setMaterials(prev => [...prev, ...extractedData]);
        toast.success(t("Import successful"));
        setIsImportModalOpen(false);
      } catch (error) { toast.error(t("File error")); }
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
      setFormErrors(newErrors); setShakeFields(newErrors);
      setTimeout(() => setShakeFields([]), 600);
      toast.error(t("Required")); return;
    }
    if (materials.length === 0 || materials.some(m => m.isEditing)) {
      toast.warning(t("Check materials")); return;
    }

    try {
      setIsSubmitting(true);
      if (materials.some(m => !m.materialId)) {
        toast.error(t("Material not valid"));
        return;
      }

      // 🧾 1. Tạo IssueSlip
      const issueSlipPayload = {
        projectId: Number(formData.projectId),
        warehouseId: 1,
        issueCode: formData.requestCode,
        userId: currentUserId,
        description: formData.notes,
        WorkItem: formData.workItem,
        Department: formData.department,
        DeliveryLocation: formData.deliveryLocation,
        ReferenceCode: formData.reference,
      };

      const issueSlip = await issueSlipApi.createIssueSlip(issueSlipPayload);
      console.log("Created IssueSlip:", issueSlip);
      const issueSlipId = issueSlip.issueId;

      const details = materials.map((m) => ({
        materialId: m.materialId,
        quantity: m.qty,
        unitPrice: 0, 
      }));
      console.log("Created IssueSlipDetails:", details);
       
      await issueSlipApi.createIssueSlipDetails(issueSlipId, details);

      toast.success(t("Success"));

      router.push("/construction/outbound/issueSlip");
      } catch (error: any) { 
        toast.error(t("Error")); }
      finally { setIsSubmitting(false); }
    };

  const isAll = itemsPerPage === -1;
  const totalPages = isAll ? 1 : Math.ceil(materials.length / itemsPerPage) || 1;
  if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
  const startIndex = (currentPage - 1) * (isAll ? materials.length : itemsPerPage);
  const endIndex = isAll ? materials.length : startIndex + itemsPerPage;
  const paginatedMaterials = materials.slice(startIndex, endIndex);
  
  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <style>{`@keyframes shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-5px); } 40%, 80% { transform: translateX(5px); } } .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }`}</style>
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Material Request Form")} />
        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6 max-w-6xl mx-auto w-full">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:bg-transparent hover:text-indigo-600"><ArrowLeft className="w-4 h-4 mr-2" /> {t("Back to List")}</Button>
            <div className="flex items-center gap-3">
              <Badge className="bg-amber-100 text-amber-800 border-none px-3 py-1 text-sm font-medium">{t("Draft")}</Badge>
              <Button onClick={handleSubmit}
               disabled={isSubmitting} 
               className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                {isSubmitting ?
                 <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} 
                 {t("Submit Request")}
                 </Button>
            </div>
          </div>

         <datalist id="material-name-suggestions">
            {materialList.map(m => (
              <option key={m.code} value={m.name} />
            ))}
          </datalist>

          <datalist id="material-code-suggestions">
            {materialList.map(m => (
              <option key={m.code} value={m.code} />
            ))}
          </datalist>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200 shadow-sm gap-0 h-full">
              <CardHeader className="bg-white border-b border-slate-100 py-4"><CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800"><ClipboardList className="w-5 h-5 text-indigo-600" /> {t("General Information")}</CardTitle></CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 bg-white">
                <div className={`space-y-2 ${shakeFields.includes('projectId') ? 'animate-shake' : ''}`}>
                  <label className="text-xs font-bold text-slate-700 uppercase">{t("Project")} <span className="text-red-500">*</span></label>
                  <Select value={formData.projectId} onValueChange={(val) => { setFormData({...formData, projectId: val}); setFormErrors(prev => prev.filter(e => e !== 'projectId')); }}>
                    <SelectTrigger className={`w-full bg-slate-50 focus:bg-white ${formErrors.includes('projectId') ? 'border-red-500 ring-1 ring-red-500' : ''}`}><SelectValue placeholder={t("Select...")} /></SelectTrigger>
                    <SelectContent showSearch className="w-full">{projects.map(p => <SelectItem key={p.projectId} value={p.projectId.toString()}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className={`space-y-2 ${shakeFields.includes('workItem') ? 'animate-shake' : ''}`}>
                  <label className="text-xs font-bold text-slate-700 uppercase">{t("Work Item")} <span className="text-red-500">*</span></label>
                  <Select value={formData.workItem} onValueChange={(val) => { setFormData({...formData, workItem: val}); setFormErrors(prev => prev.filter(e => e !== 'workItem')); }}>
                    <SelectTrigger className={`w-full bg-slate-50 focus:bg-white ${formErrors.includes('workItem') ? 'border-red-500 ring-1 ring-red-500' : ''}`}><SelectValue placeholder={t("Select...")} /></SelectTrigger>
                    <SelectContent showSearch className="w-full"><SelectItem value="foundation">{t("Foundation")}</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-700 uppercase">{t("Requester")}</label><Input value={formData.requester} disabled className="bg-slate-100 text-slate-600 font-medium" /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-700 uppercase">{t("Department")}</label><Input value={formData.department} disabled className="bg-slate-100 text-slate-600" /></div>
                <div className={`space-y-2 ${shakeFields.includes('warehouseId') ? 'animate-shake' : ''}`}>
                  <label className="text-xs font-bold text-slate-700 uppercase">{t("Source Warehouse")} <span className="text-red-500">*</span></label>
                  <Select value={formData.warehouseId} onValueChange={(val) => { setFormData({...formData, warehouseId: val}); setFormErrors(prev => prev.filter(e => e !== 'warehouseId')); }}>
                    <SelectTrigger className={`w-full bg-slate-50 focus:bg-white ${formErrors.includes('warehouseId') ? 'border-red-500 ring-1 ring-red-500' : ''}`}><SelectValue placeholder={t("Select...")} /></SelectTrigger>
                    <SelectContent showSearch className="w-full">{warehouses.map(wh => <SelectItem key={wh.warehouseId} value={wh.warehouseId.toString()}>{wh.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className={`space-y-2 ${shakeFields.includes('deliveryLocation') ? 'animate-shake' : ''}`}>
                  <label className="text-xs font-bold text-slate-700 uppercase">{t("Delivery Location")} <span className="text-red-500">*</span></label>
                  <Input placeholder="..." value={formData.deliveryLocation} onChange={e => { setFormData({...formData, deliveryLocation: e.target.value}); if(e.target.value.trim()) setFormErrors(prev => prev.filter(err => err !== 'deliveryLocation')); }} className={`w-full bg-slate-50 focus:bg-white ${formErrors.includes('deliveryLocation') ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm gap-0 h-full flex flex-col">
              <CardHeader className="bg-white border-b border-slate-100 py-4"><CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800"><FileSpreadsheet className="w-5 h-5 text-indigo-600" /> {t("System Details")}</CardTitle></CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 bg-white flex-grow">
                <div className="space-y-2"><label className="text-xs font-bold text-slate-700 uppercase">{t("Request Code")}</label><Input value={formData.requestCode} disabled className="bg-slate-100 font-mono text-indigo-700 font-bold" /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-700 uppercase">{t("Request Date")}</label><Input type="date" value={formData.requestDate} disabled className="bg-slate-100 text-slate-600" /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-700 uppercase">{t("Status")}</label><Input value={formData.status} disabled className="bg-slate-100 text-amber-700 font-medium" /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-700 uppercase">{t("Reference Code")}</label><Input placeholder="..." value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} className="bg-slate-50 focus:bg-white" /></div>
                <div className="space-y-2 md:col-span-2"><label className="text-xs font-bold text-slate-700 uppercase">{t("Notes")}</label><Textarea placeholder="..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="bg-slate-50 focus:bg-white min-h-[80px] resize-none" /></div>
              </CardContent>
            </Card> 
          </div>

          <Card className="border-slate-200 shadow-sm gap-0 flex flex-col min-h-[400px]">
            <CardHeader className="bg-white border-b border-slate-100 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-800">{t("Materials List")}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-9" onClick={() => setIsImportModalOpen(true)}><UploadCloud className="w-4 h-4 mr-2" /> {t("Import Excel")}</Button>
                <Button variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 h-9" onClick={addRow}><Plus className="w-4 h-4 mr-2" /> {t("Add Item")}</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 bg-white flex flex-col justify-between flex-1">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-[60px] text-center font-bold">{t("No.")}</TableHead>
                      <TableHead className="font-bold min-w-[150px]">{t("Item Code")}</TableHead>
                      <TableHead className="font-bold min-w-[250px]">{t("Material Name & Specs")}</TableHead>
                      <TableHead className="w-[100px] text-center font-bold">{t("Unit")}</TableHead>
                      <TableHead className="w-[120px] text-right font-bold">{t("Quantity")}</TableHead>
                      <TableHead className="w-[100px] text-center font-bold">{t("Action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMaterials.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="h-32 text-center text-slate-500">{t("List is empty. Add items manually or Import Excel.")}</TableCell></TableRow>
                    ) : (
                      paginatedMaterials.map((item, index) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/50">
                          <TableCell className="text-center font-medium text-slate-500">{startIndex + index + 1}</TableCell>
                          <TableCell>
                              {item.isEditing ? (
                                <Input
                                  list="material-code-suggestions"
                                  value={item.code}
                                  onChange={(e) => updateCell(item.id, 'code', e.target.value)}
                                  className="h-8 border-indigo-200"
                                />
                              ) : (
                                <span className="font-medium text-slate-700">
                                  {item.code || "..."}
                                </span>
                              )}
                          </TableCell>
                          <TableCell>
                            {item.isEditing ? (
                              <Input
                                list="material-name-suggestions"
                                value={item.name}
                                onChange={(e) => updateCell(item.id, 'name', e.target.value)}
                                className="h-8 border-indigo-200"
                              />
                            ) : (
                              <span className="font-medium text-slate-700">
                                {item.name || "..."}
                              </span>
                            )}
                          </TableCell>                        
                          <TableCell className="text-center">{item.isEditing ? <Input value={item.unit} onChange={(e) => updateCell(item.id, 'unit', e.target.value)} className="h-8 text-center" /> : <span className="text-slate-600">{item.unit}</span>}</TableCell>
                          <TableCell className="text-right">{item.isEditing ? <Input type="number" min={1} value={item.qty} onChange={(e) => updateCell(item.id, 'qty', parseFloat(e.target.value) || 0)} className="h-8 text-right font-bold text-indigo-600" /> : <span className="font-bold text-slate-900">{item.qty}</span>}</TableCell>
                        
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              {item.isEditing ? (
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={() => handleSaveRow(item.id)}>
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50" onClick={() => toggleEdit(item.id)}>
                                  <PenLine className="w-4 h-4" />
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:bg-rose-50" onClick={() => deleteRow(item.id)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                   
                  </TableBody>
                </Table>
              </div>

              {materials.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-4 mt-auto">
                  <div className="text-sm text-slate-500">{t("Showing")} <span className="font-medium text-slate-900">{startIndex + 1}</span> {t("to")} <span className="font-medium text-slate-900">{Math.min(endIndex, materials.length)}</span> {t("of")} <span className="font-medium text-slate-900">{materials.length}</span></div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2"><span className="text-sm text-slate-500">{t("Rows per page:")}</span>
                      <Select value={itemsPerPage.toString()} onValueChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}>
                        <SelectTrigger className="h-8 w-[70px] bg-white border-slate-200"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="5">5</SelectItem><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem><SelectItem value="-1">{t("All")}</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="h-8"><ChevronLeft className="w-4 h-4" /></Button>
                      <div className="text-sm font-medium text-slate-600 px-2">{t("Page")} {currentPage} {t("of")} {totalPages}</div>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="h-8"><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-indigo-700"><FileSpreadsheet className="w-5 h-5" /> {t("Import Excel")}</DialogTitle></DialogHeader>
          <div className="py-6 flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 rounded-lg bg-indigo-50/50 hover:bg-indigo-50 transition-colors">
             <UploadCloud className="w-12 h-12 text-indigo-400 mb-3" />
             <p className="font-semibold text-slate-700 mb-1">{t("Click to upload or drag and drop file here")}</p>
             <p className="text-sm text-slate-500 mb-4">{t("Only supports .xls, .xlsx formats")}</p>
             <Button className="relative bg-indigo-600 hover:bg-indigo-700">
               {t("Choose Excel file")}
               <input type="file" ref={fileInputRef} accept=".xlsx, .xls" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
             </Button>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsImportModalOpen(false)}>{t("Cancel")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}