"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  ArrowLeft,
  Save,
  Loader2,
  PackagePlus,
  FileText,
  Calculator,
  ChevronRight,
  ChevronLeft,
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
  purchasingPurchaseOrderApi,
  purchasingPurchaseRequestApi,
  PurchaseRequestDto,
} from "@/services/import-service";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/format-currency";
import { showConfirmToast } from "@/hooks/confirm-toast";
import { CurrencyInput } from "@/components/ui/custom/currency-input";
interface OrderItemInput {
  id: string;
  materialId: number;
  materialCode: string;
  materialName: string;
  prQuantity: number;
  orderedQuantity: string;
  unitPrice: string;
  supplierId: string;
}

export default function CreatePurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const requestIdParam = searchParams.get("requestId");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [requests, setRequests] = useState<PurchaseRequestDto[]>([]);
  const [suppliers, setSuppliers] = useState<
    { supplierId: number; name: string; materialIds: number[] }[]
  >([]);

  const [selectedRequestId, setSelectedRequestId] = useState<string>(
    requestIdParam || "",
  );
  const [globalSupplierId, setGlobalSupplierId] = useState<string>("");
  const [items, setItems] = useState<OrderItemInput[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const totalPages = Math.ceil(items.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingData(true);
      try {
        const [prRes, suppliersRes] = await Promise.all([
          purchasingPurchaseRequestApi.getRequests(),
          purchasingPurchaseOrderApi.getSuppliers(),
        ]);

        setRequests(prRes.data);
        setSuppliers(suppliersRes.data);
      } catch (error) {
        console.error("Failed to load initial data", error);
        toast.error(t("Failed to load initial data."));
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchInitialData();
  }, [t]);

  useEffect(() => {
    const loadPrDetails = async () => {
      if (selectedRequestId && requests.length > 0) {
        const pr = requests.find(
          (r) => r.requestId.toString() === selectedRequestId,
        );
        if (pr && pr.items) {
          const mappedItems: OrderItemInput[] = pr.items.map((i) => ({
            id: crypto.randomUUID(),
            materialId: i.materialId,
            materialCode: i.materialCode,
            materialName: i.materialName,
            prQuantity: i.quantity,
            orderedQuantity: i.quantity.toString(),
            unitPrice: "",
            supplierId: "",
          }));
          setItems(mappedItems);
          setCurrentPage(1);
          setGlobalSupplierId("");
        }
      } else {
        setItems([]);
        setGlobalSupplierId("");
      }
    };

    loadPrDetails();
  }, [selectedRequestId, requests]);

  const handleItemChange = (
    id: string,
    field: keyof OrderItemInput,
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );

    if (field === "supplierId") {
      setGlobalSupplierId("");
    }
  };

  const handleSubmit = () => {
    if (
      !selectedRequestId ||
      requests.find(
        (r) =>
          r.requestId.toString() === selectedRequestId &&
          r.status === "DraftPO",
      )
    ) {
      return toast.error(t("Please select a Purchase Request."));
    }

    if (items.length === 0) {
      return toast.error(t("Order must have at least one item."));
    }

    const invalidItem = items.find(
      (i) => !i.orderedQuantity || Number(i.orderedQuantity) <= 0,
    );
    if (invalidItem) {
      return toast.error(
        t("Please enter a valid ordered quantity for all items."),
      );
    }

    const missingSupplier = items.find((i) => !i.supplierId);
    if (missingSupplier) {
      return toast.error(t("Please assign a supplier for all items."));
    }

    const missingUnitPrice = items.find((i) => !i.unitPrice);
    if (missingUnitPrice) {
      return toast.error(t("Please assign a unit price for all items."));
    }

    showConfirmToast({
      title: t("Create Purchase Order Draft?"),
      description: t(
        "Are you sure you want to create a Purchase Order draft with these details?",
      ),
      confirmLabel: t("Yes, Create Draft"),
      onConfirm: async () => {
        setIsSubmitting(true);

        try {
          const payload = {
            requestId: Number(selectedRequestId),
            supplierId: globalSupplierId ? Number(globalSupplierId) : undefined,
            items: items.map((i) => ({
              materialId: i.materialId,
              orderedQuantity: Number(i.orderedQuantity),
              unitPrice: i.unitPrice ? Number(i.unitPrice) : undefined,
              supplierId: Number(i.supplierId),
            })),
          };

          await purchasingPurchaseOrderApi.createDraft(payload);
          toast.success(t("Purchase Order draft created successfully!"));
          router.push("/purchasing/purchase-orders");
        } catch (error: any) {
          console.error(error);
          toast.error(
            error.response?.data?.message ||
              t("Failed to create Purchase Order."),
          );
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const calculateTotal = () => {
    return items.reduce((acc, curr) => {
      const qty = Number(curr.orderedQuantity) || 0;
      const price = Number(curr.unitPrice) || 0;
      return acc + qty * price;
    }, 0);
  };

  const handleGlobalSupplierChange = (val: string) => {
    setGlobalSupplierId(val);
    setItems((prev) => prev.map((item) => ({ ...item, supplierId: val })));
  };

  if (isLoadingData) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50/50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const requiredMaterialIds = Array.from(
    new Set(items.map((item) => item.materialId)),
  );

  const capableSuppliers = suppliers.filter((supplier) => {
    if (!supplier.materialIds || supplier.materialIds.length === 0)
      return false;

    return requiredMaterialIds.every((reqId) =>
      supplier.materialIds.includes(reqId),
    );
  });

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Create Purchase Order Draft")} />

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
                  {t("New Purchase Order Draft")}
                </h1>
              </div>
            </div>

            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {t("Confirm Purchase Order")}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* THÔNG TIN CHUNG (CỘT TRÁI) */}
            <div className="lg:col-span-1 space-y-6 flex flex-col">
              <Card className="border-slate-200 shadow-sm bg-white gap-0">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 pt-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    {t("Order Setup")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      {t("Source Purchase Request")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={selectedRequestId}
                      onValueChange={setSelectedRequestId}
                    >
                      <SelectTrigger className="w-full bg-slate-50 min-h-[60px] py-2 border-slate-300">
                        <SelectValue placeholder={t("Select a PR...")} />
                      </SelectTrigger>
                      <SelectContent
                        showSearch
                        className="w-[var(--radix-select-trigger-width)]"
                      >
                        {requests
                          .filter((r) => r.status !== "DraftPO")
                          .map((r) => (
                            <SelectItem
                              key={r.requestId}
                              value={r.requestId.toString()}
                              className="group focus:bg-indigo-600 cursor-pointer"
                            >
                              <div className="flex flex-col text-left">
                                <span className="font-medium text-slate-800 group-focus:text-white">
                                  {r.requestCode}
                                </span>
                                <span className="text-xs text-slate-500 mt-0.5 group-focus:text-indigo-100">
                                  {t("Project")}: {r.projectName} | {t("Items")}
                                  : {r.items?.length || 0}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <label className="text-sm font-medium text-slate-700">
                      {t("Global Supplier")}
                    </label>
                    <Select
                      value={globalSupplierId}
                      onValueChange={handleGlobalSupplierChange}
                    >
                      <SelectTrigger className="w-full bg-slate-50 border-slate-200">
                        <SelectValue
                          placeholder={t("Select to apply to all items...")}
                        />
                      </SelectTrigger>
                      <SelectContent showSearch>
                        {capableSuppliers.length > 0 ? (
                          capableSuppliers.map((s) => (
                            <SelectItem
                              key={s.supplierId}
                              value={s.supplierId.toString()}
                            >
                              {s.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-3 text-sm text-rose-500 text-center italic bg-rose-50/50">
                            {t(
                              "No single supplier can provide all listed materials.",
                            )}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1 italic">
                      {t(
                        "Supplier only appear if they have active contract and can provide all listed material quotations. Leave blank if you want to select different suppliers per item.",
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* DANH SÁCH VẬT TƯ & ĐƠN GIÁ (CỘT PHẢI) */}
            <div className="lg:col-span-3 space-y-6">
              <Card className="border-slate-200 shadow-sm bg-white min-h-[500px] flex flex-col gap-0">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 pt-2">
                    <PackagePlus className="w-5 h-5 text-indigo-600" />
                    {t("Order Details & Pricing")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                  <div className="overflow-x-auto flex-1">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-[30%] pl-6">
                            {t("Material")}
                          </TableHead>
                          <TableHead className="w-[15%] text-center">
                            {t("Requested")}
                          </TableHead>
                          <TableHead className="w-[15%]">
                            {t("Supplier")} *
                          </TableHead>
                          <TableHead className="w-[20%] text-right pr-6">
                            {t("Unit Price (VND)")} *
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="h-40 text-center text-slate-500"
                            >
                              {t(
                                "Please select a Purchase Request to load materials.",
                              )}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedItems.map((item) => (
                            <TableRow
                              key={item.id}
                              className="hover:bg-slate-50/50 transition-colors"
                            >
                              <TableCell className="pl-6 align-top py-4">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-800">
                                    {item.materialName}
                                  </span>
                                  <span className="text-xs text-slate-400 font-mono mt-0.5">
                                    {item.materialCode}
                                  </span>
                                </div>
                              </TableCell>

                              <TableCell className="align-top py-4 text-center flex align-center justify-center">
                                <span className="font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                  {item.orderedQuantity}
                                </span>
                              </TableCell>
                              <TableCell className="align-top py-4">
                                <Select
                                  value={item.supplierId}
                                  onValueChange={(val) =>
                                    handleItemChange(item.id, "supplierId", val)
                                  }
                                >
                                  <SelectTrigger
                                    className={`w-full bg-white h-10 ${
                                      !item.supplierId
                                        ? "border-rose-300 ring-1 ring-rose-100"
                                        : "border-slate-200"
                                    }`}
                                  >
                                    <SelectValue placeholder={t("Select...")} />
                                  </SelectTrigger>
                                  <SelectContent
                                    showSearch
                                    className="w-[var(--radix-select-trigger-width)]"
                                  >
                                    {suppliers
                                      .filter(
                                        (s) =>
                                          s.materialIds &&
                                          s.materialIds.includes(
                                            item.materialId,
                                          ),
                                      )
                                      .map((s) => (
                                        <SelectItem
                                          key={s.supplierId}
                                          value={s.supplierId.toString()}
                                        >
                                          {s.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="align-top text-right py-4 pr-6">
                                <CurrencyInput
                                  value={
                                    item.unitPrice ? Number(item.unitPrice) : 0
                                  }
                                  onValueChange={(val) =>
                                    handleItemChange(
                                      item.id,
                                      "unitPrice",
                                      val !== null ? val.toString() : "",
                                    )
                                  }
                                  className="w-full text-right focus-visible:ring-indigo-600"
                                  placeholder="0"
                                />
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {items.length > itemsPerPage && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-white mt-auto">
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
                          <ChevronLeft className="w-4 h-4 mr-1" /> {t("Prev")}
                        </Button>
                        <div className="text-sm font-medium text-slate-600 px-2">
                          {t("Page")} {currentPage} {t("of")} {totalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage === totalPages}
                        >
                          {t("Next")} <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm bg-indigo-50/50 p-0">
                <CardContent className="p-5 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-indigo-700 font-semibold mb-1">
                    <Calculator className="w-5 h-5" />
                    {t("Estimated Total")}
                  </div>
                  <div className="text-3xl font-bold text-slate-900 truncate">
                    {formatCurrency(calculateTotal())}
                  </div>
                  <p className="text-xs text-slate-500">
                    {t("Based on entered unit prices.")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
