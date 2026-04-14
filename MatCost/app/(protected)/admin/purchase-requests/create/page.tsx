"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  Save,
  Loader2,
  Building2,
  PackagePlus,
  AlertTriangle,
  BellRing,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
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
import {
  adminPurchaseRequestApi,
  adminStockShortageAlertApi,
  StockShortageAlertDto,
} from "@/services/import-service";
import { projectApi, ProjectDto } from "@/services/project-services";
import { materialApi, MaterialDto } from "@/services/material-service";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { showConfirmToast } from "@/hooks/confirm-toast";

interface RequestItemInput {
  id: string;
  materialId: string;
  quantity: string;
  notes: string;
  isFromAlert: boolean;
}

export default function CreatePurchaseRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const urlAlertId = searchParams.get("alertId");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [projectId, setProjectId] = useState<string>("");
  const [selectedAlertId, setSelectedAlertId] = useState<string>(
    urlAlertId || "",
  );
  const [items, setItems] = useState<RequestItemInput[]>([]);

  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [alerts, setAlerts] = useState<StockShortageAlertDto[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingData(true);
      try {
        const [projRes, matRes, alertsRes] = await Promise.all([
          projectApi.getProjects(),
          materialApi.getAll(),
          adminStockShortageAlertApi.getConfirmedAlerts(),
        ]);

        setProjects(projRes);
        setMaterials(matRes.data);
        setAlerts(alertsRes.data);

        if (
          urlAlertId &&
          !alertsRes.data.find((a) => a.alertId.toString() === urlAlertId)
        ) {
          toast.warning(
            t("This alert might have already been resolved or doesn't exist."),
          );
        }
      } catch (error) {
        console.error("Failed to load initial data", error);
        toast.error(t("Failed to load necessary data."));
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchInitialData();
  }, [t, urlAlertId]);

  useEffect(() => {
    const fetchAlertDetails = async () => {
      if (!selectedAlertId) {
        setItems([]);
        return;
      }

      try {
        const res = await adminStockShortageAlertApi.getAlert(
          Number(selectedAlertId),
        );
        const alertData = res.data;

        if (alertData) {
          const alertItem: RequestItemInput = {
            id: crypto.randomUUID(),
            materialId: alertData.materialId.toString(),
            quantity: alertData.suggestedQuantity?.toString() || "",
            notes:
              alertData.notes ||
              `Auto-generated from Alert #${alertData.alertId}`,
            isFromAlert: true,
          };

          setItems((prev) => {
            const manualItems = prev.filter((i) => !i.isFromAlert);
            return [alertItem, ...manualItems];
          });
          setCurrentPage(1);
        }
      } catch (error) {
        console.error("Failed to load alert detail", error);
        toast.error(t("Failed to load alert details."));
        setItems((prev) => prev.filter((i) => !i.isFromAlert));
      }
    };

    fetchAlertDetails();
  }, [selectedAlertId, t]);

  const handleItemChange = (
    id: string,
    field: keyof RequestItemInput,
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleAddItem = () => {
    setItems((prev) => {
      const newItems = [
        ...prev,
        {
          id: crypto.randomUUID(),
          materialId: "",
          quantity: "",
          notes: "",
          isFromAlert: false,
        },
      ];
      const newTotalPages = Math.ceil(newItems.length / itemsPerPage);
      setCurrentPage(newTotalPages);
      return newItems;
    });
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const newItems = prev.filter((item) => item.id !== id);
      const newTotalPages = Math.ceil(newItems.length / itemsPerPage) || 1;
      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
      }
      return newItems;
    });
  };

  const handleSubmit = () => {
    if (!projectId) {
      return toast.error(t("Please select a project."));
    }

    if (!selectedAlertId) {
      return toast.error(t("Please select an active alert to resolve."));
    }

    const invalidItem = items.find(
      (i) => !i.materialId || !i.quantity || Number(i.quantity) <= 0,
    );
    if (invalidItem) {
      return toast.error(
        t("Please select material and enter a valid quantity for all items."),
      );
    }

    showConfirmToast({
      title: t("Submit Purchase Request?"),
      description: t(
        "Are you sure you want to create a purchase request from this alert?",
      ),
      confirmLabel: t("Yes, Submit"),
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          const alertOriginalItem = items.find((i) => i.isFromAlert);

          const payload = {
            projectId: Number(projectId),
            finalQuantity: alertOriginalItem
              ? Number(alertOriginalItem.quantity)
              : undefined,
            items: items.map((i) => ({
              materialId: Number(i.materialId),
              quantity: Number(Number(i.quantity).toFixed(3)),
              notes: i.notes,
            })),
          };

          await adminPurchaseRequestApi.createFromAlert(
            Number(selectedAlertId),
            payload,
          );
          toast.success(t("Purchase request created successfully from alert!"));

          router.push("/admin/purchase-requests");
        } catch (error: any) {
          console.error(error);
          toast.error(
            error.response?.data?.message ||
              t("Failed to create purchase request"),
          );
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const totalPages = Math.ceil(items.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);

  if (isLoadingData) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50/50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Create Purchase Request")} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6 mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="pl-0 hover:bg-transparent hover:text-indigo-600"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> {t("Back")}
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  {t("New Purchase Request")}
                  {selectedAlertId && (
                    <span className="text-xs font-normal bg-rose-100 text-rose-700 px-2 py-1 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />{" "}
                      {t("Resolving Alert")} #{selectedAlertId}
                    </span>
                  )}
                </h1>
              </div>
            </div>

            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              onClick={handleSubmit}
              disabled={isSubmitting || items.length === 0}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {t("Submit Request")}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-rose-200 shadow-sm gap-0">
                <CardHeader className="border-b border-rose-100 pb-4 bg-white/50 pt-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-rose-800">
                    <BellRing className="w-5 h-5 text-rose-600" />
                    {t("Select Active Alert")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        {t("Stock Shortage Alert")}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={selectedAlertId}
                        onValueChange={setSelectedAlertId}
                      >
                        <SelectTrigger
                          className={`w-full min-h-[80px] py-2 ${!selectedAlertId ? "bg-white border-rose-300 ring-1 ring-rose-100" : "bg-slate-50 border-slate-200"}`}
                        >
                          <SelectValue
                            placeholder={t("Select an alert to resolve...")}
                          />
                        </SelectTrigger>
                        <SelectContent
                          showSearch
                          className="w-[var(--radix-select-trigger-width)] max-h-[300px]"
                        >
                          {alerts.length === 0 ? (
                            <div className="p-3 text-sm text-slate-500 text-center">
                              {t("No confirmed alerts found.")}
                            </div>
                          ) : (
                            alerts.map((a: any) => (
                              <SelectItem
                                key={a.alertId}
                                value={a.alertId.toString()}
                                className="group cursor-pointer focus:bg-indigo-600"
                              >
                                <div className="flex flex-col py-1 text-left">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-800 transition-colors group-focus:text-white">
                                      Alert #{a.alertId}
                                    </span>
                                    {a.priority === "High" && (
                                      <span className="rounded-sm bg-rose-100 px-1.5 text-[10px] font-medium text-rose-700 transition-colors group-focus:bg-rose-500 group-focus:text-white">
                                        High
                                      </span>
                                    )}
                                  </div>
                                  <span className="mt-1 text-xs text-slate-500 transition-colors group-focus:text-indigo-100">
                                    [{a.materialCode}] {a.materialName}
                                  </span>
                                  <span className="mt-0.5 text-[11px] font-medium text-indigo-600 transition-colors group-focus:text-white">
                                    Qty: {a.suggestedQuantity}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500 mt-1">
                        {t("Only Manager-confirmed alerts appear here.")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm bg-white gap-0">
                <CardHeader className="border-b border-slate-100 pb-4 pt-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    {t("Project Allocation")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        {t("Destination Project")}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <Select value={projectId} onValueChange={setProjectId}>
                        <SelectTrigger className="w-full bg-slate-50 border-slate-200 h-10">
                          <SelectValue placeholder={t("Select a project...")} />
                        </SelectTrigger>
                        <SelectContent showSearch>
                          {projects.map((p) => (
                            <SelectItem
                              key={p.projectId}
                              value={p.projectId.toString()}
                            >
                              <span className="font-medium">[{p.code}]</span>{" "}
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500 mt-1">
                        {t("Select the project that requires this material.")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3">
              <Card className="border-slate-200 shadow-sm bg-white min-h-[700px] flex flex-col gap-0 pb-0">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 pt-2">
                    <PackagePlus className="w-5 h-5 text-indigo-600" />
                    {t("Shortage Material")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col">
                  <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-[45%] pl-6">
                          {t("Material")}
                        </TableHead>
                        <TableHead className="w-[15%] text-center">
                          {t("Required")} *
                        </TableHead>
                        <TableHead className="pr-6 text-center w-[35%]">
                          {t("Notes")}
                        </TableHead>
                        <TableHead className="w-[5%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-40 text-center text-slate-500"
                          >
                            {t(
                              "Please select an Active Alert from the left panel to load materials.",
                            )}
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedItems.map((item) => (
                          <TableRow
                            key={item.id}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <TableCell className="pl-6 align-top pt-4">
                              <Select
                                value={item.materialId}
                                disabled={item.isFromAlert}
                                onValueChange={(val) =>
                                  handleItemChange(item.id, "materialId", val)
                                }
                              >
                                <SelectTrigger
                                  className={`w-full text-slate-700 h-auto py-2 ${item.isFromAlert ? "bg-slate-50 border-slate-200 opacity-100 font-medium" : "bg-white border-slate-200 focus:ring-indigo-600"}`}
                                >
                                  <SelectValue
                                    placeholder={t("Select material...")}
                                  />
                                </SelectTrigger>
                                <SelectContent
                                  showSearch
                                  className="w-[var(--radix-select-trigger-width)]"
                                >
                                  {materials.map((m) => {
                                    const isSelectedElsewhere = items.some(
                                      (i) =>
                                        i.materialId ===
                                          m.materialId.toString() &&
                                        i.id !== item.id,
                                    );

                                    return (
                                      <SelectItem
                                        key={m.materialId}
                                        value={m.materialId.toString()}
                                        disabled={isSelectedElsewhere}
                                        className="group cursor-pointer focus:bg-indigo-600 focus:text-white hover:bg-indigo-600"
                                      >
                                        <div className="flex flex-col text-left">
                                          <span
                                            className={`font-medium transition-colors ${isSelectedElsewhere ? "text-slate-400" : "text-slate-800 group-hover:text-white group-focus:text-white"}`}
                                          >
                                            [{m.code}] {m.name}
                                            {isSelectedElsewhere &&
                                              t(" (Selected)")}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="align-top pt-4">
                              <div className="relative">
                                <Input
                                  type="number"
                                  min="1"
                                  step={
                                    materials.find(
                                      (m) =>
                                        m.materialId.toString() ===
                                        item.materialId,
                                    )?.isDecimalUnit
                                      ? "any"
                                      : "1"
                                  }
                                  placeholder={
                                    materials.find(
                                      (m) =>
                                        m.materialId.toString() ===
                                        item.materialId,
                                    )?.isDecimalUnit
                                      ? "0.00"
                                      : "0"
                                  }
                                  className="w-full text-right pr-12 border-indigo-200 focus-visible:ring-indigo-600"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const isDecimal = materials.find(
                                      (m) =>
                                        m.materialId.toString() ===
                                        item.materialId,
                                    )?.isDecimalUnit;

                                    let newValue = e.target.value;

                                    if (!isDecimal) {
                                      newValue = newValue.replace(/[.,]/g, "");
                                    }

                                    handleItemChange(
                                      item.id,
                                      "quantity",
                                      newValue.replace(/-/g, "").slice(0, 12),
                                    );
                                  }}
                                />
                                <span className="absolute right-3 top-2.5 text-xs font-medium text-slate-400 pointer-events-none">
                                  {item.materialId
                                    ? materials.find(
                                        (m) =>
                                          m.materialId.toString() ===
                                          item.materialId,
                                      )?.unit || ""
                                    : ""}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="align-top pt-4 pr-6">
                              <Input
                                placeholder={t("Optional notes...")}
                                className="w-full"
                                value={item.notes}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.id,
                                    "notes",
                                    e.target.value,
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell className="align-top pt-4 text-center pr-4">
                              {!item.isFromAlert && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 -ml-2"
                                  title={t("Remove item")}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>

                  {items.length > 0 && (
                    <div className="mt-auto">
                      <div className="p-4 border-t border-slate-100 flex justify-center bg-slate-50/50">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddItem}
                          className="border-dashed border-2 hover:border-indigo-400 hover:text-white text-slate-500 bg-white"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {t("Add Extra Material")}
                        </Button>
                      </div>

                      {items.length > itemsPerPage && (
                        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-white">
                          <div className="text-sm text-slate-500">
                            {t("Showing")}{" "}
                            <span className="font-medium text-slate-900">
                              {startIndex + 1}
                            </span>{" "}
                            {t("to")}{" "}
                            <span className="font-medium text-slate-900">
                              {Math.min(endIndex, items.length)}
                            </span>{" "}
                            {t("of")}{" "}
                            <span className="font-medium text-slate-900">
                              {items.length}
                            </span>{" "}
                            {t("items")}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCurrentPage((p) => Math.max(1, p - 1))
                              }
                              disabled={currentPage === 1}
                            >
                              <ChevronLeft className="w-4 h-4 mr-1" />{" "}
                              {t("Prev")}
                            </Button>
                            <div className="text-sm font-medium text-slate-600 px-2">
                              {t("Page")} {currentPage} {t("of")} {totalPages}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCurrentPage((p) =>
                                  Math.min(totalPages, p + 1),
                                )
                              }
                              disabled={currentPage === totalPages}
                            >
                              {t("Next")}{" "}
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>

                {items.length > 0 && (
                  <div className="p-4 bg-yellow-50 text-yellow-700 text-sm border-t border-yellow-100 flex items-start gap-2 rounded-b-xl">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold">
                        {t("Active Stock Shortage Locked")}
                      </p>
                      <p>
                        {t(
                          "You must process the required material from the alert. You can adjust its final quantity or add extra materials to this request if needed.",
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
