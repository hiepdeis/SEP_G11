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
} from "@/services/import-service";
import { projectApi, ProjectDto } from "@/services/project-services";
import { materialApi, MaterialDto } from "@/services/material-service";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface RequestItemInput {
  id: string;
  materialId: string;
  quantity: string;
  notes: string;
}

export default function CreatePurchaseRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const alertIdParam = searchParams.get("alertId");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [projectId, setProjectId] = useState<string>("");
  const [items, setItems] = useState<RequestItemInput[]>([]);

  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [materials, setMaterials] = useState<MaterialDto[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!alertIdParam) {
        toast.error(
          t("Purchase Requests can only be created from an active Alert."),
        );
        router.replace("/admin/purchase-requests");
        return;
      }

      setIsLoadingData(true);
      try {
        const [projRes, matRes, alertRes] = await Promise.all([
          projectApi.getProjects(),
          materialApi.getAll(),
          adminStockShortageAlertApi.getAlert(Number(alertIdParam)),
        ]);

        setProjects(projRes);
        setMaterials(matRes.data);

        const alertData = alertRes.data;
        if (alertData) {
          setItems([
            {
              id: crypto.randomUUID(),
              materialId: alertData.materialId.toString(),
              quantity: alertData.suggestedQuantity?.toString() || "",
              notes:
                alertData.notes ||
                `Auto-generated from Alert #${alertData.alertId}`,
            },
          ]);
        }
      } catch (error) {
        console.error("Failed to load initial data", error);
        toast.error(t("Failed to load necessary data or alert information."));
        router.replace("/admin/purchase-requests");
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchInitialData();
  }, [t, alertIdParam, router]);

  const handleItemChange = (
    id: string,
    field: keyof RequestItemInput,
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleSubmit = async () => {
    if (!projectId) {
      return toast.error(t("Please select a project."));
    }

    const invalidItem = items.find(
      (i) => !i.materialId || !i.quantity || Number(i.quantity) <= 0,
    );
    if (invalidItem) {
      return toast.error(
        t("Please select material and enter a valid quantity for all items."),
      );
    }

    setIsSubmitting(true);

    try {
      const payload = {
        projectId: Number(projectId),
        finalQuantity:
          items.length === 1 ? Number(items[0].quantity) : undefined,
        items: items.map((i) => ({
          materialId: Number(i.materialId),
          quantity: Number(i.quantity),
          notes: i.notes,
        })),
      };

      await adminPurchaseRequestApi.createFromAlert(
        Number(alertIdParam),
        payload,
      );
      toast.success(t("Purchase request created successfully from alert!"));

      router.push("/admin/purchase-requests");
    } catch (error: any) {
      console.error(error);
      toast.error(
        error.response?.data?.message || t("Failed to create purchase request"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
                  <span className="text-xs font-normal bg-rose-100 text-rose-700 px-2 py-1 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {t("Resolving Alert")}{" "}
                    #{alertIdParam}
                  </span>
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
              {t("Submit Request")}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-slate-200 shadow-sm bg-white gap-0">
                <CardHeader className="border-b border-slate-100 pb-4">
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
                        <SelectTrigger className="w-full bg-slate-50 border-slate-200">
                          <SelectValue placeholder={t("Select a project...")} />
                        </SelectTrigger>
                        <SelectContent>
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
              <Card className="border-slate-200 shadow-sm bg-white min-h-[500px] flex flex-col gap-0 pb-0">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <PackagePlus className="w-5 h-5 text-indigo-600" />
                    {t("Shortage Material")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-[40%] pl-6">
                          {t("Material")}
                        </TableHead>
                        <TableHead className="w-[15%] text-center">
                          {t("Required")} *
                        </TableHead>
                        <TableHead className="pr-6 text-center">
                          {t("Notes")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow
                          key={item.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <TableCell className="pl-6 align-top pt-4">
                            <Select value={item.materialId} disabled>
                              <SelectTrigger className="w-full bg-slate-50 border-slate-200 text-slate-500 opacity-100 h-auto py-2">
                                <SelectValue
                                  placeholder={t("Select material...")}
                                />
                              </SelectTrigger>
                              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                                {materials.map((m) => (
                                  <SelectItem
                                    key={m.materialId}
                                    value={m.materialId.toString()}
                                  >
                                    <div className="flex flex-col text-left">
                                      <span className="font-medium text-slate-800">
                                        [{m.code}]{" "}{m.name}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell className="align-top pt-4">
                            <div className="relative">
                              <Input
                                type="number"
                                min="1"
                                placeholder="0.00"
                                className="w-full text-right pr-12 border-indigo-200 focus-visible:ring-indigo-600"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.id,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
                <div className="p-4 bg-yellow-50 text-yellow-700 text-sm border-t border-yellow-100 flex items-start gap-2 rounded-b-xl">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>
                    {t(
                      "You are resolving an active stock shortage. The material is locked. You can adjust the final required quantity before submitting.",
                    )}
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
