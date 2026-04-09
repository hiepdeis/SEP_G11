"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  Loader2,
  CalendarDays,
  Package,
  AlertTriangle,
  CheckCircle2,
  Info,
  Warehouse,
  ShieldAlert,
  Hash,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  managerStockShortageAlertApi,
  StockShortageAlertDto,
} from "@/services/import-service"; // Cập nhật đúng đường dẫn
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { showConfirmToast } from "@/hooks/confirm-toast";
import { formatDateTime } from "@/lib/format-date-time";

export default function AlertDetailPage({ role = "manager" }) {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();

  const id = Number(params.id);

  const [alert, setAlert] = useState<StockShortageAlertDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);

  // Form states
  const [adjustedQuantity, setAdjustedQuantity] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    const fetchAlertDetail = async () => {
      setIsLoading(true);
      try {
        const res = await managerStockShortageAlertApi.getAlert(id);
        setAlert(res.data);

        if (res.data.status === "Pending") {
          setAdjustedQuantity(res.data.suggestedQuantity?.toString() || "");
          setNotes("");
        } else {
          setAdjustedQuantity(res.data.suggestedQuantity?.toString() || "");
          setNotes(res.data.notes || "");
        }
      } catch (error: any) {
        console.error("Failed to fetch alert detail", error);
        toast.error(error.response?.data?.message || t("Alert not found"));
        router.push("/manager/alerts");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchAlertDetail();
    }
  }, [id, router, t]);

  const handleCreatePR = () => {
    router.push(`/admin/purchase-requests/create?alertId=${id}`);
  };

  const handleConfirm = () => {
    if (!adjustedQuantity || Number(adjustedQuantity) <= 0) {
      toast.error(t("Please enter a valid quantity greater than 0."));
      return;
    }

    showConfirmToast({
      title: t("Confirm Restock Alert?"),
      description: t(
        "Are you sure you want to confirm this shortage alert with the adjusted quantity?",
      ),
      confirmLabel: t("Yes, Confirm"),
      onConfirm: async () => {
        setIsConfirming(true);
        try {
          await managerStockShortageAlertApi.confirmAlert(id, {
            adjustedQuantity: Number(adjustedQuantity),
            notes: notes.trim() || undefined,
          });

          toast.success(t("Stock shortage alert confirmed successfully."));

          const res = await managerStockShortageAlertApi.getAlert(id);
          setAlert(res.data);
        } catch (error: any) {
          console.error(error);
          toast.error(
            error.response?.data?.message || t("Failed to confirm alert."),
          );
        } finally {
          setIsConfirming(false);
        }
      },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "ManagerConfirmed":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "PRCreated":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getPriorityBadge = (priority?: string | null) => {
    if (!priority) return null;
    switch (priority.toLowerCase()) {
      case "high":
        return (
          <Badge
            variant="secondary"
            className="bg-red-100 text-red-700 px-2 py-0.5 text-xs"
          >
            High Priority
          </Badge>
        );
      case "medium":
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-100 text-yellow-700 px-2 py-0.5 text-xs"
          >
            Medium Priority
          </Badge>
        );
      case "low":
        return (
          <Badge
            variant="secondary"
            className="bg-blue-100 text-blue-700 px-2 py-0.5 text-xs"
          >
            Low Priority
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-2 text-indigo-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">{t("Loading alert details...")}</p>
        </div>
      </div>
    );
  }

  if (!alert) return null;

  const isPending = alert.status === "Pending";

  const canCreatePR = role === "admin" && alert.status === "ManagerConfirmed";

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("Alert Detail")} #${alert.alertId}`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6 mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={() => {
                router.back();
              }}
              className="pl-0 hover:bg-transparent hover:text-indigo-600 w-fit"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back to Alerts")}
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-500">
                {t("Status")}:
              </span>
              <Badge
                variant="outline"
                className={`px-3 py-1.5 text-sm font-medium ${getStatusBadge(alert.status)}`}
              >
                {alert.status === "ManagerConfirmed"
                  ? "Manager Confirmed"
                  : t(alert.status)}
              </Badge>
              {getPriorityBadge(alert.priority)}
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">
            {canCreatePR && (
              <Button
                onClick={handleCreatePR}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Package className="w-4 h-4 mr-2" />
                {t("Create Purchase Request")}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card className="border-rose-200 shadow-sm bg-rose-50/30">
                <CardHeader className="border-b border-rose-100 py-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-rose-800">
                    <ShieldAlert className="w-5 h-5" />
                    {t("Shortage Information")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Material")}
                    </span>
                    <div className="flex items-center gap-2 text-slate-800 font-medium text-lg">
                      <Package className="w-5 h-5 text-slate-400" />
                      {alert.materialName}
                    </div>
                    <p className="text-sm font-mono text-slate-500 ml-7">
                      {alert.materialCode}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Location")}
                    </span>
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <Warehouse className="w-4 h-4 text-slate-400" />
                      {alert.warehouseName || t("Main Warehouse")}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-rose-100">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        {t("Current Stock")}
                      </span>
                      <div className="text-2xl font-bold text-rose-600">
                        {alert.currentQuantity.toLocaleString("vi-VN")}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        {t("Min Level")}
                      </span>
                      <div className="text-2xl font-bold text-slate-700">
                        {alert.minStockLevel?.toLocaleString("vi-VN") || 0}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 pt-4 border-t border-rose-100">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      {t("Alert Generated At")}
                    </span>
                    <div className="flex items-center gap-2 text-slate-700 text-sm">
                      <CalendarDays className="w-4 h-4 text-slate-400" />
                      {formatDateTime(alert.createdAt)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card
                className={`border-slate-200 shadow-sm bg-white ${!isPending ? "opacity-95" : ""}`}
              >
                <CardHeader className="border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    {isPending
                      ? t("Manager Confirmation")
                      : t("Confirmation Details")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 space-y-5">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-indigo-900">
                        {t("System Suggestion")}
                      </p>
                      <p className="text-xs text-indigo-700 mt-1">
                        {t("The system recommends restocking")}{" "}
                        <strong className="text-lg mx-1">
                          {alert.suggestedQuantity?.toLocaleString("vi-VN") ||
                            0}
                        </strong>{" "}
                        {t("units to reach safe inventory levels.")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700">
                      {t("Adjusted Restock Quantity")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min="1"
                      className="text-lg font-semibold h-12 focus-visible:ring-indigo-600"
                      value={adjustedQuantity}
                      onChange={(e) =>
                        setAdjustedQuantity(
                          e.target.value.replace(/-/g, "").slice(0, 12),
                        )
                      }
                      disabled={!isPending}
                      placeholder={t("Enter quantity to restock...")}
                    />
                    {isPending && (
                      <p className="text-xs text-slate-500">
                        {t(
                          "You can modify the suggested quantity based on current operational needs.",
                        )}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700">
                      {t("Manager Notes")}
                    </label>
                    <Textarea
                      className="min-h-[100px] resize-none focus-visible:ring-indigo-600"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={!isPending}
                      placeholder={
                        isPending
                          ? t(
                              "Add any specific instructions for the purchasing team...",
                            )
                          : t("No notes provided.")
                      }
                    />
                  </div>
                  {canCreatePR && (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-between">
                      <p className="text-sm text-emerald-800 font-medium">
                        {t("This alert is ready for purchase requisition.")}
                      </p>
                      <Button
                        size="sm"
                        onClick={handleCreatePR}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {t("Create Now")}
                      </Button>
                    </div>
                  )}
                  {!isPending && alert.confirmedAt && (
                    <div className="pt-4 border-t border-slate-100 flex flex-col gap-1">
                      <span className="text-xs font-medium text-slate-500">
                        {t("Confirmed By")}: Manager {alert.confirmedByName}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        {t("Confirmed At")}: {formatDateTime(alert.confirmedAt)}
                      </span>
                    </div>
                  )}
                </CardContent>

                {isPending && (
                  <CardFooter className="border-t border-slate-100 p-4 pb-0 flex justify-end">
                    <Button
                      onClick={handleConfirm}
                      disabled={isConfirming || !adjustedQuantity}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm w-full sm:w-auto"
                    >
                      {isConfirming ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {t("Confirm Restock")}
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
