"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  Loader2,
  Package,
  CalendarDays,
  MapPin,
  FileImage,
  X,
  History,
  Hash,
  User,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { staffReceiptsApi } from "@/services/import-service";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SingleCardDetail {
  cardId: number;
  cardCode: string;
  transactionType: string;
  transactionDate: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  materialUnit: string;
  binCode: string;
  referenceType: string;
  referenceId: number;
  createdByName: string;
  warehouseName: string;
  batch: {
    batchCode: string;
    mfgDate?: string | null;
    expiryDate?: string | null;
    certificateImage?: string | null;
  };
}

export default function WarehouseCardDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [cardDetail, setCardDetail] = useState<SingleCardDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const res = await staffReceiptsApi.getWarehouseCards({
          cardId: id,
        });

        const card = res.data?.[0];

        if (!card) {
          toast.error(t("Warehouse card not found."));
          router.back();
          return;
        }

        const detail: SingleCardDetail = {
          cardId: card.cardId,
          cardCode: card.cardCode,
          transactionType: card.transactionType,
          transactionDate: card.transactionDate,
          quantity: card.quantity,
          quantityBefore: card.quantityBefore,
          quantityAfter: card.quantityAfter,
          materialId: card.materialId,
          
          materialCode: card.materialCode || "N/A",
          materialName: card.materialName || "Unknown Material",
          materialUnit: card.materialUnit || "",
          binCode: card.binCode || "N/A",
          referenceType: card.referenceType || "N/A",
          referenceId: card.referenceId,
          createdByName: card.createdByName || "Unknown",
          warehouseName: card.warehouseName || "N/A",
          
          batch: {
            batchCode: card.batchCode || "N/A",
            mfgDate: null,
            expiryDate: null,
            certificateImage: null,
          },
        };
        if (detail.batch.batchCode && detail.batch.batchCode !== "N/A") {
          try {
            const batchRes = await staffReceiptsApi.getBatches(
              detail.materialId,
              detail.batch.batchCode
            );

            const batchInfo = batchRes.data?.[0];
            if (batchInfo) {
              detail.batch.mfgDate = batchInfo.mfgDate;
              detail.batch.expiryDate = batchInfo.expiryDate;
              detail.batch.certificateImage = batchInfo.certificateImage;
            }
          } catch (err) {
            console.error(`Failed to fetch batch for material ${detail.materialId}`, err);
          }
        }

        setCardDetail(detail);
      } catch (error: any) {
        console.error(error);
        toast.error(
          error.response?.data?.message || t("Failed to fetch card details.")
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchDetail();
  }, [id, t, router]);

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return t("N/A");
    let safeDateString = dateString;
    if (!safeDateString.includes("Z") && !safeDateString.includes("+")) {
      safeDateString = safeDateString.replace(" ", "T") + "Z";
    }
    return new Date(safeDateString).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return t("N/A");
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50/50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!cardDetail) return null;

  const isImport = cardDetail.transactionType.toLowerCase() === "import";

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("Card Details")} #${cardDetail.cardCode}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 mx-auto w-full space-y-6">
          {/* ACTION BAR */}
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
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <History className="w-6 h-6 text-indigo-600" />
                  {t("Stock Movement Details")}
                </h1>
              </div>
            </div>
          </div>

          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden gap-0">
            <CardHeader className="border-b border-slate-100 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-indigo-800">
                  <Package className="w-5 h-5 text-indigo-600" />
                  {cardDetail.materialName}
                </CardTitle>
                <div className="flex items-center gap-3 mt-2 ml-7">
                  <Badge variant="secondary" className="font-mono text-xs text-slate-600">
                    {cardDetail.materialCode}
                  </Badge>
                  <span className="text-xs text-slate-500 font-medium">
                    {cardDetail.warehouseName}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                  {t("Transaction")}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    {formatDateTime(cardDetail.transactionDate)}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      isImport
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }
                  >
                    {isImport ? t("Import") : t("Export")}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* PHẦN 1: THÔNG TIN BIẾN ĐỘNG SỐ LƯỢNG */}
              <div className="p-6 bg-white border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 mb-4 uppercase tracking-wider">
                  {t("Quantity Changes")}
                </h3>
                <div className="flex items-center justify-between md:justify-start gap-4 md:gap-12">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500">{t("Before")}</span>
                    <span className="text-xl font-semibold text-slate-700">
                      {cardDetail.quantityBefore.toLocaleString("vi-VN")} <span className="text-sm text-slate-400 font-normal">{cardDetail.materialUnit}</span>
                    </span>
                  </div>

                  <ArrowRight className="w-5 h-5 text-slate-300 mt-4" />

                  <div className="flex flex-col gap-1 items-center">
                    <span className="text-xs text-slate-500">{t("Change")}</span>
                    <span className={`text-xl font-bold ${isImport ? "text-emerald-600" : "text-rose-600"}`}>
                      {isImport ? "+" : "-"}{cardDetail.quantity.toLocaleString("vi-VN")}
                    </span>
                  </div>

                  <ArrowRight className="w-5 h-5 text-slate-300 mt-4" />

                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500">{t("After")}</span>
                    <span className="text-xl font-bold text-indigo-700">
                      {cardDetail.quantityAfter.toLocaleString("vi-VN")} <span className="text-sm text-indigo-400 font-normal">{cardDetail.materialUnit}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* PHẦN 2: CHI TIẾT BATCH & BIN */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                
                {/* CỘT TRÁI: BATCH DETAILS */}
                <div className="p-6 space-y-5">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800 mb-4 border-b border-slate-100 pb-2">
                    <CalendarDays className="w-4 h-4 text-slate-500" />
                    {t("Batch Details")}
                  </h3>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase">
                      {t("Batch Code")}
                    </span>
                    <p className="text-sm font-medium text-slate-800 bg-slate-50 p-2 rounded-md border border-slate-100">
                      {cardDetail.batch.batchCode}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">
                        {t("Manufactured Date")}
                      </span>
                      <p className="text-sm font-medium text-slate-800">
                        {formatDate(cardDetail.batch.mfgDate)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">
                        {t("Expiry Date")}
                      </span>
                      <p className="text-sm font-medium text-slate-800">
                        {formatDate(cardDetail.batch.expiryDate)}
                      </p>
                    </div>
                  </div>

                  {cardDetail.batch.certificateImage && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <span className="text-xs font-semibold text-slate-400 uppercase">
                        {t("Certificate Image")}
                      </span>
                      <div
                        className="relative w-24 h-24 border border-slate-200 rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          if (cardDetail.batch.certificateImage) {
                            setViewerImage(cardDetail.batch.certificateImage);
                            setIsViewerOpen(true);
                          }
                        }}
                      >
                        <img
                          src={cardDetail.batch.certificateImage}
                          alt="Certificate"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-900/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <FileImage className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* CỘT PHẢI: LƯU TRỮ VÀ THAM CHIẾU */}
                <div className="p-6 flex flex-col space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2 mb-4">
                      <MapPin className="w-4 h-4 text-slate-500" />
                      {t("Storage Location")}
                    </h3>
                    <div className="flex items-center justify-between bg-indigo-50/50 p-4 rounded-lg border border-indigo-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-md shadow-sm border border-indigo-100">
                          <Hash className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase text-indigo-500 font-semibold">
                            {t("Bin Code")}
                          </span>
                          <span className="text-lg font-bold text-indigo-900">
                            {cardDetail.binCode || t("N/A")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2 mb-4">
                      <User className="w-4 h-4 text-slate-500" />
                      {t("Reference & Actor")}
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">{t("Reference Document")}:</span>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {cardDetail.referenceType} #{cardDetail.referenceId}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">{t("Performed By")}:</span>
                        <span className="text-sm font-medium text-slate-800">
                          {cardDetail.createdByName}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* IMAGE VIEWER DIALOG */}
        <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
          <DialogContent className="sm:max-w-3xl bg-transparent border-0 shadow-none p-0 flex flex-col items-center justify-center">
            <DialogHeader>
              <DialogTitle></DialogTitle>
            </DialogHeader>
            {viewerImage && (
              <div className="relative w-full flex flex-col items-center">
                <button
                  onClick={() => setIsViewerOpen(false)}
                  className="absolute -top-10 right-0 bg-slate-900/50 hover:bg-slate-900 text-white rounded-full p-2 backdrop-blur-sm transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
                <img
                  src={viewerImage}
                  alt="Enlarged Certificate"
                  className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}