"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { issueSlipApi, IssueSlipDetail } from "@/services/issueslip-service";
import axiosClient from "@/lib/axios-client";
import {
  ArrowLeft, Calendar, Loader2, PackageSearch, ClipboardList,
  CheckCircle2, XCircle, AlertCircle, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type UserRole = "admin" | "manager" | "accountant" | "staff" | "construction";

interface IssueSlipDetailProps {
  role: UserRole;
  issueId: number;
}

export default function SharedIssueSlipDetail({ role, issueId }: IssueSlipDetailProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<IssueSlipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (!issueId) return;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const data = await issueSlipApi.getIssueSlipDetail(issueId);
        setDetail(data);
      } catch (error) {
        console.error(error);
        toast.error("Không thể tải chi tiết phiếu xuất.");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [issueId]);

  const handleReview = async (action: "Approved" | "Rejected") => {
    let reason = "";
    if (action === "Rejected") {
      reason = prompt("Nhập lý do từ chối:") || "";
      if (!reason.trim()) return;
    }
    
    try {
      setReviewing(true);
      await axiosClient.put(`/IssueSlips/${issueId}/review`, { action, reason });
      toast.success(action === "Approved" ? "Đã duyệt phiếu xuất!" : "Đã từ chối phiếu xuất!");
      
      // Reload lại data thay vì load lại toàn bộ trang
      const data = await issueSlipApi.getIssueSlipDetail(issueId);
      setDetail(data);
    } catch (err) {
      toast.error("Có lỗi khi duyệt phiếu!");
    } finally {
      setReviewing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s === "approved") return <Badge className="bg-emerald-100 text-emerald-800 border-none"><CheckCircle2 className="w-4 h-4 mr-1.5" /> {status}</Badge>;
    if (s === "rejected") return <Badge className="bg-rose-100 text-rose-800 border-none"><XCircle className="w-4 h-4 mr-1.5" /> {status}</Badge>;
    if (s === "pending") return <Badge className="bg-amber-100 text-amber-800 border-none"><AlertCircle className="w-4 h-4 mr-1.5" /> {status}</Badge>;
    return <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-none">{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2 text-indigo-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">Loading issue slip details...</p>
        </div>
      </div>
    );
  }

  if (!detail) return <div className="p-10 text-center">Issue Slip not found</div>;

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`Issue Slip #${detail.issueCode}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:bg-transparent hover:text-indigo-600">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
            </Button>
            {getStatusBadge(detail.status)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN: Data Table (2/3) */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-slate-200 shadow-sm overflow-hidden gap-0">
                <CardHeader className="bg-white border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <PackageSearch className="w-5 h-5 text-indigo-600" /> Requested Materials
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="pl-6">Material Name</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Requested Qty</TableHead>
                        <TableHead className="text-right">Current Stock</TableHead>
                        <TableHead className="text-center">Availability</TableHead>
                        <TableHead className="pr-6">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.details.map((item) => (
                        <TableRow key={item.detailId} className="hover:bg-slate-50/50">
                          <TableCell className="pl-6 font-medium text-slate-700">{item.materialName}</TableCell>
                          <TableCell className="text-slate-500">{item.unit}</TableCell>
                          <TableCell className="text-right font-bold text-slate-900">{item.requestedQty}</TableCell>
                          <TableCell className="text-right text-slate-500">{item.totalStock}</TableCell>
                          <TableCell className="text-center">
                            {item.isEnough ? (
                              <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 font-normal"><CheckCircle2 className="w-3 h-3 mr-1" /> Enough</Badge>
                            ) : (
                              <Badge className="bg-rose-50 text-rose-600 border-rose-200 font-normal"><XCircle className="w-3 h-3 mr-1" /> Shortage</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 pr-6">{item.message || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN: Info & Actions (1/3) */}
            <div className="space-y-6">
              <Card className="border-slate-200 shadow-sm gap-0">
                <CardHeader className="border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                     <FileText className="w-5 h-5 text-indigo-600" /> Slip Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project ID</label>
                    <div className="mt-1 font-medium text-slate-800">{detail.projectName || "N/A"}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Created By</label>
                    <div className="mt-1 text-slate-800">{detail.createdByName}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Creation Date</label>
                    <div className="mt-1 text-slate-800 flex items-center gap-1.5">
                       <Calendar className="w-4 h-4 text-slate-400" /> {new Date(detail.issueDate).toLocaleString("vi-VN")}
                    </div>
                  </div>
                  {detail.description && (
                    <div>
                       <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</label>
                       <p className="text-sm text-slate-700 mt-1 bg-slate-50 p-3 rounded-md border border-slate-100">{detail.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Box for Manager */}
              {role === "manager" && detail.status === "Pending" && (
                <Card className="border-indigo-200 shadow-sm bg-indigo-50/30 gap-0">
                  <CardHeader className="border-b border-indigo-100 pt-4 pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-indigo-800">
                      <ClipboardList className="w-5 h-5" /> Manager Approval
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 flex flex-col gap-3">
                    <p className="text-sm text-indigo-700/80 mb-2">
                      Please review the requested quantities against current stock before approving.
                    </p>
                    <Button 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm h-11"
                      onClick={() => handleReview("Approved")}
                      disabled={reviewing}
                    >
                      {reviewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      Approve Slip
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 h-11"
                      onClick={() => handleReview("Rejected")}
                      disabled={reviewing}
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}