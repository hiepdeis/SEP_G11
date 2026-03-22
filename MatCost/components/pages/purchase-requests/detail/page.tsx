"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  Loader2,
  CalendarDays,
  Building2,
  Package,
  FileText,
  AlertTriangle,
  User,
  Hash,
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
  adminPurchaseRequestApi,
  PurchaseRequestDto,
} from "@/services/import-service";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function PurchaseRequestDetailPage({ role = "admin" }) {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();

  const id = Number(params.id);

  const [request, setRequest] = useState<PurchaseRequestDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRequestDetail = async () => {
      setIsLoading(true);
      try {
        const res = await adminPurchaseRequestApi.getRequest(id);
        setRequest(res.data);
      } catch (error: any) {
        console.error("Failed to fetch purchase request detail", error);
        toast.error(
          error.response?.data?.message || t("Purchase request not found"),
        );
        router.push("/admin/purchase-requests");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchRequestDetail();
    }
  }, [id, router, t]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Submitted":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "Approved":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Rejected":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-2 text-indigo-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">
            {t("Loading request details...")}
          </p>
        </div>
      </div>
    );
  }

  if (!request) return null;

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("Request Detail")} #${request.requestCode}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6 mx-auto w-full">
          {/* Top Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={() => {
                role == "admin"
                  ? router.push("/admin/purchase-requests")
                  : router.push("/purchasing/purchase-orders");
              }}
              className="pl-0 hover:bg-transparent hover:text-indigo-600 w-fit"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back to List")}
            </Button>

            <div className="flex items-center gap-3">
              {t("Status")}:
              <Badge
                variant="outline"
                className={`px-3 py-1 text-sm font-medium ${getStatusBadge(request.status)}`}
              >
                {t(request.status)}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* THÔNG TIN CHUNG (GENERAL INFO) */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-slate-200 shadow-sm bg-white gap-0">
                <CardHeader className="border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    {t("General Information")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5 pb-0">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Request Code")}
                    </span>
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <Hash className="w-4 h-4 text-slate-400" />
                      {request.requestCode}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Project")}
                    </span>
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {request.projectName}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Created Date")}
                    </span>
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <CalendarDays className="w-4 h-4 text-slate-400" />
                      {formatDate(request.createdAt)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Created By")}
                    </span>
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <User className="w-4 h-4 text-slate-400" />
                      Admin ID: {request.createdBy}
                    </div>
                  </div>

                  {request.alertId && (
                    <div className="pt-4 border-t border-slate-100">
                      <div className="bg-rose-50 text-rose-700 p-3 rounded-md flex flex-col gap-1 border border-rose-100">
                        <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {t("Triggered By Alert")}
                        </span>
                        <span className="font-medium text-sm">
                          Alert ID #{request.alertId}
                        </span>
                        <span className="text-xs opacity-80 mt-0.5">
                          {t(
                            "This request was auto-generated to resolve a stock shortage.",
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* CHI TIẾT VẬT TƯ (MATERIALS LIST) */}
            <div className="lg:col-span-2">
              <Card className="border-slate-200 shadow-sm bg-white min-h-[400px] flex flex-col gap-0">
                <CardHeader className="border-b border-slate-100 py-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <Package className="w-5 h-5 text-indigo-600" />
                    {t("Requested Materials")}
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="bg-white text-slate-700 border-slate-200"
                  >
                    {request.items?.length || 0} {t("Items")}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0">
                        <TableRow>
                          <TableHead className="w-[5%] pl-6">#</TableHead>
                          <TableHead className="w-[45%]">
                            {t("Material")}
                          </TableHead>
                          <TableHead className="w-[20%] text-center">
                            {t("Quantity")}
                          </TableHead>
                          <TableHead className="w-[30%] pr-6">
                            {t("Notes")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {request.items && request.items.length > 0 ? (
                          request.items.map((item, index) => (
                            <TableRow
                              key={item.itemId}
                              className="hover:bg-slate-50/50 transition-colors"
                            >
                              <TableCell className="pl-6 text-slate-500 font-medium">
                                {index + 1}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col text-left">
                                  <span className="font-semibold text-slate-800">
                                    {item.materialName}
                                  </span>
                                  <span className="text-xs text-slate-500 mt-0.5 font-mono">
                                    {item.materialCode}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                                  {item.quantity.toLocaleString("vi-VN")}
                                </span>
                              </TableCell>
                              <TableCell className="pr-6 text-slate-600 text-sm">
                                {item.notes ? (
                                  item.notes
                                ) : (
                                  <span className="italic text-slate-400">
                                    {t("No notes")}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="h-32 text-center text-slate-500"
                            >
                              {t("No materials found for this request.")}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
