"use client";
import { useParams, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Wallet, Truck, Building2, CheckCircle2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AccountingReconciliationDto, issueSlipApi } from "@/services/issueslip-service";
// Chú ý import hàm formatMoney từ thư viện của bác
import { formatMoney } from "@/lib/master-data-utils";

export default function AccountantReconciliation() {
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
    
    try {
      setSubmitting(true);
      // Gọi API POST để đóng phiếu (Bác nhớ tạo hàm này trong issueSlipApi nhé)
      await issueSlipApi.finalizeAccounting(issueId, {
        voucherNo: voucherNo,
        accountingDate: accountingDate,
        finalTotalAmount: data?.totalFinalCost 
      });
      
      toast.success("Tuyệt vời! Đã hạch toán và chốt sổ thành công.");
      router.push("/issueslips"); // Quay về danh sách
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi chốt sổ.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 text-indigo-600">
        <Loader2 className="w-8 h-8 animate-spin mr-2" /> Đang tải dữ liệu tài chính...
      </div>
    );
  }

  if (!data) return <div className="p-10 text-center text-slate-500">Không tìm thấy thông tin đối soát.</div>;

  // Tính % để vẽ Progress Bar an toàn (tránh chia cho 0)
  const budgetPercentage = data.projectBudgetTotal > 0 
    ? Math.min(100, (data.projectBudgetUsedAfter / data.projectBudgetTotal) * 100) 
    : 0;

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen">
    
      {/* 1. HEADER & THÔNG TIN DỰ ÁN */}
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-slate-800">Đối soát & Hạch toán Phiếu #{data.parentIssueCode}</h2>
        <p className="text-slate-500">Dự án: <span className="font-semibold text-slate-700">{data.projectName}</span></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* THẺ TÁC ĐỘNG NGÂN SÁCH */}
        <Card className="md:col-span-2 border-indigo-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="w-5 h-5 text-indigo-600" /> Tác động Ngân sách Dự án
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Progress */}
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Tiến độ sử dụng ngân sách ({formatMoney(data.projectBudgetTotal)})</span>
                <span className={`font-bold ${budgetPercentage > 100 ? 'text-rose-600' : 'text-indigo-700'}`}>
                  {Math.round(budgetPercentage)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${budgetPercentage > 100 ? 'bg-rose-500' : 'bg-indigo-600'}`}
                  style={{ width: `${budgetPercentage}%` }}
                />
              </div>

              {/* Numbers */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-bold">Hiện tại</p>
                  <p className="font-bold text-slate-700">
                    {formatMoney(data.projectBudgetUsedBefore)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-bold">Chi phí phiếu này</p>
                  <p className="font-bold text-rose-600">
                    + {formatMoney(data.totalFinalCost)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-bold">Sau khi chốt</p>
                  <p className="font-bold text-indigo-700">
                    {formatMoney(data.projectBudgetUsedAfter)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* THẺ NHẬP CHỨNG TỪ (Bác quên đoạn này nãy) */}
        <Card className="border-emerald-100 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-emerald-800">
              <FileText className="w-5 h-5" /> Chứng từ hạch toán
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Số CT <span className="text-rose-500">*</span></label>
              <Input 
                value={voucherNo} 
                onChange={(e) => setVoucherNo(e.target.value)} 
                placeholder="VD: PK-2026-001" 
                className="mt-1 border-slate-300 focus-visible:ring-emerald-500" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Ngày HT</label>
              <Input 
                type="date" 
                value={accountingDate} 
                onChange={(e) => setAccountingDate(e.target.value)} 
                className="mt-1 border-slate-300 focus-visible:ring-emerald-500" 
              />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* 2. CHI TIẾT ĐỐI SOÁT */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-800">
          Chi tiết đối soát vật tư & công nợ
        </h3>

        {data.childSlips.map((slip) => (
          <Card key={slip.slipId} className={`border overflow-hidden ${slip.slipType === "Direct_PO" ? 'border-amber-200' : 'border-indigo-200'}`}>
            
            {/* Header của từng phiếu */}
            <div className={`px-4 py-3 border-b flex justify-between items-center ${slip.slipType === "Direct_PO" ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50 border-indigo-200'}`}>
              <div className="flex items-center gap-3">
                {slip.slipType === "Direct_PO" ? (
                  <Truck className="w-5 h-5 text-amber-600" />
                ) : (
                  <Building2 className="w-5 h-5 text-indigo-600" />
                )}
                <span className={`font-bold ${slip.slipType === "Direct_PO" ? 'text-amber-900' : 'text-indigo-900'}`}>
                  {slip.slipType === "Direct_PO" ? "MUA NGOÀI: " : "XUẤT KHO NỘI BỘ: "}
                  {slip.slipCode}
                </span>
              </div>
              <Badge className={slip.slipType === "Direct_PO" ? 'bg-amber-100 text-amber-800 border-none' : 'bg-indigo-100 text-indigo-800 border-none'}>
                {slip.status}
              </Badge>
            </div>

            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Nhà cung cấp / Vật tư</TableHead>
                    <TableHead className="text-right">SL Thực Nhận</TableHead>
                    <TableHead className="text-right">Đơn giá chốt</TableHead>
                    <TableHead className="text-right w-[200px]">Thành tiền</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {/* CASE 1: MUA NGOÀI (Có Group theo NCC) */}
                  {slip.slipType === "Direct_PO" && slip.liabilities && slip.liabilities.length > 0 
                    ? slip.liabilities.map((supplier, idx) => (
                        <React.Fragment key={`supp-${idx}`}>
                          
                          {/* Dòng Tên Nhà cung cấp */}
                          <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                            <TableCell colSpan={4} className="font-bold text-indigo-700">
                              🏢 {supplier.supplierName}
                            </TableCell>
                          </TableRow>

                          {/* Danh sách vật tư của NCC này */}
                          {slip.details
                            .filter(d => d.supplierName === supplier.supplierName)
                            .map((d, i) => (
                              <TableRow key={`det-${i}`}>
                                <TableCell className="pl-8 text-slate-700 font-medium">
                                  {d.materialName}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {d.requestedQty} <span className="text-xs text-slate-500 font-normal">{d.unit}</span>
                                </TableCell>
                                <TableCell className="text-right text-slate-600">
                                  {formatMoney(d.finalUnitPrice)}
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-800">
                                  {formatMoney(d.lineTotal)}
                                </TableCell>
                              </TableRow>
                            ))}

                          {/* Tổng nợ của NCC */}
                          <TableRow className="bg-indigo-50/40 hover:bg-indigo-50/40">
                            <TableCell colSpan={3} className="text-right font-semibold text-indigo-900">
                              Tổng công nợ (Phải trả NCC):
                            </TableCell>
                            <TableCell className="text-right font-bold text-indigo-700 text-lg">
                              {formatMoney(supplier.amount)}
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      ))
                    : 
                    /* CASE 2: XUẤT KHO NỘI BỘ (Không có NCC, in trơn ra thôi) */
                    (
                      <>
                        {slip.details.map((d, i) => (
                          <TableRow key={`int-${i}`}>
                            <TableCell className="font-medium text-slate-700">
                              {d.materialName}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {d.requestedQty} <span className="text-xs text-slate-500 font-normal">{d.unit}</span>
                            </TableCell>
                            <TableCell className="text-right text-slate-600">
                              {formatMoney(d.finalUnitPrice)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-800">
                              {formatMoney(d.lineTotal)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-emerald-50/40 hover:bg-emerald-50/40">
                          <TableCell colSpan={3} className="text-right font-semibold text-emerald-900">
                            Tổng giá trị xuất kho (Ghi nhận chi phí):
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-700 text-lg">
                            {formatMoney(slip.actualTotal)}
                          </TableCell>
                        </TableRow>
                      </>
                    )
                  }
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. NÚT ACTION CHỐT SỔ */}
      <div className="flex justify-end gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] sticky bottom-4 z-10">
        <Button variant="outline" onClick={() => router.back()} disabled={submitting}>
          Quay lại
        </Button>
        <Button 
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8"
          onClick={handleFinalize}
          disabled={submitting}
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="w-5 h-5 mr-2" />
          )}
          XÁC NHẬN HẠCH TOÁN & ĐÓNG PHIẾU
        </Button>
      </div>
    </div>
  );
}