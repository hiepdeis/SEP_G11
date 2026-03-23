"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  Loader2,
  FileWarning,
  CalendarDays,
  Receipt,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  PackageX,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  managerIncidentApi,
  purchasingIncidentApi, // Thêm dòng này
  ManagerIncidentDetailDto,
  PurchasingIncidentDetailDto, // Thêm dòng này
} from "@/services/import-service";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { formatPascalCase } from "@/lib/format-pascal-case";

type IncidentDetail = ManagerIncidentDetailDto | PurchasingIncidentDetailDto;

export default function IncidentDetailPage({
  role = "manager",
}: {
  role?: "manager" | "purchase";
}) {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [tablePage, setTablePage] = useState(1);
  const tableItemsPerPage = 5;

  // Modal State (Dành cho Manager)
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveNotes, setApproveNotes] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    const fetchIncidentDetail = async () => {
      setIsLoading(true);
      try {
        let res;
        if (role === "purchase") {
          res = await purchasingIncidentApi.getIncidentDetail(id);
        } else {
          res = await managerIncidentApi.getIncidentDetail(id);
        }
        setIncident(res.data);
      } catch (error: any) {
        console.error(`Failed to fetch incident detail for ${role}`, error);
        toast.error(
          error.response?.data?.message || t("Incident report not found."),
        );

        // Return back based on role
        if (role === "purchase") {
          router.push("/purchasing/incident-reports");
        } else {
          router.push("/manager/incident-reports");
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchIncidentDetail();
  }, [id, router, t, role]);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await managerIncidentApi.approveIncident(id, {
        notes: approveNotes.trim() || undefined,
      });

      toast.success(t("Incident approved successfully. Sent to Purchasing."));
      setIsApproveModalOpen(false);

      router.push("/manager/incident-reports");
    } catch (error: any) {
      console.error(error);
      toast.error(
        error.response?.data?.message || t("Failed to approve incident."),
      );
    } finally {
      setIsApproving(false);
    }
  };

  const handleProcessPurchasing = () => {
    router.push(`/purchasing/incident-reports/${id}/process`);
  };

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "dd/MM/yyyy HH:mm");
  };

  if (isLoading || !incident) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-2 text-indigo-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">
            {t("Loading incident details...")}
          </p>
        </div>
      </div>
    );
  }

  // Define pending conditions based on role
  const isManagerPending =
    role === "manager" && incident.status === "PendingManagerReview";
  const isPurchasingPending =
    role === "purchase" && incident.status === "PendingPurchasingAction";

  const totalTableItems = incident.items.length;
  const totalTablePages = Math.ceil(totalTableItems / tableItemsPerPage) || 1;
  const startTableIndex = (tablePage - 1) * tableItemsPerPage;
  const paginatedItems = incident.items.slice(
    startTableIndex,
    startTableIndex + tableItemsPerPage,
  );

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("Incident Details")} #${incident.incidentCode}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6 mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => {
                  if (role === "purchase") {
                    router.push("/purchasing/incident-reports");
                  } else {
                    router.push("/manager/incident-reports");
                  }
                }}
                className="pl-0 hover:bg-transparent hover:text-indigo-600 w-fit"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back to List")}
              </Button>
              <div className="hidden md:flex items-center gap-3 border-l border-slate-200 pl-4">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {t("Incident Report")}
                </h1>
                <Badge
                  className={
                    isManagerPending || isPurchasingPending
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                      : "bg-indigo-100 text-indigo-700 hover:bg-indigo-100"
                  }
                >
                  {role === "purchase" && isPurchasingPending
                    ? t("Pending Action")
                    : t(formatPascalCase(incident.status))}
                </Badge>
              </div>
            </div>

            {/* ACTION BUTTONS BASED ON ROLE */}
            {isManagerPending && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                onClick={() => setIsApproveModalOpen(true)}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {t("Approve & Forward to Purchasing")}
              </Button>
            )}

            {isPurchasingPending && (
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                onClick={handleProcessPurchasing}
              >
                {t("Handle Incident")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CỘT TRÁI: THÔNG TIN CHUNG */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-slate-200 shadow-sm bg-white gap-0 pb-0">
                <CardHeader className="border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    {t("General Information")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Incident Code")}
                    </span>
                    <div className="flex items-center gap-2 text-amber-700 font-medium bg-amber-50 w-fit px-2 py-1 rounded border border-amber-100">
                      <FileWarning className="w-4 h-4 text-amber-500" />
                      {incident.incidentCode}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Related Receipt")}
                    </span>
                    <div className="flex items-center gap-2 text-indigo-700 font-medium bg-indigo-50 w-fit px-2 py-1 rounded border border-indigo-100">
                      <Receipt className="w-4 h-4 text-indigo-500" />
                      {incident.receiptCode || `#${incident.receiptId}`}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Reported At")}
                    </span>
                    <div className="flex items-center gap-2 text-slate-700 text-md">
                      <CalendarDays className="w-4 h-4 text-slate-400" />
                      {formatDateTime(incident.createdAt)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm gap-0 pb-0">
                <CardHeader className="border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-amber-800">
                    <MessageSquare className="w-5 h-5 text-amber-600" />
                    {t("Staff Description")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-bold">
                    "
                    {incident.description ||
                      t("No general description provided.")}
                    "
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* CỘT PHẢI: DANH SÁCH VẬT TƯ LỖI */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-slate-200 shadow-sm bg-white flex flex-col min-h-[500px] gap-0">
                <CardHeader className="border-b border-slate-100 py-4 flex flex-row items-center justify-between shrink-0">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 pb-3">
                    <PackageX className="w-5 h-5 text-rose-600" />
                    {t("Defective Materials List")}
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="bg-slate-100 text-slate-700"
                  >
                    {totalTableItems} {t("Items")}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
                  <div className="[&>div]:max-h-[500px] [&>div]:min-h-[500px] [&>div]:overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-[35%] pl-6">
                            {t("Material")}
                          </TableHead>
                          <TableHead className="w-[15%] text-center text-emerald-700">
                            {t("Passed")}
                          </TableHead>
                          <TableHead className="w-[15%] text-center text-rose-700 font-bold">
                            {t("Failed")}
                          </TableHead>
                          <TableHead className="w-[35%] pr-6">
                            {t("Staff Reason")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedItems.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="h-32 text-center text-slate-500"
                            >
                              {t("No items found.")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedItems.map((item, idx) => (
                            <TableRow key={idx} className="hover:bg-slate-50">
                              <TableCell className="pl-6 py-4 align-top">
                                <p className="text-sm font-semibold text-slate-800">
                                  {item.materialName ||
                                    `Item #${item.materialId}`}
                                </p>
                              </TableCell>
                              <TableCell className="text-center align-top pt-4 font-medium text-emerald-600">
                                {item.passQuantity}
                              </TableCell>
                              <TableCell className="text-center align-top pt-4">
                                <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
                                  {item.failQuantity}
                                </Badge>
                              </TableCell>
                              <TableCell className="pr-6 align-top pt-4">
                                <p className="text-sm text-slate-600 italic">
                                  {item.failReason || t("No specific reason")}
                                </p>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* --- THANH ĐIỀU HƯỚNG PHÂN TRANG --- */}
                  {totalTablePages > 1 && (
                    <div className="px-6 py-3 flex items-center justify-between border-t border-slate-100 bg-slate-50/50 shrink-0 mt-auto">
                      <span className="text-xs text-slate-500">
                        {t("Showing")} {startTableIndex + 1}-
                        {Math.min(
                          startTableIndex + tableItemsPerPage,
                          totalTableItems,
                        )}{" "}
                        {t("of")} {totalTableItems}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() =>
                            setTablePage((p) => Math.max(1, p - 1))
                          }
                          disabled={tablePage === 1}
                        >
                          <ChevronLeft className="w-3 h-3 mr-1" /> {t("Prev")}
                        </Button>
                        <span className="text-xs font-medium text-slate-600 w-10 text-center">
                          {tablePage} / {totalTablePages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() =>
                            setTablePage((p) =>
                              Math.min(totalTablePages, p + 1),
                            )
                          }
                          disabled={tablePage === totalTablePages}
                        >
                          {t("Next")} <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL APPROVE INCIDENT (Dành riêng cho Manager) */}
      {isApproveModalOpen && role === "manager" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <Card className="w-full max-w-md shadow-lg border-0 animate-in zoom-in-95 duration-200 gap-0">
            <CardHeader className="rounded-t-xl pt-4 border-b border-slate-100">
              <CardTitle className="text-emerald-700 flex items-center gap-2 text-lg">
                <CheckCircle2 className="w-5 h-5" />
                {t("Approve Incident")}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-6 space-y-4">
              <p className="text-sm text-slate-700">
                {t(
                  "You are about to approve this incident report. It will be forwarded to the Purchasing Team to arrange supplementary goods or refunds.",
                )}
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {t("Manager Notes (Optional)")}
                </label>
                <Textarea
                  placeholder={t("Add instructions for the purchasing team...")}
                  className="min-h-[100px] resize-none focus-visible:ring-emerald-500 mt-4"
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  autoFocus
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3 p-4 border-t border-slate-100 pb-0">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsApproveModalOpen(false);
                  setApproveNotes("");
                }}
                className="text-slate-600"
                disabled={isApproving}
              >
                {t("Cancel")}
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isApproving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isApproving && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {t("Confirm Approval")}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
