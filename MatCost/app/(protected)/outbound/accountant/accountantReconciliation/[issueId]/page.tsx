"use client";
import { useParams, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Wallet, Truck, Building2, CheckCircle2, FileText, Loader2, ArrowLeft, Package, ClipboardList, Info, Landmark, Calculator, Receipt, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AccountingReconciliationDto, issueSlipApi } from "@/services/issueslip-service";
// Chú ý import hàm formatMoney từ thư viện của bác
import { formatMoney } from "@/lib/master-data-utils";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { useTranslation } from "react-i18next";

export default function AccountantReconciliation() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const issueId = Number(params?.issueId);
  
  const [data, setData] = useState<AccountingReconciliationDto | null>(null); 
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [voucherNo, setVoucherNo] = useState("");
  const [accountingDate, setAccountingDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!issueId) return;
    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await issueSlipApi.getAccountingReconciliation(issueId);
            setData(res);
        } catch (err) {
            console.error(err);
            toast.error("Không thể tải dữ liệu đối soát tài chính.");
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [issueId]);

  // HÀM CHỐT SỔ KẾ TOÁN
  const handleFinalize = async () => {
    if (!voucherNo.trim()) {
      return toast.error("Vui lòng nhập Số chứng từ kế toán!");
    }
    const currentSlipType = data?.childSlips?.[0]?.slipType;
    if (!currentSlipType) {
      return toast.error("Lỗi dữ liệu: Không xác định được loại phiếu!");
    }
    try {
      setSubmitting(true);
      // Gọi API POST để đóng phiếu (Bác nhớ tạo hàm này trong issueSlipApi nhé)
      await issueSlipApi.finalizeAccounting(issueId, {
        slipType: currentSlipType,
        voucherNo: voucherNo,
        accountingDate: accountingDate,
        finalTotalAmount: data?.totalFinalCost 
      });
      
      toast.success("Tuyệt vời! Đã hạch toán và chốt sổ thành công.");
      router.push("/outbound/common/IssueSlipList"); 
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi chốt sổ.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2 text-indigo-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">Đang tải dữ liệu tài chính...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
        <Sidebar />
        <main className="flex-grow flex flex-col items-center justify-center">
          <div className="text-slate-500 flex flex-col items-center gap-3">
            <Info className="w-12 h-12 text-slate-300" />
            <p className="text-lg font-medium">Không tìm thấy thông tin đối soát cho phiếu này.</p>
            <Button variant="outline" onClick={() => router.back()}>Quay lại</Button>
          </div>
        </main>
      </div>
    );
  }

  const budgetPercentage = data.projectBudgetTotal > 0 
    ? Math.min(100, (data.projectBudgetUsedAfter / data.projectBudgetTotal) * 100) 
    : 0;

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`Đối soát & Hạch toán #${data.parentIssueCode}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          {/* Action Header */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:bg-transparent hover:text-indigo-600">
              <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại danh sách
            </Button>
            <div className="flex items-center gap-2">
               <Badge className="bg-indigo-100 text-indigo-700 border-none font-bold uppercase tracking-wider text-[10px] px-2.5 py-1">
                  Accounting reconciliation
               </Badge>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-slate-100 text-slate-600 rounded-lg shrink-0">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng Ngân Sách</p>
                  <h3 className="text-lg font-bold text-slate-900">{formatMoney(data.projectBudgetTotal)}</h3>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Đã sử dụng</p>
                  <h3 className="text-lg font-bold text-slate-900">{formatMoney(data.projectBudgetUsedBefore)}</h3>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-lg shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Chi phí phiếu này</p>
                  <h3 className="text-lg font-bold text-amber-700">{formatMoney(data.totalFinalCost)}</h3>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Dự kiến sau chốt</p>
                  <h3 className="text-lg font-bold text-indigo-700">{formatMoney(data.projectBudgetUsedAfter)}</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Details */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Budget Progress Card */}
              <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-100 py-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                    <Wallet className="w-4 h-4 text-indigo-600" /> Tỉ lệ sử dụng ngân sách dự án
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                     <div className="flex justify-between text-sm mb-1 items-end">
                       <div>
                         <span className="text-slate-500 font-medium">Tiến độ sử dụng ngân sách</span>
                       </div>
                       <span className={`font-black text-lg ${budgetPercentage > 100 ? 'text-rose-600' : 'text-indigo-700'}`}>
                         {budgetPercentage.toFixed(1)}%
                       </span>
                     </div>
                     <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden p-0.5 border border-slate-200">
                       <div
                         className={`h-full rounded-full transition-all duration-700 ease-out shadow-sm ${budgetPercentage > 100 ? 'bg-gradient-to-r from-rose-400 to-rose-600' : 'bg-gradient-to-r from-indigo-400 to-indigo-600'}`}
                         style={{ width: `${budgetPercentage}%` }}
                       />
                     </div>
                     {budgetPercentage > 90 && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                           <Info className="w-4 h-4 text-amber-600 shrink-0" />
                           <p className="text-xs text-amber-700 font-medium leading-relaxed">
                             Cảnh báo: Ngân sách dự án đã đạt ngưỡng cao ({budgetPercentage.toFixed(1)}%). Vui lòng kiểm tra kỹ trước khi chốt hạch toán.
                           </p>
                        </div>
                     )}
                  </div>
                </CardContent>
              </Card>

              {/* Child Slips Details */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 pl-1">
                  <Package className="w-5 h-5 text-indigo-600" /> Chi tiết đối soát vật tư & công nợ
                </h3>

                {data.childSlips.map((slip) => (
                  <Card key={slip.slipId} className="border-slate-200 shadow-sm overflow-hidden flex flex-col gap-0 pb-0 bg-white">
                    <CardHeader className={`border-b py-4 flex flex-row justify-between items-center ${slip.slipType === "Direct_PO" ? 'bg-amber-50/50 border-amber-100' : 'bg-indigo-50/50 border-indigo-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${slip.slipType === "Direct_PO" ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                          {slip.slipType === "Direct_PO" ? <Truck className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none mb-1">
                            {slip.slipType === "Direct_PO" ? "Mua ngoài (DPO)" : "Xuất kho nội bộ (IIS)"}
                          </span>
                          <span className={`font-bold ${slip.slipType === "Direct_PO" ? 'text-amber-900' : 'text-indigo-900'}`}>
                            {slip.slipCode}
                          </span>
                        </div>
                      </div>
                      <Badge className={slip.slipType === "Direct_PO" ? 'bg-amber-100 text-amber-800 border-none hover:bg-amber-200' : 'bg-indigo-100 text-indigo-800 border-none hover:bg-indigo-200'}>
                        {slip.status}
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table className="table-fixed">
                        <TableHeader className="bg-slate-50/80">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="pl-6 w-[40%] font-bold text-slate-800 uppercase text-[10px] tracking-wider">Nhà cung cấp / Vật tư</TableHead>
                            <TableHead className="text-right w-[15%] font-bold text-slate-800 uppercase text-[10px] tracking-wider">SL Thực Nhận</TableHead>
                            <TableHead className="text-right w-[20%] font-bold text-slate-800 uppercase text-[10px] tracking-wider">Đơn giá chốt</TableHead>
                            <TableHead className="text-right pr-6 w-[25%] font-bold text-slate-800 uppercase text-[10px] tracking-wider">Thành tiền</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {slip.slipType === "Direct_PO" && slip.liabilities && slip.liabilities.length > 0 
                            ? slip.liabilities.map((supplier, idx) => (
                                <React.Fragment key={`supp-${idx}`}>
                                  <TableRow className="bg-slate-50/40 hover:bg-slate-50/40 border-t border-slate-100">
                                    <TableCell colSpan={4} className="pl-6 py-2">
                                       <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wide">
                                          <Building2 className="w-3.5 h-3.5" /> {supplier.supplierName}
                                       </div>
                                    </TableCell>
                                  </TableRow>
                                  {slip.details
                                    .filter(d => d.supplierName === supplier.supplierName)
                                    .map((d, i) => (
                                      <TableRow key={`det-${i}`} className="border-none hover:bg-slate-50/30">
                                        <TableCell className="pl-10 text-sm font-medium text-slate-700 truncate" title={d.materialName}>
                                          {d.materialName}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-slate-600 text-sm">
                                          {d.requestedQty} <span className="text-[10px] text-slate-400 font-normal ml-0.5 uppercase">{d.unit}</span>
                                        </TableCell>
                                        <TableCell className="text-right text-slate-500 font-medium text-sm">
                                          {formatMoney(d.finalUnitPrice)}
                                        </TableCell>
                                        <TableCell className="text-right pr-6 font-bold text-slate-800 text-sm">
                                          {formatMoney(d.lineTotal)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  <TableRow className="hover:bg-transparent border-t border-indigo-50">
                                    <TableCell colSpan={3} className="text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                      CÔNG NỢ NCC {supplier.supplierName}:
                                    </TableCell>
                                    <TableCell className="text-right pr-6 py-3">
                                      <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 text-base">
                                        {formatMoney(supplier.amount)}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                </React.Fragment>
                              ))
                            : slip.details.map((d, i) => (
                                <TableRow key={`int-${i}`} className="hover:bg-slate-50/30">
                                  <TableCell className="pl-6 text-sm font-medium text-slate-700">
                                    {d.materialName}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-slate-600 text-sm">
                                    {d.requestedQty} <span className="text-[10px] text-slate-400 font-normal ml-0.5 uppercase">{d.unit}</span>
                                  </TableCell>
                                  <TableCell className="text-right text-slate-500 font-medium text-sm">
                                    {formatMoney(d.finalUnitPrice)}
                                  </TableCell>
                                  <TableCell className="text-right pr-6 font-bold text-slate-800 text-sm">
                                    {formatMoney(d.lineTotal)}
                                  </TableCell>
                                </TableRow>
                              ))
                          }
                        </TableBody>
                      </Table>
                      {!slip.liabilities?.length && (
                        <div className="bg-emerald-50/50 p-4 border-t border-emerald-100 flex justify-between items-center">
                           <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                             <CheckCircle2 className="w-4 h-4" /> Giá trị xuất kho nội bộ
                           </span>
                           <span className="text-xl font-black text-emerald-800">
                             {formatMoney(slip.actualTotal)}
                           </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Right Column: Actions & Summary */}
            <div className="space-y-6">
              {/* Project Card */}
              <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-100 py-4">
                  <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-600" /> Thông tin dự án
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                   <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Tên dự án</label>
                     <div className="text-sm font-bold text-slate-800 leading-tight p-3 bg-slate-50 rounded-lg border border-slate-100">
                       {data.projectName}
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Mã Phiếu Gốc</label>
                        <p className="text-sm font-bold text-slate-700">{data.parentIssueCode}</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">ID Hệ thống</label>
                        <p className="text-sm font-medium text-slate-500">#{data.parentIssueId}</p>
                      </div>
                   </div>
                </CardContent>
              </Card>

              {/* Voucher Form Card */}
              <Card className="border-slate-200 shadow-xl bg-white overflow-hidden ring-1 ring-emerald-500/10">
                <CardHeader className="border-b border-emerald-100 bg-emerald-50/30 py-4">
                  <CardTitle className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Chứng từ hạch toán
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                        Số chứng từ kế toán <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <Input 
                        value={voucherNo} 
                        onChange={(e) => setVoucherNo(e.target.value)} 
                        placeholder="VD: PK-2026-0089" 
                        className="border-slate-200 h-11 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 font-semibold text-slate-700 shadow-sm" 
                      />
                      <p className="text-[10px] text-slate-400 mt-1.5">Mã số này sẽ được lưu vào hệ thống kế toán nội bộ.</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                        Ngày hạch toán
                      </label>
                      <Input 
                        type="date" 
                        value={accountingDate} 
                        onChange={(e) => setAccountingDate(e.target.value)} 
                        className="border-slate-200 h-11 focus-visible:ring-emerald-500 font-medium text-slate-700" 
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 mt-4 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                       <span className="text-slate-500 font-medium font-sans">Tổng giá trị hạch toán:</span>
                       <span className="text-xl font-black text-rose-600">{formatMoney(data.totalFinalCost)}</span>
                    </div>
                    
                    <Button 
                      className={`w-full h-12 font-black text-base shadow-lg transition-all duration-300 ${submitting ? 'bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-emerald-200 hover:-translate-y-0.5 active:translate-y-0'}`}
                      onClick={handleFinalize}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 mr-3" />
                      )}
                      XÁC NHẬN & CHỐT PHIẾU
                    </Button>
                    <p className="text-[9px] text-center text-slate-400 uppercase font-bold tracking-widest leading-relaxed">
                      Lưu ý: Hành động này sẽ đóng phiếu vĩnh viễn và cập nhật sổ cái kế toán
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Status Info */}
              <div className="p-4 bg-slate-100/50 rounded-xl border border-slate-200 flex items-start gap-3">
                 <div className="p-2 bg-white rounded-lg shadow-sm">
                   <Truck className="w-4 h-4 text-slate-400" />
                 </div>
                 <div>
                   <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái hiện tại</h4>
                   <p className="text-sm font-bold text-slate-700">Awaiting Finalization</p>
                 </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}