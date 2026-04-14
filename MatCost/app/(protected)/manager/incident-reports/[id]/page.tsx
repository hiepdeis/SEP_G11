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
  User,
  PackagePlus,
  AlertCircle,
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
  ManagerIncidentDetailDto,
  ManagerSupplementaryReceiptDto,
} from "@/services/import-service";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { formatPascalCase } from "@/lib/format-pascal-case";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageGallery } from "@/components/ui/custom/image-gallery";
import { formatDateTime } from "@/lib/format-date-time";
import { formatQuantity } from "@/lib/format-quantity";

export default function ManagerIncidentDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [incident, setIncident] = useState<ManagerIncidentDetailDto | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  // States: Đơn đền bù
  const [supplementaryReceipt, setSupplementaryReceipt] =
    useState<ManagerSupplementaryReceiptDto | null>(null);
  const [isApprovingSupp, setIsApprovingSupp] = useState(false);
  const [suppApproveNotes, setSuppApproveNotes] = useState("");

  // States: Modal Từ chối Đơn đền bù
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // States: Modal Phê duyệt Sự cố ban đầu
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveNotes, setApproveNotes] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  // States: Pagination
  const [tablePage, setTablePage] = useState(1);
  const tableItemsPerPage = 5;

  useEffect(() => {
    const fetchIncidentDetail = async () => {
      setIsLoading(true);
      try {
        const res = await managerIncidentApi.getIncidentDetail(id);
        const data = res.data;
        // Filter out items with no failed items
        const filteredIncident = {
          ...data,
          items: data.items.filter(
            (item: any) =>
              (item.passQuantity ?? 0) < (item.orderedQuantity ?? 0),
          ),
        };
        setIncident(filteredIncident);

        try {
          const suppRes = await managerIncidentApi.getSupplementaryReceipt(id);
          setSupplementaryReceipt(suppRes.data);
        } catch (err: any) {
          if (err.response?.status !== 404) {
            console.error("Failed to fetch supplementary receipt", err);
          }
        }
      } catch (error: any) {
        console.error("Failed to fetch manager incident detail", error);
        toast.error(
          error.response?.data?.message || t("Incident report not found."),
        );
        router.push("/manager/incident-reports");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchIncidentDetail();
  }, [id, router, t]);

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

  const handleApproveSupplementary = async () => {
    setIsApprovingSupp(true);
    try {
      await managerIncidentApi.approveSupplementaryReceipt(id, {
        notes: approveNotes.trim() || undefined,
      });

      toast.success(t("Supplementary receipt approved successfully!"));
      setIsApproveModalOpen(false);
      router.push("/manager/incident-reports");
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || t("Failed to approve."));
    } finally {
      setIsApprovingSupp(false);
    }
  };

  const handleRejectSupplementary = async () => {
    if (!rejectReason.trim()) {
      return toast.error(t("Please provide a rejection reason."));
    }

    setIsRejecting(true);
    try {
      await managerIncidentApi.rejectSupplementaryReceipt(id, {
        reason: rejectReason.trim(),
      });

      toast.success(t("Supplementary receipt rejected."));
      setRejectModalOpen(false);
      router.push("/manager/incident-reports");
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || t("Failed to reject."));
    } finally {
      setIsRejecting(false);
    }
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

  const isManagerPending = incident.status === "PendingManagerReview";
  const isSupplementaryPending =
    supplementaryReceipt?.status === "PendingManagerApproval";

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
                onClick={() => router.back()}
                className="pl-0 hover:bg-transparent hover:text-indigo-600 w-fit"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back")}
              </Button>
              <div className="hidden md:flex items-center gap-3 border-l border-slate-200 pl-4">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {isSupplementaryPending
                    ? t("Pending Supplementary")
                    : t("Incident Report")}
                </h1>
                <Badge
                  className={
                    isManagerPending ||
                    isSupplementaryPending ||
                    incident.status.includes("Pending") ||
                    supplementaryReceipt?.status.includes("Pending")
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                      : "bg-indigo-100 text-indigo-700 hover:bg-indigo-100"
                  }
                >
                  {t(formatPascalCase(incident.status))}
                </Badge>
              </div>
            </div>

            {/* MANAGER ACTIONS */}
            {isManagerPending && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                onClick={() => setIsApproveModalOpen(true)}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {t("Approve & Forward to Purchasing")}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
                      {t("Reported By")}
                    </span>
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <User className="w-4 h-4 text-slate-400" />
                      {incident.qcCheck?.checkedByName ||
                        `ID: ${incident.qcCheck?.checkedBy}`}
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
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-amber-600" />
                    {t("Staff Description")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap italic">
                    "
                    {incident.description ||
                      t("No general description provided.")}
                    "
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* CỘT PHẢI: CHI TIẾT */}
            <div className="lg:col-span-3 space-y-6">
              {/* CARD: SUPPLEMENTARY RECEIPT */}
              {supplementaryReceipt && (
                <Card className="shadow-sm flex flex-col gap-0 overflow-hidden">
                  <CardHeader className="py-4 flex flex-row items-center justify-between bg-white border-b border-slate-100">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <PackagePlus className="w-5 h-5 text-indigo-600" />
                      {t("Supplier Replacement Request")}
                    </CardTitle>
                    <Badge
                      className={
                        supplementaryReceipt.status === "PendingManagerApproval"
                          ? "bg-amber-100 text-amber-700"
                          : supplementaryReceipt.status === "Rejected"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-emerald-100 text-emerald-700"
                      }
                    >
                      {t(formatPascalCase(supplementaryReceipt.status))}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-6 bg-white flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold uppercase text-slate-400">
                          {t("Expected Delivery Date")}
                        </span>
                        <div className="flex items-center gap-2 text-slate-800 font-medium">
                          <CalendarDays className="w-4 h-4 text-indigo-400" />
                          {formatDateTime(
                            supplementaryReceipt.expectedDeliveryDate,
                          )}
                        </div>
                      </div>
                      {supplementaryReceipt.supplierNote && (
                        <div className="space-y-1">
                          <span className="text-xs font-semibold uppercase text-slate-400">
                            {t("Supplier Note")}
                          </span>
                          <p className="text-sm text-slate-700 font-medium italic">
                            "{supplementaryReceipt.supplierNote}"
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="w-[70%]">
                              {t("Material")}
                            </TableHead>
                            <TableHead className="w-[30%] text-center text-indigo-700">
                              {t("Replacement Quantity")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {supplementaryReceipt.items.map((suppItem, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium text-slate-700">
                                {suppItem.materialName ||
                                  `Item #${suppItem.materialId}`}
                              </TableCell>
                              <TableCell className="text-center font-bold text-indigo-600">
                                {suppItem.supplementaryQuantity}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>

                  {/* NÚT DUYỆT/TỪ CHỐI ĐỀN BÙ */}
                  {isSupplementaryPending && (
                    <CardFooter className="border-t border-indigo-100 p-4 flex justify-end gap-3">
                      <Button
                        variant="outline"
                        className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => setRejectModalOpen(true)}
                        disabled={isApprovingSupp || isRejecting}
                      >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {t("Reject Request")}
                      </Button>
                      <Button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={() => setIsApproveModalOpen(true)}
                        disabled={isApprovingSupp || isRejecting}
                      >
                        {isApprovingSupp ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                        )}
                        {t("Approve Request")}
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              )}

              {/* CARD: DANH SÁCH VẬT TƯ LỖI TỪ KHO */}
              <Card className="border-slate-200 shadow-sm bg-white flex flex-col min-h-[300px] gap-0">
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
                  <div className="[&>div]:max-h-[300px] [&>div]:min-h-[300px] [&>div]:overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <TableRow>
                          <TableHead className="w-[20%] pl-6">
                            {t("Material")}
                          </TableHead>

                          <TableHead className="w-[10%] text-center text-slate-700">
                            <div className="flex flex-col text-xs font-semibold">
                              <span>{t("Ordered")}</span>
                              <span className="text-[10px] text-slate-400 font-normal uppercase">
                                {t("Contracted")}
                              </span>
                            </div>
                          </TableHead>
                          <TableHead className="w-[10%] text-center text-slate-700">
                            <div className="flex flex-col text-xs font-semibold">
                              <span>{t("Actual")}</span>
                              <span className="text-[10px] text-slate-400 font-normal uppercase">
                                {t("Received")}
                              </span>
                            </div>
                          </TableHead>
                          <TableHead className="w-[10%] text-center text-emerald-700">
                            <div className="flex flex-col text-xs font-semibold">
                              <span>{t("Passed")}</span>
                              <span className="text-[10px] text-emerald-600/70 font-normal uppercase">
                                {t("QC OK")}
                              </span>
                            </div>
                          </TableHead>

                          <TableHead className="w-[10%] text-center text-amber-700">
                            <div className="flex flex-col text-xs font-semibold">
                              <span>{t("Defect Breakdown")}</span>
                              <span className="text-[10px] text-amber-600 font-normal uppercase">
                                {t("Quantity & Quality & Damage")}
                              </span>
                            </div>
                          </TableHead>

                          <TableHead className="w-[10%] text-center text-rose-700 font-bold">
                            {t("Total Failed")}
                          </TableHead>
                          <TableHead className="w-[20%] pr-6">
                            {t("Staff Reason & Evidence")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {paginatedItems.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="h-32 text-center text-slate-500"
                            >
                              {t("No items found.")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedItems.map((item, idx) => (
                            <TableRow
                              key={idx}
                              className="hover:bg-slate-50/50"
                            >
                              <TableCell className="pl-6 py-4 align-top">
                                <div className="flex flex-col">
                                  <p className="text-sm font-semibold text-slate-800">
                                    {item.materialName ||
                                      `Item #${item.materialId}`}
                                  </p>
                                </div>
                              </TableCell>

                              <TableCell className="text-center align-top pt-4">
                                <span className="font-medium text-slate-700">
                                  {item.orderedQuantity}
                                </span>
                              </TableCell>

                              <TableCell className="text-center align-top pt-4">
                                <span className="font-medium text-slate-700">
                                  {item.actualQuantity}
                                </span>
                              </TableCell>

                              <TableCell className="text-center align-top pt-4">
                                <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                  {item.passQuantity}
                                </span>
                              </TableCell>

                              <TableCell className="align-top pt-3 text-center">
                                <div className="inline-flex divide-x divide-slate-200 border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
                                  <div className="flex flex-col items-center px-3 py-1.5 min-w-[70px] hover:bg-slate-50 transition-colors">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                                      {t("Quality")}
                                    </span>
                                    <span className="text-sm font-bold text-amber-600">
                                      {item.failQuantityQuantity || 0}
                                    </span>
                                  </div>

                                  <div className="flex flex-col items-center px-3 py-1.5 min-w-[70px] hover:bg-slate-50 transition-colors">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                                      {t("Quality")}
                                    </span>
                                    <span className="text-sm font-bold text-amber-600">
                                      {item.failQuantityQuality || 0}
                                    </span>
                                  </div>

                                  <div className="flex flex-col items-center px-3 py-1.5 min-w-[70px] hover:bg-slate-50 transition-colors">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                                      {t("Damage")}
                                    </span>
                                    <span className="text-sm font-bold text-amber-600">
                                      {item.failQuantityDamage || 0}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="text-center align-top pt-4">
                                <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200 shadow-sm">
                                  {formatQuantity(
                                    item.failQuantityQuantity +
                                      item.failQuantityQuality +
                                      item.failQuantityDamage,
                                  )}
                                </Badge>
                              </TableCell>

                              <TableCell className="pr-6 align-top pt-4">
                                <div className="flex flex-col gap-2">
                                  <p className="text-sm text-slate-600 italic bg-slate-50 p-2 rounded-md border border-slate-100">
                                    "
                                    {item.failReason ||
                                      t("No specific reason provided")}
                                    "
                                  </p>
                                  {item.evidenceImages !== null &&
                                    item.evidenceImages.length > 0 && (
                                      <div className="mt-1">
                                        <ImageGallery
                                          images={item.evidenceImages}
                                          isReadOnly={true}
                                          maxVisible={3}
                                        />
                                      </div>
                                    )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

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

      {/* MODAL PHÊ DUYỆT (Sự cố hoặc Đền bù) */}
      <Dialog
        open={isApproveModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsApproveModalOpen(false);
            setApproveNotes("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-0 shadow-lg bg-white">
          <DialogHeader className="pt-5 pb-4 px-6 border-b border-slate-100 bg-white">
            <DialogTitle className="text-emerald-700 flex items-center gap-2 text-lg">
              <CheckCircle2 className="w-5 h-5" />
              {isSupplementaryPending
                ? t("Approve Supplementary")
                : t("Approve Incident")}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4 bg-white">
            <p className="text-sm text-slate-700">
              {isSupplementaryPending
                ? t(
                    "You are about to approve this supplementary. It will be forwarded to the Warehouse Staff for goods awaiting.",
                  )
                : t(
                    "You are about to approve this incident report. It will be forwarded to the Purchasing Team to arrange supplementary goods or refunds.",
                  )}
            </p>
            {/* <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {t("Manager Notes")}
              </label>
              <Textarea
                placeholder={t("Add instructions...")}
                className="min-h-[100px] resize-none focus-visible:ring-emerald-500 mt-2 bg-white"
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                autoFocus
              />
            </div> */}
          </div>
          <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsApproveModalOpen(false);
                setApproveNotes("");
              }}
              className="text-slate-600 hover:text-slate-600 hover:bg-slate-100"
              disabled={isApproving || isApprovingSupp}
            >
              {t("Cancel")}
            </Button>
            <Button
              onClick={
                supplementaryReceipt
                  ? handleApproveSupplementary
                  : handleApprove
              }
              disabled={isApproving || isApprovingSupp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {(isApproving || isApprovingSupp) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {t("Confirm Approval")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL TỪ CHỐI YÊU CẦU ĐỀN BÙ */}
      <Dialog
        open={rejectModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRejectModalOpen(false);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-0 shadow-lg bg-white">
          <DialogHeader className="pt-5 pb-4 px-6 border-b border-slate-100 bg-white">
            <DialogTitle className="text-rose-700 flex items-center gap-2 text-lg">
              <AlertCircle className="w-5 h-5" />
              {t("Reject Supplementary Request")}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4 bg-white">
            <p className="text-sm text-slate-800">
              {t(
                "Please provide a reason for rejecting this replacement request. It will be sent back to Purchasing.",
              )}
            </p>
            <Textarea
              placeholder={t("Enter rejection reason here...")}
              className="min-h-[100px] resize-none focus-visible:ring-rose-500 bg-white"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setRejectModalOpen(false);
                setRejectReason("");
              }}
              className="text-slate-600 hover:bg-slate-100"
              disabled={isRejecting}
            >
              {t("Cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSupplementary}
              disabled={isRejecting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isRejecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("Confirm Reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
