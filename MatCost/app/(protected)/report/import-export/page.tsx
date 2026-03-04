"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  Search,
  Loader2,
  CalendarDays,
  Package,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowDownRight,
  ArrowUpRight,
  History,
  Hash,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { staffReceiptApi, WarehouseCardDto } from "@/services/receipt-service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function WarehouseCardPage() {
  const router = useRouter();

  const [cards, setCards] = useState<WarehouseCardDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // STATE CHO TAB VÀ PHÂN TRANG
  const [activeTab, setActiveTab] = useState<"Import" | "Export">("Import");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  useEffect(() => {
    const fetchCards = async () => {
      setIsLoading(true);
      try {
        const res = await staffReceiptApi.getWarehouseCards({});
        setCards(res.data);
      } catch (error) {
        console.error("Failed to fetch warehouse cards", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCards();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, itemsPerPage]);

  const filteredData = cards.filter((item) => {
    const matchesTab =
      item.transactionType.toLowerCase() === activeTab.toLowerCase();

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.cardCode.toLowerCase().includes(term) ||
      (item.materialCode && item.materialCode.toLowerCase().includes(term)) ||
      (item.materialName && item.materialName.toLowerCase().includes(term));

    return matchesTab && matchesSearch;
  });

  // PHÂN TRANG
  const isAll = itemsPerPage === -1;
  const totalPages = isAll
    ? 1
    : Math.ceil(filteredData.length / itemsPerPage) || 1;
  const startIndex =
    (currentPage - 1) * (isAll ? filteredData.length : itemsPerPage);
  const endIndex = isAll ? filteredData.length : startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // TÍNH TOÁN KPI
  const importCards = cards.filter(
    (c) => c.transactionType.toLowerCase() === "import",
  );
  const exportCards = cards.filter(
    (c) => c.transactionType.toLowerCase() === "export",
  );

  const totalImportQty = importCards.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const totalExportQty = exportCards.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title="Import/Export Reports" />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6 ">
          <div className="flex items-start gap-3">
            {/* Nút Back thu gọn thành Icon tròn, ngang hàng tiêu đề */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/report")}
              className="h-8 w-8 mt-0.5 shrink-0 rounded-full hover:bg-slate-200 text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            {/* Cụm Tiêu đề */}
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Warehouse Cards
              </h1>
              <p className="text-sm text-slate-500">
                Track historical inventory movements, including imports and
                exports.
              </p>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                  <ArrowDownRight className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    Total Imports
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-slate-900">
                      {importCards.length}
                    </h3>
                    <span className="text-xs font-medium text-emerald-600">
                      +{totalImportQty.toLocaleString("vi-VN")} items
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-rose-100 text-rose-600 rounded-lg">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    Total Exports
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-slate-900">
                      {exportCards.length}
                    </h3>
                    <span className="text-xs font-medium text-rose-600">
                      -{totalExportQty.toLocaleString("vi-VN")} items
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    Total Transactions
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {cards.length}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main List & Tabs */}
          <Card className="border-slate-200 shadow-sm bg-white min-h-[500px] gap-0 flex flex-col pb-0">
            <CardHeader className="border-b border-slate-100 pb-4 shrink-0">
              <Tabs
                defaultValue="Import"
                value={activeTab}
                onValueChange={(val) =>
                  setActiveTab(val as "Import" | "Export")
                }
                className="w-full"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* TABS LIST THAY THẾ CHO BADGE/FILTER */}
                  <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger
                      value="Import"
                      className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
                    >
                      Inbound (Import)
                    </TabsTrigger>
                    <TabsTrigger
                      value="Export"
                      className="data-[state=active]:bg-rose-500 data-[state=active]:text-white"
                    >
                      Outbound (Export)
                    </TabsTrigger>
                  </TabsList>

                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      placeholder="Search Material or Card Code..."
                      className="pl-9"
                      maxLength={50}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </Tabs>
            </CardHeader>
            <CardContent className="p-0 flex flex-col justify-between flex-1">
              <div className="max-h-[350px] min-h-[350px] overflow-y-auto relative scrollbar-thin no-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="pl-6 w-[220px]">
                        Transaction
                      </TableHead>
                      <TableHead>Material Details</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead className="text-right">
                        Quantity Before
                      </TableHead>
                      <TableHead className="text-center w-[120px]">
                        Change
                      </TableHead>
                      <TableHead className="text-right pr-6">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-40 text-center">
                          <div className="flex justify-center items-center gap-2 text-indigo-600">
                            <Loader2 className="w-6 h-6 animate-spin" /> Loading
                            stock cards...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-40 text-center text-slate-500"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <AlertCircle className="w-8 h-8 text-slate-300" />
                            <p>No transaction records found.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((item) => (
                        <TableRow
                          key={item.cardId}
                          className="group hover:bg-slate-50/50 transition-colors align-top"
                        >
                          {/* Transaction Date & Ref */}
                          <TableCell className="pl-6 py-3">
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-slate-700 text-sm">
                                {item.cardCode}
                              </span>
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                {formatDateTime(item.transactionDate)}
                              </span>
                              <Badge
                                variant="outline"
                                className="w-fit text-[11px] mt-1 bg-slate-50 text-slate-600"
                              >
                                {item.referenceType} #{item.referenceId}
                              </Badge>
                            </div>
                          </TableCell>

                          {/* Material */}
                          <TableCell className="py-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-slate-800 font-medium">
                                {item.materialName}
                              </span>
                              <span className="text-xs text-slate-500 font-mono bg-slate-100 w-fit px-1.5 rounded">
                                {item.materialCode}
                              </span>
                            </div>
                          </TableCell>

                          {/* Location (Bin & Batch) */}
                          <TableCell className="py-3">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-xs font-medium text-indigo-700 bg-indigo-50 w-fit px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                                <Hash className="w-3 h-3" /> Bin:{" "}
                                {item.binCode || "N/A"}
                              </span>
                              {item.batchCode && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Package className="w-3 h-3" /> Batch:{" "}
                                  {item.batchCode}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-left py-3 text-slate-500">
                            {item.warehouseName}
                          </TableCell>

                          {/* Qty Before */}
                          <TableCell className="text-right py-3 text-slate-500">
                            {item.quantityBefore.toLocaleString("vi-VN")}
                          </TableCell>

                          {/* Change (Dấu + hoặc -) */}
                          <TableCell className="text-center py-3">
                            <Badge
                              variant="outline"
                              className={
                                item.transactionType.toLowerCase() === "import"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 px-3"
                                  : "bg-rose-50 text-rose-700 border-rose-200 px-3"
                              }
                            >
                              {item.transactionType.toLowerCase() === "import"
                                ? "+"
                                : "-"}
                              {item.quantity.toLocaleString("vi-VN")}
                            </Badge>
                          </TableCell>

                          {/* Balance (Qty After) */}
                          <TableCell className="text-right pr-6 py-3">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="font-bold text-slate-800 text-md">
                                {item.quantityAfter.toLocaleString("vi-VN")}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {item.materialUnit}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Phân trang */}
              {!isLoading && filteredData.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 mt-auto gap-4">
                  <div className="text-sm text-slate-500">
                    Showing{" "}
                    <span className="font-medium text-slate-900">
                      {startIndex + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium text-slate-900">
                      {Math.min(endIndex, filteredData.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-slate-900">
                      {filteredData.length}
                    </span>{" "}
                    records
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Chọn số lượng item */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 whitespace-nowrap">
                        Rows per page:
                      </span>
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(val) => setItemsPerPage(Number(val))}
                      >
                        <SelectTrigger className="h-8 w-[75px] bg-white border-slate-200 shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="-1">All</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Các nút chuyển trang */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        className="h-8"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                      </Button>
                      <div className="text-sm font-medium text-slate-600 px-2 min-w-[80px] text-center">
                        Page {currentPage} of {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages),
                          )
                        }
                        disabled={currentPage === totalPages}
                        className="h-8"
                      >
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
