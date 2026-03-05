"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import {
  FileText,
  Plus,
  Trash2,
  Send,
  ArrowLeft,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { importApi, ImportItemDto } from "@/services/import-service";
import {
  warehouseApi,
  WarehouseListItemDto,
} from "@/services/warehouse-service";
import * as XLSX from "xlsx";
import { Header } from "@/components/ui/custom/header";
import { toast } from "sonner";

export default function CreateRequestPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [warehouses, setWarehouses] = useState<WarehouseListItemDto[]>([]);
  const [warehouseId, setWarehouseId] = useState<number>(0);

  const [requestItems, setRequestItems] = useState<
    Array<ImportItemDto & { id: number }>
  >([{ id: 1, materialCode: "", quantity: 1 }]);

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const res = await warehouseApi.getAll();
        setWarehouses(res.data);

        // Tự động chọn kho đầu tiên nếu có dữ liệu
        if (res.data.length > 0) {
          setWarehouseId(res.data[0].warehouseId);
        }
      } catch (error) {
        console.error("Failed to load warehouses", error);
      }
    };
    fetchWarehouses();
  }, []);

  const addItem = () => {
    setRequestItems([
      ...requestItems,
      { id: Date.now(), materialCode: "", quantity: 1 },
    ]);
  };

  const removeItem = (id: number) => {
    if (requestItems.length === 1) return;
    setRequestItems(requestItems.filter((i) => i.id !== id));
  };

  const updateItem = (
    id: number,
    field: keyof ImportItemDto,
    value: string | number,
  ) => {
    setRequestItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      { "Material Name": "STEEL-001", Quantity: 100 },
      { "Material Name": "CEMENT-050", Quantity: 50 },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    ws["!cols"] = [{ wch: 20 }, { wch: 10 }];

    XLSX.utils.book_append_sheet(wb, ws, "ImportTemplate");
    XLSX.writeFile(wb, "Material_Request_Template.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast.error("File is empty");
          return;
        }

        const newItems: Array<ImportItemDto & { id: number }> = data
          .map((row: any, index: number) => ({
            id: Date.now() + index,
            materialCode: row["Material Name"] || row["MaterialName"] || "",
            quantity: Number(row["Quantity"] || 0),
          }))
          .filter((item) => item.materialCode !== "");

        setRequestItems(newItems);
        toast.success(
          `Successfully imported ${newItems.length} items from Excel.`,
        );
      } catch (error) {
        console.error("Error reading excel", error);
        toast.error(
          "Failed to parse Excel file. Please use the correct template.",
        );
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleSubmit = async () => {
    if (warehouseId === 0) {
      toast.error("Please select a warehouse.");
      return;
    }

    if (
      requestItems.some(
        (i) => !i.materialCode || !i.quantity || i.quantity <= 0,
      )
    ) {
      toast.error(
        "Please ensure all items have a Material Name and Quantity > 0",
      );
      return;
    }

    if (requestItems.length === 0) {
      toast.error("Request list is empty.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        warehouseId: warehouseId,
        items: requestItems.map(({ materialCode, quantity }) => ({
          materialCode,
          quantity,
        })),
      };
      await importApi.createRequest(payload);
      toast.success("Request created successfully!");
      router.push("/construction/material-request");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title="Create Request" />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <Button
            variant="ghost"
            className="pl-0 hover:bg-transparent hover:text-indigo-600"
            onClick={() => router.push("/construction/material-request")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="max-w-3xl mx-auto border-slate-200 shadow-lg bg-white">
              <CardHeader className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" /> New Material
                  Request
                </h3>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    className="text-slate-600 border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                  >
                    <Download className="w-4 h-4 mr-2" /> Template
                  </Button>

                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="text-green-700 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300 hover:text-green-900"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> Import Excel
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-700">
                    Warehouse
                  </h4>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(Number(e.target.value))}
                  >
                    {warehouses.length === 0 && (
                      <option value={0}>Loading warehouses...</option>
                    )}

                    {warehouses.map((wh) => (
                      <option key={wh.warehouseId} value={wh.warehouseId}>
                        {wh.name} {wh.address ? `(${wh.address})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="font-semibold text-slate-700">
                      Materials List ({requestItems.length})
                    </h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={addItem}
                      className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Item
                    </Button>
                  </div>

                  {requestItems.length === 0 && (
                    <div className="text-center py-8 text-slate-400 italic bg-slate-50 rounded-md border border-dashed border-slate-200">
                      List is empty. Add items manually or Import Excel.
                    </div>
                  )}

                  {requestItems.map((item, idx) => (
                    <div key={item.id} className="flex gap-2 items-end">
                      <div className="w-8 flex justify-center pb-2 text-xs text-slate-400">
                        {idx + 1}
                      </div>
                      <div className="flex-grow space-y-1">
                        <label className="text-xs text-slate-500">
                          Material Name *
                        </label>
                        <Input
                          placeholder="e.g. MAT-001"
                          value={item.materialCode || ""}
                          onChange={(e) =>
                            updateItem(item.id, "materialCode", e.target.value)
                          }
                        />
                      </div>
                      <div className="w-32 space-y-1">
                        <label className="text-xs text-slate-500">
                          Quantity *
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity || ""}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "quantity",
                              parseFloat(e.target.value),
                            )
                          }
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 mb-0.5"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => router.push("/construction/material-request")}
                    disabled={isSubmitting}
                    className="hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" /> Create Request
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
