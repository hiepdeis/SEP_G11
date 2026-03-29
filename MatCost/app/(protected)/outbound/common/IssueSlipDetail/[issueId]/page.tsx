"use client";
import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { FifoBatch, issueSlipApi, IssueSlipDetail, IssueSlipDetailItem } from "@/services/issueslip-service";
import axiosClient from "@/lib/axios-client";
import {
  ArrowLeft, Calendar, Loader2, PackageSearch, ClipboardList,
  CheckCircle2, XCircle, AlertCircle, FileText, User, ChevronLeft, ChevronRight, EyeOff, Eye, FileSignature, Eraser, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ReviewIssueRequest} from "@/services/issueslip-service";
type UserRole = "Admin" | "WarehouseManager" | "Accountant" | "WarehouseStaff" | "ConstructionTeam";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BatchInStockDto, materialApi } from "@/services/materials-service";
import ReactSignatureCanvas, { SignatureCanvas } from "react-signature-canvas";
import { OTPInput } from "input-otp";


export default function CommonIssueSlipDetail() {
  const params = useParams();
  const { t } = useTranslation();
  const router = useRouter();
  const [detail, setDetail] = useState<IssueSlipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const issueId = Number(params?.issueId);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);
  const role = sessionStorage.getItem("role") ;
  const [inventoryDecisions, setInventoryDecisions] = useState<Record<number, string>>({});
  
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IssueSlipDetailItem | null>(null);

  const [batchInputs, setBatchInputs] = useState<Record<number, number>>({});
  const [customBatchAllocations, setCustomBatchAllocations] = useState<Record<number, FifoBatch[]>>({});
  const [isSplitConfirmOpen, setIsSplitConfirmOpen] = useState(false);
  const [splitPreviewData, setSplitPreviewData] = useState<any[]>([]);
  const [availableBatches, setAvailableBatches] = useState<BatchInStockDto[]>([]);
  const [selectedPicker, setSelectedPicker] = useState<string>("");
  const [pickers, setPickers] = useState<any[]>([]);

  const [pickingList, setPickingList] = useState<any[]>([]);
  const [hidePicked, setHidePicked] = useState(true);

  const [isAdminSigning, setIsAdminSigning] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const sigCanvas = useRef<ReactSignatureCanvas>(null);
  const [isSigned, setIsSigned] = useState(false);

  useEffect(() => {
    const fetchPickers = async () => {
      const data = await issueSlipApi.getWarehouseStaff();
      setPickers(data);
    };
    fetchPickers();
  }, []);
  // Xóa cái `generatedPo` cũ đi, thay bằng cái này:
  const [generatedSlips, setGeneratedSlips] = useState<{
    inventoryId?: number;
    inventoryCode?: string;
    inventorySent: boolean;
    poId?: number;
    poCode?: string;
    poSent: boolean;
  } | null>(null);

  useEffect(() => {
    if (!issueId) return;
    const fetchDetail = async () => {
      try {
        // setLoading(true);
        const data = await issueSlipApi.getIssueSlipDetail(issueId);
        console.log("Fetched issue slip detail:", data);
        setDetail(data);
        if (data.generatedSlips) {
           setGeneratedSlips(data.generatedSlips);
        }
        if (role === "WarehouseStaff" && data.status === "Picking_In_Progress") {
           const pickData = await issueSlipApi.getPickingList(issueId);
           setPickingList(pickData.pickingItems || []);
        }
      } catch (error) {
        toast.error(t("Không thể tải chi tiết phiếu xuất."));
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();

  }, [issueId, t]);

  useEffect(() => {
  if (!detail || detail.status !== "Approved") return;

  const defaultDecisions: Record<number, string> = {};

  detail.details.forEach(item => {
    if (item.availableQuantity === 0) {
      defaultDecisions[item.detailId] = "DirectPO";
    } else if (item.availableQuantity < item.requestedQuantity) {
      defaultDecisions[item.detailId] = "Split";
    } else {
      defaultDecisions[item.detailId] = "Stock";
    }
  });

  setInventoryDecisions(defaultDecisions);

}, [detail]); // 👈 OK vì KHÔNG gọi API nữa

const handleSignatureEnd = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) setIsSigned(true);
  };

  const clearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setIsSigned(false);
    }
  };

  const handleConfirmSignature = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) return toast.error("Vui lòng ký xác nhận.");
    try {
      setReviewing(true);
      // Lấy ảnh chữ ký dưới dạng base64 (Backend có thể cần để lưu lại bằng chứng)
      // const signatureBase64 = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
      
      // TODO: GỌI API BACKEND YÊU CẦU GỬI OTP Ở ĐÂY
      // await axiosClient.post(`/IssueSlips/${issueId}/send-otp`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success("Hệ thống đã gửi mã OTP đến số điện thoại của bạn.");
      setIsAdminSigning(false); 
      setIsOtpModalOpen(true);
    } catch (error) {
      toast.error("Lỗi khi gửi yêu cầu xác thực.");
    } finally {
      setReviewing(false);
    }
  };

  const handleConfirmOtp = async () => {
    if (otp.length !== 6) return toast.error("Vui lòng nhập đủ 6 số OTP.");
    try {
      setReviewing(true);
      // const signatureBase64 = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
      
      // TODO: GỌI API BACKEND XÁC THỰC OTP VÀ APPROVE Ở ĐÂY
      // await axiosClient.post(`/IssueSlips/${issueId}/approve-with-otp`, { otpCode: otp, signatureBase64 });
      
      // Giả lập API mất 1 giây
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success("Xác thực thành công! Đã duyệt vượt ngân sách.");
      setIsOtpModalOpen(false);
      setOtp("");
      clearSignature();
      
      // Load lại dữ liệu
      const data = await issueSlipApi.getIssueSlipDetail(issueId);
      setDetail(data);
    } catch (error) {
      toast.error("Mã OTP không chính xác hoặc đã hết hạn.");
    } finally {
      setReviewing(false);
    }
  };

  const handleReview = async (action: "Approved" | "Rejected" | "Ready_to_Pick") => {
    let reason = "";
    
    // Nếu từ chối thì bắt buộc phải nhập lý do
    if (action === "Rejected") {
      reason = prompt(t("Reason *")) || "";
      if (!reason.trim()) return; // Hủy nếu người dùng bấm Cancel hoặc để trống
    }

    try {
      setReviewing(true);  
      await issueSlipApi.reviewIssue(issueId, { action, reason });
      let successMsg = t("Approved successfully");
      if (action === "Rejected") successMsg = t("Rejected successfully");
      if (action === "Ready_to_Pick") successMsg = t("Confirmed Release successfully");
      toast.success(successMsg);
      const data = await issueSlipApi.getIssueSlipDetail(issueId);
      setDetail(data);
    } catch (err: any) {
      const backendError = err.response?.data?.message || err.response?.data;
      const displayError = typeof backendError === "string" 
        ? backendError 
        : t("Có lỗi xảy ra khi gửi yêu cầu.");
      toast.error(displayError);
    } finally {
      setReviewing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s === "approved") return <Badge className="bg-emerald-100 text-emerald-800 border-none px-3 py-1"><CheckCircle2 className="w-4 h-4 mr-1.5" /> {t("Approved")}</Badge>;
    if (s === "rejected") return <Badge className="bg-rose-100 text-rose-800 border-none px-3 py-1"><XCircle className="w-4 h-4 mr-1.5" /> {t("Rejected")}</Badge>;
    if (s === "pending_review") return <Badge className="bg-amber-100 text-amber-800 border-none px-3 py-1"><AlertCircle className="w-4 h-4 mr-1.5" /> {t("Pending Accountant Review")}</Badge>;
    if (s === "pending_admin_approval") return <Badge className="bg-orange-100 text-orange-800 border-none px-3 py-1"><AlertCircle className="w-4 h-4 mr-1.5" /> {t("Pending Admin Approval")}</Badge>;
    return <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-none px-3 py-1">{t(status)}</Badge>;
  };


  const formatWorkItem = (code?: string) => {
    if (code === 'foundation') return t("Foundation");
    if (code === 'body') return t("Body");
    if (code === 'roof') return t("Roof");
    return code || t("N/A");
  };

  const handleEditBatchClick = async (item: IssueSlipDetailItem) => {
    setEditingItem(item);
    try {
      // Gọi API 2 lấy danh sách lô trong kho
      const res: any = await materialApi.getBatchesInStock(item.materialId, detail?.warehouseId || 0);
      
      // Xử lý an toàn: Dù API trả về Array hay Object thì vẫn lấy đúng mảng batches
      const batchList = Array.isArray(res) ? res[0]?.batches : res?.batches;
      setAvailableBatches(batchList || []);
      
      const currentAllocations = customBatchAllocations[item.detailId] || item.fifoSuggestedBatches || [];
      const initialInputs: Record<number, number> = {};
      currentAllocations.forEach(b => { initialInputs[b.batchId] = b.qtyToTake; });
      
      setBatchInputs(initialInputs);
      setIsBatchModalOpen(true);
    } catch (error) {
      toast.error("Không thể tải danh sách lô trong kho.");
    }
  };

  const saveBatchChanges = () => {
    if (!editingItem) return;
    // Gom các input > 0 thành mảng FifoBatch mới
    const newAllocations: FifoBatch[] = availableBatches
      .filter(b => batchInputs[b.batchId] > 0)
      .map(b => {
        // Nếu API lô không trả về giá, ta lấy giá mặc định của vật tư (editingItem.unitPrice)
        const price = (b as any).unitPrice || editingItem.unitPrice; 
        const qty = batchInputs[b.batchId];
        return {
          batchId: b.batchId,
          batchCode: b.batchCode,
          mfgDate: b.mfgDate,
          qtyToTake: qty,
          unitPrice: price, 
          lineTotal: qty * price
        };
      });

    const totalSelected = newAllocations.reduce((sum, b) => sum + b.qtyToTake, 0);
    if (totalSelected > editingItem.requestedQuantity) {
      toast.error(`Tổng số lượng chọn (${totalSelected}) vượt quá yêu cầu (${editingItem.requestedQuantity})`);
      return;
    }

    setCustomBatchAllocations(prev => ({ ...prev, [editingItem.detailId]: newAllocations }));
    setIsBatchModalOpen(false);
  };


  // --- LOGIC 2: BẤM "CHẤP NHẬN PHƯƠNG ÁN" & TÁCH PHIẾU ---
  const handleAcceptPlanClick = () => {
    const decisionsList = Object.keys(inventoryDecisions).map(k => {
      const detailId = Number(k);
      const itemData = detail?.details.find(d => d.detailId === detailId);
      return { detailId, action: inventoryDecisions[detailId], itemData };
    });
    const hasPurchasing = decisionsList.some(d => d.action === "Split" || d.action === "DirectPO");
    
    if (hasPurchasing) {
     // Tính toán Preview cho TẤT CẢ các món để Kế toán nhìn toàn cảnh
      const previewItems = decisionsList.map(d => {
        let inStock = 0;
        let toBuy = 0;

        if (d.action === "Stock") {
          inStock = d.itemData?.requestedQuantity || 0;
          toBuy = 0;
        } else if (d.action === "DirectPO") {
          inStock = 0;
          toBuy = d.itemData?.requestedQuantity || 0;
        } else if (d.action === "Split") {
          inStock = d.itemData?.availableQuantity || 0;
          toBuy = (d.itemData?.requestedQuantity || 0) - (d.itemData?.availableQuantity || 0);
        }

        return {
          name: d.itemData?.name,
          unit: d.itemData?.unit,
          action: d.action,
          requested: d.itemData?.requestedQuantity,
          inStock: inStock,
          toBuy: toBuy
        };
      });

      setSplitPreviewData(previewItems);
      setIsSplitConfirmOpen(true); // CHỈ MỞ POPUP, TUYỆT ĐỐI CHƯA GỌI DB!
    } else {
      // Không có tách phiếu -> Gọi API chốt luôn
      executeProcessInventory();
    }
  };

  // const executeProcessInventory = async () => {
  //   setIsSplitConfirmOpen(false);
  //   setReviewing(true);
  //   try {
  //     const payload = {
  //       decisions: Object.keys(inventoryDecisions).map(k => ({
  //         detailId: Number(k),
  //         action: inventoryDecisions[Number(k)]
  //       })),
  //     };

  //     const res = await axiosClient.post(`/IssueSlips/${issueId}/process-inventory`, payload);
  //     toast.success("Đã chốt phương án vật tư!");
  //     if (res.data.splitSlipCode) {
  //       toast.info(`Hệ thống đã tự động tạo lệnh Mua ngoài: ${res.data.splitSlipCode}`);
  //     }
  //     const data = await issueSlipApi.getIssueSlipDetail(issueId);
  //     setDetail(data);
  //   } catch (err: any) {
  //     toast.error(err.response?.data?.message || err.response?.data || "Có lỗi xảy ra.");
  //   } finally {
  //     setReviewing(false);
  //   }
  // };
  const executeProcessInventory = async () => {
    setIsSplitConfirmOpen(false);
    setReviewing(true);
    try {
      // 1. Build cục data customBatches chuẩn theo JSON Backend cần
      const customBatchesPayload: Record<string, any[]> = {};
      Object.keys(customBatchAllocations).forEach(detailId => {
        customBatchesPayload[detailId] = customBatchAllocations[Number(detailId)].map(b => ({
          batchId: b.batchId,
          qtyToTake: b.qtyToTake
        }));
      });

      const payload = {
        decisions: Object.keys(inventoryDecisions).map(k => ({
          detailId: Number(k),
          action: inventoryDecisions[Number(k)]
        })),
        customBatches: customBatchesPayload // Đã add cục Lô vào đây!
      };

      const res = await axiosClient.post(`/IssueSlips/${issueId}/draft-process-inventory`, payload);
      toast.success("Đã tạo các bản nháp thành công!");
      
      // Lưu ID của 2 phiếu con vào state
      setGeneratedSlips({
        inventoryId: res.data.newInventorySlipId,
        inventoryCode: res.data.newInventorySlipCode,
        inventorySent: false,
        poId: res.data.newPoSlipId,
        poCode: res.data.newPoSlipCode,
        poSent: false
      });
      
      // 3. Reload lại chi tiết phiếu (Lúc này status sẽ nhảy thành 'Draft_Issue_Note')
      const data = await issueSlipApi.getIssueSlipDetail(issueId);
      setDetail(data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data || "Có lỗi xảy ra khi xử lý kho.");
    } finally {
      setReviewing(false);
    }
  };

 


  // KẾ TOÁN: Gửi Phiếu xuất kho cho Thủ kho
  const handleSendInventorySlip = async (slipId: number) => {
    try {
      setReviewing(true);
      // Gọi API Review với action tương ứng
      await issueSlipApi.changeStatus(slipId, { action: "Pending_Warehouse_Approval", reason: "" });
      toast.success("Đã chuyển lệnh Xuất kho cho Thủ kho!");
      
      // Đánh dấu mờ cái nút đi
      setGeneratedSlips(prev => prev ? { ...prev, inventorySent: true } : null);
    } catch (err) {
      toast.error("Lỗi khi gửi lệnh Xuất kho.");
    } finally {
      setReviewing(false);
    }
  };

  // KẾ TOÁN: Gửi Đơn mua ngoài cho phòng Thu mua
  const handleSendPO = async (poId: number) => {
    try {
      setReviewing(true);
      await issueSlipApi.changeStatus(poId, { action: "Forwarded_To_Purchasing", reason: "" });
      toast.success("Đã chuyển lệnh Mua ngoài cho Thu mua!");
      setGeneratedSlips(prev => prev ? { ...prev, poSent: true } : null);
    } catch (err) {
      toast.error("Lỗi khi gửi đơn mua ngoài.");
    } finally {
      setReviewing(false);
    }
  };

  // 1. Đảo trạng thái isPicked của 1 món hàng
  const handleTogglePick = (pickingId: number) => {
    setPickingList(prev => prev.map(item => item.pickingId === pickingId ? { ...item, isPicked: !item.isPicked } : item));
  };

  // 2. Chốt hoàn thành nhặt hàng
  const handleCompletePicking = async () => {
    const unpickedCount = pickingList.filter(i => !i.isPicked).length;
    if (unpickedCount > 0) return toast.error(`Vẫn còn ${unpickedCount} mục chưa nhặt xong!`);
    try {
      setReviewing(true);
      await issueSlipApi.changeStatus(issueId, { action: "Ready_For_Delivery", reason: "Nhân viên kho đã nhặt xong hàng." });
      toast.success("Tuyệt vời! Đã hoàn tất việc nhặt hàng.");
      window.location.reload();
    } catch (e) {
      toast.error("Lỗi khi chốt nhặt hàng.");
    } finally {
      setReviewing(false);
    }
  };

  // 3. Tính toán dữ liệu hiển thị (Lọc bỏ các món đã nhặt nếu hidePicked đang bật)
  const displayedPickingItems = hidePicked ? pickingList.filter(item => !item.isPicked) : pickingList;

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2 text-indigo-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">{t("Loading issue slip details...")}</p>
        </div>
      </div>
    );
  }

  if (!detail) return <div className="p-10 text-center">{t("Issue Slip not found")}</div>;

  const detailsList = detail.details || [];
  const isAll = itemsPerPage === -1;
  const totalPages = isAll ? 1 : Math.ceil(detailsList.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * (isAll ? detailsList.length : itemsPerPage);
  const endIndex = isAll ? detailsList.length : startIndex + itemsPerPage;
  const paginatedDetails = detailsList.slice(startIndex, endIndex);
  const canViewPrice = role === "Accountant" || role === "Admin";
  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("Issue Slip")} #${detail.issueCode}`} />

        <div className="flex-grow overflow-y-auto p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:bg-transparent hover:text-indigo-600">
              <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back to List")}
            </Button>
            {getStatusBadge(detail.status)}<Card className="border-slate-200 shadow-sm gap-0"></Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              {!(role === "WarehouseStaff" && detail.status === "Picking_In_Progress") && (
                <Card className="border-slate-200 shadow-sm gap-0 flex flex-col min-h-[400px]">
                  <CardHeader className="bg-white border-b border-slate-100 py-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                      <PackageSearch className="w-5 h-5 text-indigo-600" /> {t("Requested Materials")}
                    </CardTitle>
                    {canViewPrice && (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm mt-4">
                        <div className="bg-slate-50 rounded-lg p-3">
                          <div className="text-xs text-slate-500">{t("Total Budget")}</div>
                          <div className="font-semibold">{detail.projectInfo.totalBudget.toLocaleString()}</div>
                        </div>
                        <div className="bg-rose-50 rounded-lg p-3">
                          <div className="text-xs text-slate-500">{t("Used")}</div>
                          <div className="font-semibold text-rose-600">{detail.projectInfo.budgetUsed.toLocaleString()}</div>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-3">
                          <div className="text-xs text-slate-500">{t("Remaining")}</div>
                          <div className="font-semibold text-emerald-600">{detail.projectInfo.budgetRemaining.toLocaleString()}</div>
                        </div>
                        <div className="bg-indigo-50 rounded-lg p-3">
                          <div className="text-xs text-slate-500">{t("Request Cost")}</div>
                          <div className="font-semibold text-indigo-600">{detail.projectInfo.totalRequestCost.toLocaleString()}</div>
                        </div>
                        <div className={`rounded-lg p-3 ${detail.projectInfo.isOverBudget ? "bg-rose-100" : "bg-emerald-100"}`}>
                          <div className="text-xs text-slate-500">{t("After Issue")}</div>
                          <div className={`font-bold ${detail.projectInfo.isOverBudget ? "text-rose-700" : "text-emerald-700"}`}>
                            {detail.projectInfo.remainingAfterIssue.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}
                    {canViewPrice && detail.projectInfo.isOverBudget && (
                      <div className="flex items-center gap-2 text-rose-600 text-sm font-medium mt-2">
                        <AlertCircle className="w-4 h-4" />
                        {t("Over budget!")}
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="p-0 bg-white flex flex-col justify-between flex-1">
                    <div className="overflow-x-auto relative">
                      <Table>
                        
                        <TableHeader>
                          <TableRow className="bg-slate-50/50">
                            <TableHead className="w-[60px] text-center pl-4">{t("No.")}</TableHead>
                            <TableHead>{t("Material Code")}</TableHead>
                            <TableHead>{t("Material Name")}</TableHead>
                            <TableHead className="text-center">{t("Unit")}</TableHead>
                            <TableHead className="text-right">{t("Requested Qty")}</TableHead>
                            <TableHead className="text-right">{t("Current Stock")}</TableHead>
                            {canViewPrice && (
                              <>
                                <TableHead className="text-center">{t("Availability")}</TableHead>
                                <TableHead className="text-right">{t("Unit Price")}</TableHead>
                                {/* <TableHead className="text-center">{t("Availability")}</TableHead> */}
                                {detail.status === "Approved" && (
                                  <TableHead className="min-w-[180px]">{t("Chi tiết Nguồn xuất (FIFO)")}</TableHead>
                                )}
                                <TableHead className="text-right">{t("Line Total")}</TableHead>
                              </>
                            )}
                            {detail.status === "Approved" && (
                              <TableHead className="text-center w-[180px]">{t("Phương án xử lý")}</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedDetails.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={10} className="h-32 text-center text-slate-500">
                                {t("No materials found in this request.")}
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedDetails.map((item, index) => (
                              <TableRow key={item.detailId} className="hover:bg-slate-50/50">
                                <TableCell className="text-center font-medium text-slate-500 pl-4">{startIndex + index + 1}</TableCell>
                                <TableCell className="font-medium text-slate-700">{item.code}</TableCell>
                                <TableCell className="font-medium text-slate-700">{item.name}</TableCell>
                                <TableCell className="text-center text-slate-500">{item.unit}</TableCell>
                                <TableCell className="text-right font-bold text-slate-900">{item.requestedQuantity}</TableCell>
                                <TableCell className={`text-right ${!item.isStockSufficient ? "text-rose-600 font-bold" : "text-slate-500"}`}>{item.availableQuantity}</TableCell>
                                <TableCell className="text-center">
                                  {item.isStockSufficient ? (
                                    <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 font-normal"><CheckCircle2 className="w-3 h-3 mr-1" /> {t("Enough")}</Badge>
                                  ) : (
                                    <Badge className="bg-rose-50 text-rose-600 border-rose-200 font-normal"><XCircle className="w-3 h-3 mr-1" /> {t("Shortage")}</Badge>
                                  )}
                                </TableCell>
                                  {canViewPrice && (
                                  <>
                                    <TableCell className="text-right text-slate-600">{item.unitPrice.toLocaleString()} đ</TableCell>
                                    
                                    {/* CỘT CHI TIẾT LÔ (UI MỚI SIÊU GỌN GÀNG) */}
                                    {detail.status === "Approved" && (
                                      <TableCell>
                                        <div className="flex flex-col gap-1.5 min-w-[160px]">
                                          {(customBatchAllocations[item.detailId] || item.fifoSuggestedBatches || []).map((b, idx) => (
                                            <div key={idx} className="bg-white border border-slate-200 shadow-sm px-2 py-1.5 rounded flex justify-between items-center group hover:border-indigo-300 transition-colors">
                                              <div className="flex flex-col">
                                                <span className="font-semibold text-slate-700 text-[11px] tracking-tight">📦 {b.batchCode}</span>
                                                {/* Hiển thị đơn giá của riêng lô này (nếu có) */}
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                  {(b.unitPrice || item.unitPrice).toLocaleString()} đ
                                                </span>
                                              </div>
                                              <span className="text-indigo-600 font-bold text-xs bg-indigo-50 px-1.5 py-0.5 rounded">
                                                {b.qtyToTake} {item.unit}
                                              </span>
                                            </div>
                                          ))}
                                          {/* Nút Đổi lô chỉ hiện khi vật tư đó có tồn kho > 0 */}
                                          {item.availableQuantity > 0 && (
                                            <button 
                                              onClick={() => handleEditBatchClick(item)} 
                                              className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-0.5 justify-end font-medium transition-colors"
                                            >
                                              ✏️ Đổi lô
                                            </button>
                                          )}
                                        </div>
                                      </TableCell>
                                    )}

                                    {/* CỘT LINE TOTAL (TÍNH TOÁN ĐỘNG KHI ĐỔI LÔ) */}
                                    <TableCell className="text-right font-bold text-indigo-600 bg-indigo-50/30">
                                      {(() => {
                                        const allocations = customBatchAllocations[item.detailId] || item.fifoSuggestedBatches || [];
                                        
                                        if (allocations.length > 0) {
                                          // 1. Tính tổng tiền của những lô đã chọn trong kho
                                          const stockCost = allocations.reduce((sum, b) => sum + (b.qtyToTake * (b.unitPrice || item.unitPrice)), 0);
                                          
                                          // 2. Tính tiền của phần thiếu (Sẽ bị đẩy sang Mua ngoài - DirectPO)
                                          const selectedQty = allocations.reduce((sum, b) => sum + b.qtyToTake, 0);
                                          const missingQty = Math.max(0, item.requestedQuantity - selectedQty);
                                          const missingCost = missingQty * item.unitPrice; // Mua ngoài tính giá gốc mặc định
                                          
                                          return (stockCost + missingCost).toLocaleString() + " đ";
                                        }
                                        
                                        // Mặc định nếu chưa load được lô (cháy kho 100%)
                                        return item.lineTotal.toLocaleString() + " đ";
                                      })()}
                                    </TableCell>
                                  </>
                                )}
                                {detail.status === "Approved" && (
                                <TableCell className="text-center">
                                  <Select 
                                    value={inventoryDecisions[item.detailId] || ""} 
                                    onValueChange={(val) => setInventoryDecisions(prev => ({ ...prev, [item.detailId]: val }))}
                                  >
                                    <SelectTrigger className="h-8 w-full bg-white border-slate-200">
                                      <SelectValue placeholder="Chọn..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {/* CASE 1: HẾT SẠCH HÀNG -> Chỉ có 1 option */}
                                      {item.availableQuantity === 0 && (
                                        <SelectItem value="DirectPO" className="text-rose-600 font-medium">Mua thẳng (Hết hàng)</SelectItem>
                                      )}
                                      
                                      {/* CASE 2: THIẾU HÀNG -> Cho chọn Tách hoặc Mua toàn bộ */}
                                      {item.availableQuantity > 0 && item.availableQuantity < item.requestedQuantity && (
                                        <>
                                          <SelectItem value="Split" className="text-amber-600 font-medium">Tách phiếu (Xuất {item.availableQuantity})</SelectItem>
                                          <SelectItem value="DirectPO" className="text-rose-600 font-medium">Mua xuất thẳng (Cả {item.requestedQuantity})</SelectItem>
                                        </>
                                      )}

                                      {/* CASE 3: ĐỦ HÀNG -> Cho chọn Xuất kho hoặc Mua chỉ định */}
                                      {item.availableQuantity >= item.requestedQuantity && (
                                        <>
                                          <SelectItem value="Stock" className="text-emerald-600 font-medium">Xuất từ kho</SelectItem>
                                          <SelectItem value="DirectPO" className="text-indigo-600 font-medium">Mua thẳng (Giữ tồn kho)</SelectItem>
                                        </>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                )}


                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {detailsList.length > 0 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-4 mt-auto">
                        <div className="text-sm text-slate-500">
                          {t("Showing")} <span className="font-medium text-slate-900">{startIndex + 1}</span> {t("to")} <span className="font-medium text-slate-900">{Math.min(endIndex, detailsList.length)}</span> {t("of")} <span className="font-medium text-slate-900">{detailsList.length}</span>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500">{t("Rows per page:")}</span>
                            <Select value={itemsPerPage.toString()} onValueChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}>
                              <SelectTrigger className="h-8 w-[70px] bg-white border-slate-200"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="-1">{t("All")}</SelectItem>
                              </SelectContent>
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
              )}

              {/* DANH SÁCH NHẶT HÀNG */}
              {role === "WarehouseStaff" && detail.status === "Picking_In_Progress" && (
                <Card className="border-slate-200 shadow-sm bg-white overflow-hidden mt-0 sm:mt-6">
                  <CardHeader className="bg-white border-b border-slate-100 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                        <ClipboardList className="w-5 h-5 text-indigo-600" /> Picking List
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">Dựa theo kệ để tối ưu đường đi trong kho</p>
                    </div>
                    <Button 
                      variant={hidePicked ? "default" : "outline"}
                      className={`w-full sm:w-auto shadow-sm ${hidePicked ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "text-indigo-600 border-indigo-200 hover:bg-indigo-50"}`}
                      onClick={() => setHidePicked(!hidePicked)}
                    >
                      {hidePicked ? <><EyeOff className="w-4 h-4 mr-2" /> Đang ẩn mục đã nhặt</> : <><Eye className="w-4 h-4 mr-2" /> Hiển thị tất cả</>}
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0 w-full">
                    
                    {/* --- GIAO DIỆN 1: DÀNH CHO MÁY TÍNH --- */}
                    <div className="hidden sm:block overflow-x-auto w-full">
                      <Table className="min-w-[600px]">
                        <TableHeader>
                          <TableRow className="bg-slate-50/50">
                            <TableHead className="w-[60px] text-center pl-4">STT</TableHead>
                            <TableHead className="w-[140px]">Bin</TableHead>
                            <TableHead>Vật tư</TableHead>
                            <TableHead>Batch</TableHead>
                            <TableHead className="text-right">SL Cần lấy</TableHead>
                            <TableHead className="text-center w-[100px] pr-4">Xác nhận</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayedPickingItems.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                                {hidePicked ? "Tuyệt vời! Bạn đã nhặt xong tất cả." : "Không có hàng nào cần nhặt."}
                              </TableCell>
                            </TableRow>
                          ) : (
                            displayedPickingItems.map((pick, idx) => (
                              <TableRow key={pick.pickingId || idx} className={`${pick.isPicked ? "bg-indigo-50/40 opacity-70" : "hover:bg-slate-50/50"} transition-colors`}>
                                <TableCell className="text-center font-medium text-slate-500 pl-4">{idx + 1}</TableCell>
                                <TableCell className="font-bold text-slate-700">{pick.binLocation}</TableCell>
                                <TableCell>
                                  <div className="font-medium text-slate-700">{pick.materialName}</div>
                                  <div className="text-xs text-slate-500">Mã: {pick.materialCode}</div>
                                </TableCell>
                                <TableCell className="text-slate-600 text-sm">📦 {pick.batchCode}</TableCell>
                                <TableCell className="text-right font-bold text-indigo-600 text-base">
                                  {pick.qtyToPick} <span className="text-sm font-normal text-slate-500">{pick.unit}</span>
                                </TableCell>
                                <TableCell className="text-center pr-4">
                                  <input 
                                    type="checkbox" 
                                    className="w-6 h-6 accent-indigo-500 cursor-pointer rounded border-slate-300 shadow-sm"
                                    checked={pick.isPicked}
                                    onChange={() => handleTogglePick(pick.pickingId)}
                                  />
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* --- GIAO DIỆN 2: DÀNH CHO ĐIỆN THOẠI --- */}
                    <div className="sm:hidden flex flex-col gap-3 p-3 bg-slate-50/50">
                      {displayedPickingItems.length === 0 ? (
                        <div className="py-10 text-center text-slate-500 text-sm">
                          {hidePicked ? "Tuyệt vời! Bạn đã nhặt xong tất cả." : "Không có hàng nào cần nhặt."}
                        </div>
                      ) : (
                        displayedPickingItems.map((pick, idx) => (
                          <div 
                            key={pick.pickingId || idx} 
                            className={`flex items-center gap-3 p-4 rounded-xl border shadow-sm transition-colors ${pick.isPicked ? "bg-indigo-50 border-indigo-200 opacity-70" : "bg-white border-slate-200"}`}
                          >
                            <div className="shrink-0 flex items-center justify-center">
                              <input 
                                type="checkbox" 
                                className="w-8 h-8 accent-indigo-500 cursor-pointer rounded border-slate-300 shadow-sm"
                                checked={pick.isPicked}
                                onChange={() => handleTogglePick(pick.pickingId)}
                              />
                            </div>
                            <div className="flex-1 flex flex-col min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  📍 {pick.binLocation}
                                </span>
                                <span className="font-bold text-indigo-600 text-base">
                                  {pick.qtyToPick} <span className="text-xs font-normal text-slate-500">{pick.unit}</span>
                                </span>
                              </div>
                              <h4 className="font-medium text-slate-700 text-sm leading-tight mb-1 truncate">
                                {pick.materialName}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>Mã: {pick.materialCode}</span>
                                <span>•</span>
                                <span className="font-medium text-slate-600">📦 {pick.batchCode}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                  </CardContent>
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                     <Button 
                        size="lg" 
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11 shadow-sm"
                        onClick={handleCompletePicking}
                        disabled={reviewing || (pickingList || []).filter(i => !i.isPicked).length > 0}
                     >
                       {reviewing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                       Hoàn tất nhặt hàng
                     </Button>
                  </div>
                </Card>
              )}

            </div>

            <div className="space-y-6">
              
              <Card className="border-slate-200 shadow-sm gap-0">
                <CardHeader className="border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                     <FileText className="w-5 h-5 text-indigo-600" /> {t("Slip Information")}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="p-6 grid grid-cols-2 gap-y-4 gap-x-2">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Project / Construction")}</label>
                    <div className="mt-1 font-bold text-indigo-700">{detail.projectInfo?.name || t("N/A")}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Work Item")}</label>
                    <div className="mt-1 text-slate-800 font-medium">{formatWorkItem(detail.workItem)}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Reference Code")}</label>
                    <div className="mt-1 text-slate-800">{detail.referenceCode || "—"}</div>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-100">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Requester")}</label>
                    <div className="mt-1 text-slate-800 flex items-center gap-1.5 font-medium">
                       <User className="w-4 h-4 text-slate-400" /> {detail.createdBy?.username || t("N/A")}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Department")}</label>
                    <div className="mt-1 text-slate-800">{detail.department || "—"}</div>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-100">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Delivery Location")}</label>
                    <div className="mt-1 text-slate-800 font-medium text-sm leading-relaxed">{detail.deliveryLocation || "—"}</div>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-100">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Creation Date")}</label>
                    <div className="mt-1 text-slate-800 flex items-center gap-1.5">
                       <Calendar className="w-4 h-4 text-slate-400" /> {detail.issueDate ? new Date(detail.issueDate).toLocaleString("vi-VN") : t("N/A")}
                    </div>
                  </div>
                  {detail.description && (
                    <div className="col-span-2">
                       <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("Notes")}</label>
                       <p className="text-sm text-slate-700 mt-1 bg-amber-50/50 p-3 rounded-md border border-amber-100 italic">{detail.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

             {/* 1. Kế toán duyệt (Check Budget/WBS) */}
              {role === "Accountant" && detail.status?.toLowerCase() === "pending_review" && (
                <Card className="border-indigo-200 shadow-sm bg-indigo-50/30 gap-0">
                  <CardHeader className="border-b border-indigo-100 pt-4 pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-indigo-800">
                      <ClipboardList className="w-5 h-5" /> {t("Accountant Review")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 flex flex-col gap-3">
                    <p className="text-sm text-indigo-700/80 mb-2">
                      {detail.projectInfo.isOverBudget 
                        ? t("Warning: This request exceeds the project budget. Approving it will forward it to the Admin.") 
                        : t("Budget is OK. Approving will forward to the Warehouse.")}
                    </p>
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm h-11" onClick={() => handleReview("Approved")} disabled={reviewing}>
                      {reviewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} {t("Verify & Continue")}
                    </Button>
                    <Button variant="outline" className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 h-11" onClick={() => handleReview("Rejected")} disabled={reviewing}>
                      <XCircle className="w-4 h-4 mr-2" /> {t("Reject Request")}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* 2. Admin duyệt xuất lố (Over Budget) */}
              {role === "Admin" && detail.status?.toLowerCase() === "pending_admin_approval" && (
                <Card className="border-rose-200 shadow-sm bg-rose-50/50 gap-0">
                  <CardHeader className="border-b border-rose-100 pt-4 pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-rose-800">
                      <ShieldCheck className="w-5 h-5" /> Duyệt Vượt Ngân Sách
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 flex flex-col gap-3">
                    <p className="text-sm text-rose-700/80 mb-2">
                      {t("This request exceeds the project budget. Please review carefully.")}
                    </p>
                    
                    <Button 
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm h-11" 
                      onClick={() => setIsAdminSigning(true)} 
                      disabled={reviewing}
                    >
                      <FileSignature className="w-4 h-4 mr-2" /> Xác nhận & Ký duyệt
                    </Button>
                    
                    <Button variant="outline" className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 h-11" onClick={() => handleReview("Rejected")} disabled={reviewing}>
                      <XCircle className="w-4 h-4 mr-2" /> {t("Reject")}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* 3. Quản lý kho duyệt xuất hàng vật lý */}
              {role === "WarehouseManager" && detail.status?.toLowerCase() === "approved" && (
                <Card className="border-emerald-200 shadow-sm bg-emerald-50/30 gap-0">
                  <CardHeader className="border-b border-emerald-100 pt-4 pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-emerald-800">
                      <ClipboardList className="w-5 h-5" /> {t("Warehouse Approval")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 flex flex-col gap-3">
                    <p className="text-sm text-emerald-700/80 mb-2">
                      {t("Please check stock and confirm material release.")}
                    </p>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm h-11" onClick={() => handleReview("Ready_to_Pick")} disabled={reviewing}>
                      {reviewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} {t("Confirm Release")}
                    </Button>
                    <Button variant="outline" className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 h-11" onClick={() => handleReview("Rejected")} disabled={reviewing}>
                      <XCircle className="w-4 h-4 mr-2" /> {t("Reject")}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* CARD KẾ TOÁN CHỐT PHƯƠNG ÁN XUẤT KHO / MUA THẲNG */}
              {role === "Accountant" && detail.status === "Approved" && (
                <Card className="border-indigo-200 shadow-sm bg-indigo-50/30 gap-0">
                  <CardHeader className="border-b border-indigo-100 pt-4 pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-indigo-800">
                      <PackageSearch className="w-5 h-5" /> {t("Xác nhận Phương án")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 flex flex-col gap-3">
                    <p className="text-sm text-indigo-700/80 mb-2">
                      Vui lòng rà soát lại nguồn xuất FIFO và phương án ở bảng bên trái trước khi chốt lệnh.
                    </p>
                    <Button 
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm h-11" 
                      onClick={handleAcceptPlanClick} 
                      disabled={reviewing || Object.keys(inventoryDecisions).length !== detail.details.length}
                    >
                      {reviewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} 
                      Chấp nhận phương án
                    </Button>
                  </CardContent>
                </Card>
                )}

              {/* KẾ TOÁN CHUYỂN LỆNH SAU KHI ĐÃ CHIA TÁCH (TRẠNG THÁI GỐC LÀ PROCESSED) */}
              {role === "Accountant" && detail.status?.toLowerCase() === "processed" && generatedSlips && (
                <Card className="border-indigo-200 shadow-sm bg-indigo-50/30 gap-0">
                  <CardHeader className="border-b border-indigo-100 pt-4 pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-indigo-800">
                      <ClipboardList className="w-5 h-5" /> {t("Xác nhận Chuyển lệnh")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 flex flex-col gap-4">
                    <p className="text-sm text-indigo-700/80 mb-2">
                      Hệ thống đã phân bổ vật tư thành các lệnh tương ứng. Vui lòng bấm gửi để chuyển tiếp quy trình.
                    </p>
                    
                    {/* BẢN NHÁP 1: PHIẾU XUẤT KHO */}
                    {generatedSlips.inventoryId && (
                      <div className="p-3 bg-white border border-emerald-200 rounded-md flex flex-col gap-3 relative overflow-hidden">
                        {generatedSlips.inventorySent && (
                          <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center">
                            <Badge className="bg-emerald-100 text-emerald-700 border-none"><CheckCircle2 className="w-4 h-4 mr-1" /> Đã gửi Thủ kho</Badge>
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-emerald-800 flex items-center gap-1.5">
                            📦 Phiếu xuất kho: {generatedSlips.inventoryCode}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Đã chốt lô FIFO và giữ chỗ tồn kho.</p>
                        </div>
                        <Button 
                          onClick={() => handleSendInventorySlip(generatedSlips.inventoryId!)} 
                          className="w-full bg-emerald-600 hover:bg-emerald-700 h-10 text-white"
                          disabled={reviewing || generatedSlips.inventorySent}
                        >
                          {reviewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                          Gửi lệnh cho Thủ kho
                        </Button>
                      </div>
                    )}

                    {/* BẢN NHÁP 2: ĐƠN MUA NGOÀI */}
                    {generatedSlips.poId && (
                      <div className="p-3 bg-white border border-amber-200 rounded-md flex flex-col gap-3 mt-1 relative overflow-hidden">
                        {generatedSlips.poSent && (
                          <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center">
                            <Badge className="bg-amber-100 text-amber-700 border-none"><CheckCircle2 className="w-4 h-4 mr-1" /> Đã gửi Thu mua</Badge>
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-amber-800 flex items-center gap-1.5">
                            🛒 Đơn mua ngoài: {generatedSlips.poCode}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Yêu cầu mua xuất thẳng cho các vật tư không đủ tồn kho.</p>
                        </div>
                        <Button 
                          onClick={() => handleSendPO(generatedSlips.poId!)} 
                          className="w-full bg-amber-500 hover:bg-amber-600 h-10 text-white"
                          disabled={reviewing || generatedSlips.poSent}
                        >
                          {reviewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                          Gửi phòng Mua hàng
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* THỦ KHO: PHÂN CÔNG ĐI NHẶT HÀNG */}
              {role === "WarehouseManager" && detail.status?.toLowerCase() === "pending_warehouse_approval" && (
                <Card className="border-blue-200 shadow-sm bg-blue-50/30 gap-0">
                  <CardHeader className="border-b border-blue-100 pt-4 pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-blue-800">
                      <User className="w-5 h-5" /> {t("Phân công Xuất kho")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 flex flex-col gap-4">
                    <p className="text-sm text-blue-700/80">
                      Phiếu xuất kho đã được Kế toán duyệt và chốt danh sách Lô (FIFO). Vui lòng chọn nhân viên để tiến hành đi nhặt hàng.
                    </p>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Chọn nhân viên kho (Picker)</label>
                      <Select value={selectedPicker} onValueChange={setSelectedPicker}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="-- Chọn nhân viên --" />
                        </SelectTrigger>
                        <SelectContent>
                          {pickers.map((p) => (
                            <SelectItem key={p.userId} value={p.userId.toString()}>
                              {p.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      onClick={async () => {
                        if (!selectedPicker) {
                          toast.error("Vui lòng chọn nhân viên kho!");
                          return;
                        }
                        try {
                          setReviewing(true);
                          // Gọi API đẩy phiếu sang trạng thái Đang nhặt hàng (Kèm ID nhân viên)
                          await issueSlipApi.changeStatus(issueId, { 
                            action: "Picking_In_Progress", 
                            reason: "",
                            assignedPickerId: Number(selectedPicker) // Truyền thêm ID vào đây
                          });
                          toast.success("Đã giao việc thành công!");
                          const data = await issueSlipApi.getIssueSlipDetail(issueId);
                          setDetail(data);
                        } catch (e) {
                          toast.error("Có lỗi xảy ra khi giao việc.");
                        } finally {
                          setReviewing(false);
                        }
                      }} 
                      className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-white shadow-sm"
                      disabled={reviewing || !selectedPicker}
                    >
                      {reviewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardList className="w-4 h-4 mr-2" />}
                      Giao việc & Bắt đầu xuất
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* MODAL 1: CHỌN LÔ THỦ CÔNG */}
              <Dialog open={isBatchModalOpen} onOpenChange={setIsBatchModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Chỉ định Lô xuất - {editingItem?.name}</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <div className="text-sm mb-4 flex justify-between bg-slate-50 p-2 rounded">
                      <span>Yêu cầu xuất: <b>{editingItem?.requestedQuantity} {editingItem?.unit}</b></span>
                      <span>Tổng kho: <b>{editingItem?.availableQuantity}</b></span>
                    </div>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                      {availableBatches.map(b => (
                        <div key={b.batchId} className="flex items-center justify-between border-b pb-2">
                          <div>
                            <div className="font-semibold text-sm">📦 {b.batchCode}</div>
                            <div className="text-xs text-slate-500">Tồn: {b.availableQuantity} | HSD: {b.mfgDate || 'N/A'}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Lấy:</span>
                            <Input 
                              type="number" 
                              className="w-20 h-8 text-right font-bold text-indigo-600"
                              value={batchInputs[b.batchId] || ""}
                              onChange={(e) => setBatchInputs(prev => ({ ...prev, [b.batchId]: Number(e.target.value) }))}
                              max={b.availableQuantity}
                              min={0}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsBatchModalOpen(false)}>Hủy</Button>
                    <Button onClick={saveBatchChanges} className="bg-indigo-600 hover:bg-indigo-700 text-white">Lưu thay đổi</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* MODAL 2: XÁC NHẬN TÁCH PHIẾU (SPLIT WARNING) */}
              <Dialog open={isSplitConfirmOpen} onOpenChange={setIsSplitConfirmOpen}>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="w-5 h-5" /> Xác nhận Chia tách Yêu cầu
                    </DialogTitle>
                  </DialogHeader>
                  <div className="py-4 text-sm text-slate-700">
                    <p className="mb-4 text-slate-600">
                      Dựa trên phương án bạn đã chọn, hệ thống sẽ phân bổ lại yêu cầu vật tư như sau. Vui lòng kiểm tra kỹ trước khi gửi lệnh xuống Kho và phòng Mua hàng.
                    </p>

                    <div className="bg-slate-50 border border-slate-200 rounded-md p-3 max-h-[300px] overflow-y-auto space-y-3">
                      {splitPreviewData.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800">{item.name}</span>
                            <span className="text-xs text-slate-500">Yêu cầu: {item.requested} {item.unit}</span>
                          </div>
                          <div className="text-right flex gap-4">
                            {/* Cột Xuất Kho */}
                            <div className={`flex flex-col items-end ${item.inStock > 0 ? '' : 'opacity-30'}`}>
                              <span className="text-[10px] uppercase font-semibold text-slate-400">Xuất kho</span>
                              <span className="text-emerald-600 font-bold">{item.inStock}</span>
                            </div>
                            {/* Cột Mua Ngoài */}
                            <div className={`flex flex-col items-end ${item.toBuy > 0 ? '' : 'opacity-30'}`}>
                              <span className="text-[10px] uppercase font-semibold text-slate-400">Mua ngoài</span>
                              <span className="text-rose-600 font-bold">{item.toBuy}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                    </div>
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>Hệ thống sẽ tự động chốt phiếu xuất kho cho các phần <b>Xuất kho</b>, và tạo một Đơn mua xuất thẳng (Direct PO) mang mã tham chiếu phiếu này cho các phần <b>Mua ngoài</b>.</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsSplitConfirmOpen(false)}>Hủy, Xem lại</Button>
                    {/* BẤM NÚT NÀY MỚI THỰC SỰ GỌI executeProcessInventory() XUỐNG DB */}
                    <Button onClick={executeProcessInventory} className="bg-amber-600 hover:bg-amber-700 text-white">
                      Xác nhận Phân bổ & Xử lý
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* ================= MODAL KÝ TÊN CỦA ADMIN ================= */}
              <Dialog open={isAdminSigning} onOpenChange={(open) => { 
                setIsAdminSigning(open); 
                if (!open && sigCanvas.current) { sigCanvas.current.clear(); setIsSigned(false); } 
              }}>
                <DialogContent className="sm:max-w-[450px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-rose-700">
                      <FileSignature className="w-5 h-5" /> Chữ ký Admin
                    </DialogTitle>                                                              
                    <DialogDescription>
                      Xác nhận phê duyệt cấp phát vật tư vượt quá ngân sách dự án.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-2">
                    <div className="flex justify-between items-end mb-2">
                      <label className="text-sm font-semibold text-slate-700">Ký tên tại đây <span className="text-red-500">*</span></label>
                      {isSigned && (
                        <button onClick={clearSignature} className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors">
                          <Eraser className="w-3 h-3" /> Vẽ lại
                        </button>
                      )}
                    </div>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 overflow-hidden relative group">
                      <SignatureCanvas 
                        ref={sigCanvas} 
                        onEnd={handleSignatureEnd} 
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
                    <Button variant="outline" onClick={() => setIsAdminSigning(false)}>{t("Cancel")}</Button>
                    <Button 
                      className="bg-rose-600 hover:bg-rose-700 text-white" 
                      onClick={handleConfirmSignature} 
                      disabled={reviewing || !isSigned}
                    >
                      {reviewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <ShieldCheck className="w-4 h-4 mr-2"/>} 
                      Xác nhận & Nhận mã OTP
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* ================= MODAL NHẬP OTP CỦA ADMIN ================= */}
              <Dialog open={isOtpModalOpen} onOpenChange={setIsOtpModalOpen}>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-rose-700">
                      <ShieldCheck className="w-5 h-5" /> Xác thực bảo mật OTP
                    </DialogTitle>
                    <DialogDescription>
                      Hệ thống đã gửi một mã bảo mật gồm 6 ký tự đến số điện thoại của bạn. Vui lòng kiểm tra tin nhắn.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-6 flex flex-col items-center justify-center space-y-4">
                    <OTPInput
                      maxLength={6}
                      value={otp}
                      onChange={setOtp}
                      render={({ slots }) => (
                        <div className="flex gap-2 sm:gap-3">
                          {slots.map((slot, index) => (
                            <div
                              key={index}
                              className={`relative w-12 h-14 flex items-center justify-center text-3xl font-bold border rounded-lg bg-white transition-all ${
                                slot.isActive 
                                  ? "border-rose-500 ring-2 ring-rose-100" // Hiệu ứng khi ô đang được trỏ vào
                                  : "border-slate-300"
                              }`}
                            >
                              {/* Hiển thị số người dùng nhập */}
                              {slot.char}
                              
                              {/* Hiển thị thanh nháy (Caret) giả lập để người dùng biết đang ở ô nào */}
                              {slot.hasFakeCaret && (
                                <div className="absolute pointer-events-none inset-0 flex items-center justify-center animate-pulse">
                                  <div className="w-[2px] h-8 bg-slate-900" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    />
                    <p className="text-xs text-slate-500">Mã OTP sẽ hết hạn trong 5 phút nữa.</p>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setIsOtpModalOpen(false)}>Hủy</Button>
                    <Button 
                      className="bg-rose-600 hover:bg-rose-700 text-white" 
                      onClick={handleConfirmOtp} 
                      disabled={reviewing || otp.length !== 6}
                    >
                      {reviewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>} 
                      Hoàn tất phê duyệt
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
