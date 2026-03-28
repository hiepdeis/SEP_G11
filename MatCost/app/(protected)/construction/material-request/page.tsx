"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import {
  Plus,
  Loader2,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { importApi, CreateImportRequestDto } from "@/services/import-service";
import { Header } from "@/components/ui/custom/header";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";

export default function RequestListPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [requests, setRequests] = useState<CreateImportRequestDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const [modalPage, setModalPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await importApi.getMyRequests();
        setRequests(res.data);
      } catch (error) {
        console.error("Failed to fetch requests", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const isAll = itemsPerPage === -1;
  const totalPages = isAll ? 1 : Math.ceil(requests.length / itemsPerPage) || 1;
  const startIndex =
    (currentPage - 1) * (isAll ? requests.length : itemsPerPage);
  const endIndex = isAll ? requests.length : startIndex + itemsPerPage;
  const paginatedData = requests.slice(startIndex, endIndex);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Inbound Requests")} />
        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {t("Material Request")}
              </h1>
              <p className="text-sm text-slate-500">
                {t("History of your requests")}
              </p>
            </div>

            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              onClick={() => router.push("material-request/create")}
            >
              <Plus className="w-4 h-4 mr-2" /> {t("New Request")}
            </Button>
          </div>

          <Card className="border-slate-200 shadow-sm bg-white gap-0 flex flex-col min-h-[400px] pb-0">
            <CardHeader className="pb-2 border-b border-slate-100 shrink-0">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />{" "}
                {t("My Requests")}
              </h3>
            </CardHeader>
            <CardContent className="px-0 flex-1 flex flex-col justify-between">
              {isLoading ? (
                <div className="flex justify-center items-center flex-1 p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              ) : (
                <>
                  <div className="[&>div]:max-h-[500px] [&>div]:min-h-[500px] [&>div]:overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm outline outline-1 outline-slate-200">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[100px] pl-6 text-slate-700">
                            {t("No.")}
                          </TableHead>
                          <TableHead className="text-slate-700">
                            {t("Total Items")}
                          </TableHead>
                          <TableHead className="text-slate-700 text-center">
                            {t("Created Date")}
                          </TableHead>
                          <TableHead className="text-right pr-6 text-slate-700">
                            {t("Actions")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedData.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="text-center py-12 text-slate-500 italic"
                            >
                              {t(
                                "No requests found. Start by creating a new one.",
                              )}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedData.map((req, index) => (
                            <TableRow
                              key={index}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              <TableCell className="font-medium text-slate-700 pl-6">
                                {startIndex + index + 1}
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {req.items.length} {t("materials")}
                                </span>
                              </TableCell>
                              <TableCell className="text-center font-medium text-slate-700">
                                {formatDate(req.createdDate)}
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <Dialog
                                  onOpenChange={(open) => {
                                    if (!open) setModalPage(1);
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 gap-2 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-slate-200"
                                    >
                                      <Eye className="w-3.5 h-3.5" />{" "}
                                      {t("View Details")}
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-[48rem] bg-white">
                                    <DialogHeader>
                                      <DialogTitle>
                                        {t("Request Details")}
                                      </DialogTitle>
                                    </DialogHeader>

                                    <div className="mt-4 flex flex-col sm:flex-row sm:justify-between gap-2 text-sm bg-slate-50 p-3 rounded-md border border-slate-100">
                                      <div>
                                        <span className="text-slate-500">
                                          {t("Created By")}:
                                        </span>{" "}
                                        <span className="font-medium text-slate-800">
                                          {req.createdByName || t("Unknown")}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-slate-500">
                                          {t("Date")}:
                                        </span>{" "}
                                        <span className="font-medium text-slate-800">
                                          {req.createdDate
                                            ? new Date(
                                                req.createdDate,
                                              ).toLocaleDateString("vi-VN") 
                                            : "--"}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="mt-4 border rounded-md overflow-hidden">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="bg-slate-50">
                                            <TableHead>
                                              {t("Material Code")}
                                            </TableHead>
                                            <TableHead>
                                              {t("Material Name")}
                                            </TableHead>
                                            <TableHead className="text-right">
                                              {t("Quantity - Unit")}
                                            </TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {req.items
                                            .slice(
                                              (modalPage - 1) * 10,
                                              modalPage * 10,
                                            )
                                            .map((item, idx) => (
                                              <TableRow key={idx}>
                                                <TableCell className="font-medium">
                                                  {item.materialCode}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                  {item.materialName}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                  {item.quantity} - {item.unit}
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                        </TableBody>
                                      </Table>
                                    </div>

                                    {req.items.length > 10 && (
                                      <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs text-slate-500">
                                          {t("Showing")}{" "}
                                          {(modalPage - 1) * 10 + 1}-
                                          {Math.min(
                                            modalPage * 10,
                                            req.items.length,
                                          )}{" "}
                                          {t("of")} {req.items.length}
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs px-2"
                                            onClick={() =>
                                              setModalPage((p) =>
                                                Math.max(1, p - 1),
                                              )
                                            }
                                            disabled={modalPage === 1}
                                          >
                                            <ChevronLeft className="w-3 h-3 mr-1" />{" "}
                                            {t("Prev")}
                                          </Button>
                                          <span className="text-xs font-medium text-slate-600 w-8 text-center">
                                            {modalPage} /{" "}
                                            {Math.ceil(req.items.length / 10)}
                                          </span>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs px-2"
                                            onClick={() =>
                                              setModalPage((p) =>
                                                Math.min(
                                                  Math.ceil(
                                                    req.items.length / 10,
                                                  ),
                                                  p + 1,
                                                ),
                                              )
                                            }
                                            disabled={
                                              modalPage ===
                                              Math.ceil(req.items.length / 10)
                                            }
                                          >
                                            {t("Next")}{" "}
                                            <ChevronRight className="w-3 h-3 ml-1" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex justify-end mt-4">
                                      <DialogTrigger asChild>
                                        <Button variant="secondary">
                                          {t("Close")}
                                        </Button>
                                      </DialogTrigger>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {/* THANH PHÂN TRANG (PAGINATION CONTROLS) */}
                  {!isLoading && requests.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 mt-auto gap-4">
                      <div className="text-sm text-slate-500">
                        {t("Showing")}{" "}
                        <span className="font-medium text-slate-900">
                          {startIndex + 1}
                        </span>{" "}
                        {t("to")}{" "}
                        <span className="font-medium text-slate-900">
                          {Math.min(endIndex, requests.length)}
                        </span>{" "}
                        {t("of")}{" "}
                        <span className="font-medium text-slate-900">
                          {requests.length}
                        </span>{" "}
                        {t("requests")}
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Chọn số lượng item */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-500 whitespace-nowrap">
                            {t("Rows per page:")}
                          </span>
                          <Select
                            value={itemsPerPage.toString()}
                            onValueChange={(val) =>
                              setItemsPerPage(Number(val))
                            }
                          >
                            <SelectTrigger className="h-8 w-[75px] bg-white border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="20">20</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                              <SelectItem value="100">100</SelectItem>
                              <SelectItem value="-1">{t("All")}</SelectItem>
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
                            <ChevronLeft className="w-4 h-4 mr-1" /> {t("Prev")}
                          </Button>
                          <div className="text-sm font-medium text-slate-600 px-2 min-w-[80px] text-center">
                            {t("Page")} {currentPage} {t("of")} {totalPages}
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
                            {t("Next")}{" "}
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
