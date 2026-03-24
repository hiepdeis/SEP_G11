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
  purchasingIncidentApi,
  ManagerIncidentDetailDto,
  PurchasingIncidentDetailDto,
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
import { showConfirmToast } from "@/hooks/confirm-toast";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/custom/date-time-picker";

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

  // State cho Supplementary Receipt (Dành cho Manager)
  const [supplementaryReceipt, setSupplementaryReceipt] =
    useState<ManagerSupplementaryReceiptDto | null>(null);
  const [isApprovingSupp, setIsApprovingSupp] = useState(false);

  const [suppApproveNotes, setSuppApproveNotes] = useState("");

  // State Modal Từ chối Đền bù (Manager)
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const [tablePage, setTablePage] = useState(1);
  const tableItemsPerPage = 5;

  // Modal State Phê duyệt sự cố (Dành cho Manager ban đầu)
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveNotes, setApproveNotes] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  // Modal State Yêu cầu đền bù (Dành cho Purchasing)
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<
    Date | undefined
  >(undefined);
  const [supplierNote, setSupplierNote] = useState("");
  const [supplementaryItems, setSupplementaryItems] = useState<
    {
      materialId: number;
      name: string;
      supplementaryQuantity: number;
    }[]
  >([]);

  useEffect(() => {
    const fetchIncidentDetail = async () => {
      setIsLoading(true);
      try {
        let res;
        if (role === "purchase") {
          res = await purchasingIncidentApi.getIncidentDetail(id);
        } else {
          res = await managerIncidentApi.getIncidentDetail(id);

          try {
            const suppRes =
              await managerIncidentApi.getSupplementaryReceipt(id);
            setSupplementaryReceipt(suppRes.data);
          } catch (err: any) {
            if (err.response?.status !== 404) {
              console.error("Failed to fetch supplementary receipt", err);
            }
          }
        }
        setIncident(res.data);
      } catch (error: any) {
        console.error(`Failed to fetch incident detail for ${role}`, error);
        toast.error(
          error.response?.data?.message || t("Incident report not found."),
        );

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

  // ================= PURCHASING: TẠO SUPPLEMENTARY =================
  const handleOpenProcessModal = () => {
    const details = incident?.items || [];
    const itemsToReplace = details
      .filter((item: any) => item.failQuantity > 0)
      .map((item: any) => ({
        materialId: item.materialId,
        name: item.materialName || `Item #${item.materialId}`,
        supplementaryQuantity: item.failQuantity || 0,
      }));

    setSupplementaryItems(itemsToReplace);
    setExpectedDeliveryDate(undefined);
    setSupplierNote("");
    setIsProcessModalOpen(true);
  };

  const handleSubmitProcess = async () => {
    if (!expectedDeliveryDate)
      return toast.error(t("Please select an expected delivery date."));
    if (!supplierNote.trim())
      return toast.error(
        t("Please provide a supplier note detailing the replacement request."),
      );
    if (!supplementaryItems || supplementaryItems.length === 0)
      return toast.error(t("There are no items to request for replacement."));

    const invalidItems = supplementaryItems.filter(
      (i) => !i.supplementaryQuantity || Number(i.supplementaryQuantity) <= 0,
    );
    if (invalidItems.length > 0)
      return toast.error(
        t("Replacement quantity must be greater than 0 for all items."),
      );

    setIsProcessing(true);
    try {
      const payload = {
        supplierNote: supplierNote.trim(),
        expectedDeliveryDate: expectedDeliveryDate.toISOString(),
        items: supplementaryItems.map((i) => ({
          materialId: i.materialId,
          supplementaryQuantity: Number(i.supplementaryQuantity),
        })),
      };

      await purchasingIncidentApi.createSupplementaryReceipt(id, payload);
      toast.success(t("Supplementary receipt created successfully!"));
      setIsProcessModalOpen(false);
      router.push("/purchasing/incident-reports");
    } catch (error: any) {
      console.error(error);
      toast.error(
        error.response?.data?.message ||
          t("Failed to create supplementary receipt."),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // ================= MANAGER: DUYỆT SỰ CỐ BAN ĐẦU =================
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

  const isManagerPending =
    role === "manager" && incident.status === "PendingManagerReview";
  const isPurchasingPending =
    role === "purchase" && incident.status === "PendingPurchasingAction";
  // Cờ kiểm tra Đơn đền bù đang chờ Manager duyệt
  const isSupplementaryPending =
    role === "manager" && supplementaryReceipt?.status === "PendingManagerApproval";

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
                  if (role === "purchase")
                    router.push("/purchasing/incident-reports");
                  else router.push("/manager/incident-reports");
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
                    isManagerPending ||
                    isPurchasingPending ||
                    isSupplementaryPending
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
                onClick={handleOpenProcessModal}
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
            <div className="lg:col-span-2 space-y-6">
              {/* === CARD: SUPPLEMENTARY RECEIPT (NẾU CÓ) === */}
              {role === "manager" && supplementaryReceipt && (
                <Card className="shadow-sm flex flex-col gap-0 overflow-hidden">
                  <CardHeader className="py-4 flex flex-row items-center justify-between bg-white">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <PackagePlus className="w-5 h-5 text-indigo-600" />
                      {t("Supplier Replacement Request")}
                    </CardTitle>
                    <Badge
                      className={
                        supplementaryReceipt.status === "Pending"
                          ? "bg-amber-100 text-amber-700"
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

                  {/* NÚT DUYỆT/TỪ CHỐI ĐỀN BÙ (CHỈ HIỆN KHI PENDING) */}
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

      {/* ================= MODAL DIALOGS ================= */}

      {/* 1. MODAL DUYỆT SỰ CỐ BAN ĐẦU (MANAGER) */}
      {role === "manager" && (
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
                {t("Approve Incident")}
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-4 bg-white">
              <p className="text-sm text-slate-700">
                {t(
                  "You are about to approve this incident report. It will be forwarded to the Purchasing Team to arrange supplementary goods or refunds.",
                )}
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {t("Manager Notes")}
                </label>
                <Textarea
                  placeholder={t("Add instructions for the purchasing team...")}
                  className="min-h-[100px] resize-none focus-visible:ring-emerald-500 mt-2 bg-white"
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsApproveModalOpen(false);
                  setApproveNotes("");
                }}
                className="text-slate-600 hover:bg-slate-100"
                disabled={isApproving}
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
      )}

      {/* 2. MODAL TỪ CHỐI YÊU CẦU ĐỀN BÙ (MANAGER) */}
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

      {/* 3. MODAL YÊU CẦU ĐỀN BÙ / BỔ SUNG (PURCHASING) */}
      {role === "purchase" && (
        <Dialog
          open={isProcessModalOpen}
          onOpenChange={(open) => {
            if (!open) setIsProcessModalOpen(false);
          }}
        >
          <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden border-0 shadow-lg bg-white">
            <DialogHeader className="pt-5 pb-4 px-6 border-b border-slate-100 bg-white">
              <DialogTitle className="text-indigo-700 flex items-center gap-2 text-lg">
                <PackagePlus className="w-5 h-5" />
                {t("Create Supplementary Receipt")}
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-5 bg-white max-h-[65vh] overflow-y-auto">
              <p className="text-sm text-slate-700">
                {t(
                  "Request replacement items from the supplier to resolve this incident.",
                )}
              </p>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {t("Expected Delivery Date")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <DateTimePicker
                  value={expectedDeliveryDate}
                  onChange={setExpectedDeliveryDate}
                  placeholder={t("Select date and time...")}
                  disablePastDates
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {t("Supplier Note")} <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder={t(
                    "Enter any notes for the supplier regarding this replacement...",
                  )}
                  className="min-h-[80px] resize-none focus-visible:ring-indigo-500 bg-white"
                  value={supplierNote}
                  onChange={(e) => setSupplierNote(e.target.value)}
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-sm font-medium text-slate-700">
                  {t("Replacement Items & Quantities")}
                </label>
                <Table className="border border-slate-100 rounded-md">
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[60%] pl-4">
                        {t("Material")}
                      </TableHead>
                      <TableHead className="w-[15%] text-center text-rose-600">
                        {t("Failed")}
                      </TableHead>
                      <TableHead className="w-[25%] text-center">
                        {t("Request Qty")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplementaryItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center py-6 text-slate-500"
                        >
                          {t("No failed items to replace.")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      supplementaryItems.map((item, idx) => (
                        <TableRow key={item.materialId}>
                          <TableCell className="font-medium text-slate-700 py-3 pl-4">
                            {item.name}
                          </TableCell>
                          <TableCell className="text-center font-bold text-rose-600">
                            {incident?.items.find(
                              (i: any) => i.materialId === item.materialId,
                            )?.failQuantity || 0}
                          </TableCell>
                          <TableCell className="py-2 pr-4">
                            <Input
                              type="number"
                              min="0"
                              className="w-full text-center focus-visible:ring-indigo-500 font-semibold"
                              value={item.supplementaryQuantity}
                              onChange={(e) => {
                                const newItems = [...supplementaryItems];
                                newItems[idx].supplementaryQuantity = Math.max(
                                  0,
                                  Number(e.target.value),
                                );
                                setSupplementaryItems(newItems);
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setIsProcessModalOpen(false)}
                className="text-slate-600 hover:bg-slate-100"
                disabled={isProcessing}
              >
                {t("Cancel")}
              </Button>
              <Button
                onClick={handleSubmitProcess}
                disabled={isProcessing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                {t("Confirm & Create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
