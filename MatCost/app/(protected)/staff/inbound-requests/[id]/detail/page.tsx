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
  ChevronLeft,
  ChevronRight,
  X,
  ClipboardList,
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

interface ViewItemDetail {
  materialId: number;
  materialCode: string;
  materialName: string;
  totalQuantity: number;
  batch: {
    batchCode: string;
    mfgDate?: string | null;
    expiryDate?: string | null;
    certificateImage?: string | null;
  };
  binAllocations: {
    id: string;
    binCode: string;
    quantity: number;
  }[];
}

export default function ReceiptDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [viewItems, setViewItems] = useState<ViewItemDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        // 1. GỌI API LẤY THẺ KHO
        const res = await staffReceiptsApi.getWarehouseCards({
          transactionType: "Import",
          referenceId: id,
          referenceType: "Receipt",
        });

        const cards = res.data || [];

        const groupedItems: ViewItemDetail[] = [];
        
        cards.forEach((card: any) => {
          let item = groupedItems.find((i) => i.materialId === card.materialId);
          if (!item) {
            item = {
              materialId: card.materialId,
              materialCode: card.materialCode,
              materialName: card.materialName,
              totalQuantity: 0,
              batch: {
                batchCode: card.batchCode || "N/A",
                mfgDate: null, 
                expiryDate: null,
                certificateImage: null, 
              },
              binAllocations: [],
            };
            groupedItems.push(item);
          }

          item.binAllocations.push({
            id: card.cardId.toString(),
            binCode: card.binCode,
            quantity: card.quantity,
          });
          item.totalQuantity += card.quantity;
        });

        const batchPromises = groupedItems.map(async (item) => {
          if (item.batch.batchCode && item.batch.batchCode !== "N/A") {
            try {
              const batchRes = await staffReceiptsApi.getBatches(
                item.materialId, 
                item.batch.batchCode
              );
              
              const batchInfo = batchRes.data?.[0]; 
              if (batchInfo) {
                item.batch.mfgDate = batchInfo.mfgDate;
                item.batch.expiryDate = batchInfo.expiryDate;
                item.batch.certificateImage = batchInfo.certificateImage; 
              }
            } catch (err) {
              console.error(`Failed to fetch batch for material ${item.materialId}`, err);
            }
          }
          return item;
        });

        await Promise.all(batchPromises);

        setViewItems(groupedItems);
      } catch (error: any) {
        console.error(error);
        toast.error(
          error.response?.data?.message || t("Failed to fetch receipt details."),
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchDetails();
  }, [id, t]);

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

  const totalItems = viewItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = viewItems.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("Receipt Details")} #${id}`} />

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
                  <ClipboardList className="w-6 h-6 text-indigo-600" />
                  {t("Receipt Allocations")}
                </h1>
              </div>
            </div>
          </div>

          {/* LIST ITEMS */}
          {viewItems.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-lg text-center shadow-sm">
              <p>{t("No allocation details found for this receipt.")}</p>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                {paginatedItems.map((item) => (
                  <Card
                    key={item.materialId}
                    className="border-slate-200 shadow-sm bg-white overflow-hidden gap-0"
                  >
                    <CardHeader className="border-b border-slate-100 py-4 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-indigo-800">
                          <Package className="w-5 h-5 text-indigo-600" />
                          {item.materialName}
                        </CardTitle>
                        <p className="text-xs text-slate-500 font-mono mt-1 ml-7">
                          {item.materialCode}
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">
                          {t("Total Quantity")}
                        </span>
                        <Badge
                          variant="outline"
                          className="bg-white border-indigo-200 text-indigo-700 px-3 py-1 text-sm"
                        >
                          {item.totalQuantity}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0">
                      <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        {/* CỘT TRÁI: THÔNG TIN BATCH */}
                        <div className="md:col-span-5 p-6 space-y-5">
                          <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800 mb-4 border-b border-slate-100 pb-2">
                            <CalendarDays className="w-4 h-4 text-slate-500" />
                            {t("Batch Details")}
                          </h3>

                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-slate-400 uppercase">
                              {t("Batch Code")}
                            </span>
                            <p className="text-sm font-medium text-slate-800 bg-slate-50 p-2 rounded-md border border-slate-100">
                              {item.batch.batchCode}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <span className="text-xs font-semibold text-slate-400 uppercase">
                                {t("Manufactured Date")}
                              </span>
                              <p className="text-sm font-medium text-slate-800">
                                {formatDate(item.batch.mfgDate)}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs font-semibold text-slate-400 uppercase">
                                {t("Expiry Date")}
                              </span>
                              <p className="text-sm font-medium text-slate-800">
                                {formatDate(item.batch.expiryDate)}
                              </p>
                            </div>
                          </div>

                          {item.batch.certificateImage && (
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              <span className="text-xs font-semibold text-slate-400 uppercase">
                                {t("Certificate Image")}
                              </span>
                              <div
                                className="relative w-24 h-24 border border-slate-200 rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => {
                                  if (item.batch.certificateImage) {
                                    setViewerImage(item.batch.certificateImage);
                                    setIsViewerOpen(true);
                                  }
                                }}
                              >
                                <img
                                  src={item.batch.certificateImage}
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

                        {/* CỘT PHẢI: CHI TIẾT PHÂN BỔ KỆ */}
                        <div className="md:col-span-7 p-6 flex flex-col">
                          <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2 mb-4">
                            <MapPin className="w-4 h-4 text-slate-500" />
                            {t("Bin Allocations")}
                          </h3>

                          <div className="space-y-3">
                            {item.binAllocations.map((bin) => (
                              <div
                                key={bin.id}
                                className="flex items-center justify-between bg-indigo-50/50 p-3 rounded-lg border border-indigo-100"
                              >
                                <div className="flex flex-col">
                                  <span className="text-[10px] uppercase text-indigo-500 font-semibold">
                                    {t("Bin Location")}
                                  </span>
                                  <span className="text-sm font-bold text-indigo-900">
                                    {bin.binCode}
                                  </span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="text-[10px] uppercase text-slate-500 font-semibold">
                                    {t("Quantity")}
                                  </span>
                                  <span className="text-sm font-bold text-slate-800">
                                    {bin.quantity}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* PAGINATION FOOTER */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm mt-6">
                  <span className="text-sm text-slate-500">
                    {t("Showing")}{" "}
                    <span className="font-semibold text-slate-800">
                      {startIndex + 1}
                    </span>{" "}
                    -{" "}
                    <span className="font-semibold text-slate-800">
                      {Math.min(startIndex + itemsPerPage, totalItems)}
                    </span>{" "}
                    {t("of")}{" "}
                    <span className="font-semibold text-slate-800">
                      {totalItems}
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 shadow-sm"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> {t("Prev")}
                    </Button>
                    <span className="text-sm font-medium text-slate-600 px-3 min-w-[70px] text-center">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="h-8 shadow-sm"
                    >
                      {t("Next")} <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

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