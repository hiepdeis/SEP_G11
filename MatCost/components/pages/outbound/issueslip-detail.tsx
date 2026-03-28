"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { issueSlipApi, IssueSlipDetail } from "@/services/issueslip-service";
import axiosClient from "@/lib/axios-client";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  PackageSearch,
  ClipboardList,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type UserRole = "admin" | "manager" | "accountant" | "staff" | "construction";

interface IssueSlipDetailProps {
  role: UserRole;
  issueId: number;
}

export default function SharedIssueSlipDetail({
  role,
  issueId,
}: IssueSlipDetailProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [detail, setDetail] = useState<IssueSlipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  useEffect(() => {
    if (!issueId) return;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const data = await issueSlipApi.getIssueSlipDetail(issueId);
        setDetail(data);
      } catch (error) {
        toast.error(t("Không thể tải chi tiết phiếu xuất."));
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [issueId, t]);

  const handleReview = async (action: "Approved" | "Rejected") => {
    let reason = "";
    if (action === "Rejected") {
      reason = prompt(t("Reason *")) || "";
      if (!reason.trim()) return;
    }
    try {
      setReviewing(true);
      await axiosClient.put(`/IssueSlips/${issueId}/review`, {
        action,
        reason,
      });
      toast.success(action === "Approved" ? t("Approved") : t("Rejected"));
      const data = await issueSlipApi.getIssueSlipDetail(issueId);
      setDetail(data);
    } catch (err) {
      toast.error(t("Có lỗi xảy ra khi gửi yêu cầu."));
    } finally {
      setReviewing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s === "approved")
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-none px-3 py-1">
          <CheckCircle2 className="w-4 h-4 mr-1.5" /> {t("Approved")}
        </Badge>
      );
    if (s === "rejected")
      return (
        <Badge className="bg-rose-100 text-rose-800 border-none px-3 py-1">
          <XCircle className="w-4 h-4 mr-1.5" /> {t("Rejected")}
        </Badge>
      );
    if (s === "pending")
      return (
        <Badge className="bg-amber-100 text-amber-800 border-none px-3 py-1">
          <AlertCircle className="w-4 h-4 mr-1.5" /> {t("Pending")}
        </Badge>
      );
    return (
      <Badge
        variant="secondary"
        className="bg-slate-100 text-slate-700 border-none px-3 py-1"
      >
        {t(status)}
      </Badge>
    );
  };

  const formatWorkItem = (code?: string) => {
    if (code === "foundation") return t("Foundation");
    if (code === "body") return t("Body");
    if (code === "roof") return t("Roof");
    return code || t("N/A");
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2 text-indigo-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">
            {t("Loading issue slip details...")}
          </p>
        </div>
      </div>
    );
  }

  if (!detail)
    return <div className="p-10 text-center">{t("Issue Slip not found")}</div>;

  const detailsList = detail.details || [];
  const isAll = itemsPerPage === -1;
  const totalPages = isAll
    ? 1
    : Math.ceil(detailsList.length / itemsPerPage) || 1;
  const startIndex =
    (currentPage - 1) * (isAll ? detailsList.length : itemsPerPage);
  const endIndex = isAll ? detailsList.length : startIndex + itemsPerPage;
  const paginatedDetails = detailsList.slice(startIndex, endIndex);

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("Issue Slip")} #${detail.issueCode}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="pl-0 hover:bg-transparent hover:text-indigo-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back")}
            </Button>
            {getStatusBadge(detail.status)}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <Card className="border-slate-200 shadow-sm gap-0 flex flex-col min-h-[400px]">
                <CardHeader className="bg-white border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <PackageSearch className="w-5 h-5 text-indigo-600" />{" "}
                    {t("Requested Materials")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 bg-white flex flex-col justify-between flex-1">
                  <div className="overflow-x-auto relative">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50">
                          <TableHead className="w-[60px] text-center pl-4">
                            {t("No.")}
                          </TableHead>
                          <TableHead>{t("Material Name")}</TableHead>
                          <TableHead className="text-center">
                            {t("Unit")}
                          </TableHead>
                          <TableHead className="text-right">
                            {t("Requested Qty")}
                          </TableHead>
                          <TableHead className="text-right">
                            {t("Current Stock")}
                          </TableHead>
                          <TableHead className="text-center">
                            {t("Availability")}
                          </TableHead>
                          <TableHead className="pr-6">{t("Notes")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedDetails.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="h-32 text-center text-slate-500"
                            >
                              {t("No materials found in this request.")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedDetails.map((item, index) => (
                            <TableRow
                              key={item.detailId}
                              className="hover:bg-slate-50/50"
                            >
                              <TableCell className="text-center font-medium text-slate-500 pl-4">
                                {startIndex + index + 1}
                              </TableCell>
                              <TableCell className="font-medium text-slate-700">
                                {item.materialName}
                              </TableCell>
                              <TableCell className="text-center text-slate-500">
                                {item.unit}
                              </TableCell>
                              <TableCell className="text-right font-bold text-slate-900">
                                {item.requestedQty}
                              </TableCell>
                              <TableCell className="text-right text-slate-500">
                                {item.totalStock}
                              </TableCell>
                              <TableCell className="text-center">
                                {item.isEnough ? (
                                  <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 font-normal">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />{" "}
                                    {t("Enough")}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-rose-50 text-rose-600 border-rose-200 font-normal">
                                    <XCircle className="w-3 h-3 mr-1" />{" "}
                                    {t("Shortage")}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-slate-500 pr-6">
                                {item.message || "—"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {detailsList.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-4 mt-auto">
                      <div className="text-sm text-slate-500">
                        {t("Showing")}{" "}
                        <span className="font-medium text-slate-900">
                          {startIndex + 1}
                        </span>{" "}
                        {t("to")}{" "}
                        <span className="font-medium text-slate-900">
                          {Math.min(endIndex, detailsList.length)}
                        </span>{" "}
                        {t("of")}{" "}
                        <span className="font-medium text-slate-900">
                          {detailsList.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-500">
                            {t("Rows per page:")}
                          </span>
                          <Select
                            value={itemsPerPage.toString()}
                            onValueChange={(val) => {
                              setItemsPerPage(Number(val));
                              setCurrentPage(1);
                            }}
                          >
                            <SelectTrigger className="h-8 w-[70px] bg-white border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5</SelectItem>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="20">20</SelectItem>
                              <SelectItem value="-1">{t("All")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentPage((prev) => Math.max(prev - 1, 1))
                            }
                            disabled={currentPage === 1}
                            className="h-8"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <div className="text-sm font-medium text-slate-600 px-2">
                            {t("Page")} {currentPage} {t("of")} {totalPages}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentPage((prev) =>
                                Math.min(prev + 1, totalPages),
                              )
                            }
                            disabled={currentPage === totalPages}
                            className="h-8"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-slate-200 shadow-sm gap-0">
                <CardHeader className="border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />{" "}
                    {t("Slip Information")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-2 gap-y-4 gap-x-2">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("Project / Construction")}
                    </label>
                    <div className="mt-1 font-bold text-indigo-700">
                      {detail.projectName || t("N/A")}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("Work Item")}
                    </label>
                    <div className="mt-1 text-slate-800 font-medium">
                      {formatWorkItem(detail.workItem)}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("Reference Code")}
                    </label>
                    <div className="mt-1 text-slate-800">
                      {detail.referenceCode || "—"}
                    </div>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-100">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("Requester")}
                    </label>
                    <div className="mt-1 text-slate-800 flex items-center gap-1.5 font-medium">
                      <User className="w-4 h-4 text-slate-400" />{" "}
                      {detail.createdByName}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("Department")}
                    </label>
                    <div className="mt-1 text-slate-800">
                      {detail.department || "—"}
                    </div>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-100">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("Delivery Location")}
                    </label>
                    <div className="mt-1 text-slate-800 font-medium text-sm leading-relaxed">
                      {detail.deliveryLocation || "—"}
                    </div>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-100">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("Creation Date")}
                    </label>
                    <div className="mt-1 text-slate-800 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />{" "}
                      {detail.issueDate
                        ? new Date(detail.issueDate).toLocaleString("vi-VN")
                        : t("N/A")}
                    </div>
                  </div>
                  {detail.description && (
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {t("Notes")}
                      </label>
                      <p className="text-sm text-slate-700 mt-1 bg-amber-50/50 p-3 rounded-md border border-amber-100 italic">
                        {detail.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {role === "manager" && detail.status === "Pending" && (
                <Card className="border-indigo-200 shadow-sm bg-indigo-50/30 gap-0">
                  <CardHeader className="border-b border-indigo-100 pt-4 pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-indigo-800">
                      <ClipboardList className="w-5 h-5" />{" "}
                      {t("Manager Approval")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 flex flex-col gap-3">
                    <p className="text-sm text-indigo-700/80 mb-2">
                      {t(
                        "Please review the requested quantities against current stock before approving.",
                      )}
                    </p>
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm h-11"
                      onClick={() => handleReview("Approved")}
                      disabled={reviewing}
                    >
                      {reviewing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}{" "}
                      {t("Approve Slip")}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 h-11"
                      onClick={() => handleReview("Rejected")}
                      disabled={reviewing}
                    >
                      <XCircle className="w-4 h-4 mr-2" /> {t("Reject")}
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
