"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  Search,
  Loader2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Delete,
  FileWarning,
  AlertTriangle,
  ArrowRight,
  Receipt,
  PackageX,
  Info,
} from "lucide-react";
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
import {
  managerIncidentApi,
  purchasingIncidentApi,
  ManagerIncidentSummaryDto,
  PurchasingIncidentSummaryDto,
} from "@/services/import-service";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { endOfDay, format, isWithinInterval, startOfDay } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StaffIncidentReports from "@/components/pages/incident-reports-staff/page";
import { formatDateTime } from "@/lib/format-date-time";


type IncidentSummary = ManagerIncidentSummaryDto | PurchasingIncidentSummaryDto;

export default function IncidentsListPage({
  role = "manager",
}: {
  role?: "manager" | "purchase";
}) {
  const router = useRouter();
  const { t } = useTranslation();

  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const [sortConfig, setSortConfig] = useState<{
    key: "date" | "items";
    direction: "asc" | "desc";
  } | null>(null);

  const handleSort = (key: "date" | "items") => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        let res;
        if (role === "purchase") {
          res = await purchasingIncidentApi.getPendingIncidents();
        } else {
          res = await managerIncidentApi.getPendingIncidents();
        }
        // Filter out incidents with no failed items
        const filteredIncidents = (res.data as any[])
          .map((incident) => ({
            ...incident,
            items: incident.items.filter(
              (item: any) =>
                (item.passQuantity ?? 0) < (item.orderedQuantity ?? 0),
            ),
          }))
          .filter((incident) => incident.items.length > 0) as IncidentSummary[];

        setIncidents(filteredIncidents);
      } catch (error) {
        console.error(`Failed to fetch incidents for ${role}`, error);
        toast.error(t("Failed to fetch pending incidents"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [t, role]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig, itemsPerPage, dateRange]);

  // 1. Lọc dữ liệu
  const filteredData = incidents.filter((item) => {
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch =
      item.incidentCode?.toLowerCase().includes(searchLower) ||
      item.receiptCode?.toLowerCase().includes(searchLower) ||
      item.items?.some((i) =>
        i.materialName?.toLowerCase().includes(searchLower),
      );

    let matchesDate = true;
    if (dateRange.from || dateRange.to) {
      const dateString =
        (item as ManagerIncidentSummaryDto).submittedAt ||
        (item as PurchasingIncidentSummaryDto).createdAt;

      if (!dateString) {
        matchesDate = false;
      } else {
        const itemDate = new Date(dateString);
        const fromDate = dateRange.from
          ? startOfDay(dateRange.from)
          : new Date(2000, 0, 1);
        const toDate = dateRange.to
          ? endOfDay(dateRange.to)
          : new Date(2100, 0, 1);

        matchesDate = isWithinInterval(itemDate, {
          start: fromDate,
          end: toDate,
        });
      }
    }

    return matchesSearch && matchesDate;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;

    if (sortConfig.key === "date") {
      const dateAString =
        (a as ManagerIncidentSummaryDto).submittedAt ||
        (a as PurchasingIncidentSummaryDto).createdAt;
      const dateBString =
        (b as ManagerIncidentSummaryDto).submittedAt ||
        (b as PurchasingIncidentSummaryDto).createdAt;

      const dateA = dateAString ? new Date(dateAString).getTime() : 0;
      const dateB = dateBString ? new Date(dateBString).getTime() : 0;
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }

    if (sortConfig.key === "items") {
      const countA = a.items?.length || 0;
      const countB = b.items?.length || 0;
      return sortConfig.direction === "asc" ? countA - countB : countB - countA;
    }

    return 0;
  });

  const isAll = itemsPerPage === -1;
  const totalPages = isAll
    ? 1
    : Math.ceil(sortedData.length / itemsPerPage) || 1;
  const startIndex =
    (currentPage - 1) * (isAll ? sortedData.length : itemsPerPage);
  const endIndex = isAll ? sortedData.length : startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  const handleReview = (id: number) => {
    setLoadingId(id);
    if (role === "purchase") {
      router.push(`/purchasing/incident-reports/${id}`);
    } else {
      router.push(`/manager/incident-reports/${id}`);
    }
  };



  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={t("Incident Management")} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <Tabs defaultValue="manager" className="w-full flex flex-col h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {t("Incident Reports")}
                </h1>
                <p className="text-sm text-slate-500">
                  {role === "manager"
                    ? t(
                        "Review and resolve goods receipt incidents reported by the warehouse staff.",
                      )
                    : t(
                        "Handle defective goods incidents approved by the warehouse manager.",
                      )}
                </p>
              </div>
              {role === "manager" && (
                <div className="flex flex-col md:items-end gap-1.5 w-full md:w-auto">
                  <TabsList className="grid w-full md:w-[350px] grid-cols-2">
                    <TabsTrigger
                      value="manager"
                      className="transition-all duration-300 ease-in-out"
                    >
                      {t("Manager Portal")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="warehouse"
                      className="transition-all duration-300 ease-in-out"
                    >
                      {t("Staff Portal")}
                    </TabsTrigger>
                  </TabsList>
                  <div className="text-[11px] text-slate-400 flex items-center justify-center md:justify-end gap-1.5 pr-1">
                    <Info className="w-3.5 h-3.5" />
                    <span>{t("Switch tabs to view specific role tasks")}</span>
                  </div>
                </div>
              )}
            </div>
            <TabsContent value="warehouse" className="mt-6 flex-1 outline-none">
              <StaffIncidentReports role="manager" />
            </TabsContent>
            <TabsContent
              value="manager"
              className="flex flex-col space-y-6 mt-6 flex-1 outline-none"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">
                        {role === "purchase"
                          ? t("Pending Action")
                          : t("Pending Reviews")}
                      </p>
                      <h3 className="text-2xl font-bold">{incidents.length}</h3>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-slate-200 shadow-sm bg-white min-h-[500px] gap-0 pb-0 flex flex-col">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium text-slate-500 hidden md:block">
                        {t("Filters")}:
                      </span>

                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "justify-start text-left font-normal h-9 bg-white shadow-sm w-[140px]",
                                !dateRange.from && "text-slate-500",
                              )}
                            >
                              <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
                              {dateRange.from ? (
                                format(dateRange.from, "dd/MM/yyyy")
                              ) : (
                                <span className="truncate">
                                  {t("From Date")}
                                </span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dateRange.from}
                              onSelect={(date) =>
                                setDateRange((prev) => ({
                                  ...prev,
                                  from: date,
                                }))
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>

                        <span className="text-slate-400">-</span>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "justify-start text-left font-normal h-9 bg-white shadow-sm w-[140px]",
                                !dateRange.to && "text-slate-500",
                              )}
                            >
                              <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
                              {dateRange.to ? (
                                format(dateRange.to, "dd/MM/yyyy")
                              ) : (
                                <span className="truncate">{t("To Date")}</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dateRange.to}
                              onSelect={(date) =>
                                setDateRange((prev) => ({ ...prev, to: date }))
                              }
                              initialFocus
                              disabled={(date) =>
                                dateRange.from ? date < dateRange.from : false
                              }
                            />
                          </PopoverContent>
                        </Popover>

                        {(dateRange.from || dateRange.to) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-slate-500 px-2"
                            onClick={() =>
                              setDateRange({ from: undefined, to: undefined })
                            }
                          >
                            <Delete className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="relative w-full md:w-72">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                      <Input
                        placeholder={t("Search Incident, Receipt, Material...")}
                        className="pl-9 h-9"
                        maxLength={50}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex flex-col justify-between flex-1">
                  <div className="[&>div]:max-h-[450px] [&>div]:min-h-[450px] [&>div]:overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm outline outline-1 outline-slate-200">
                        <TableRow className="bg-slate-50">
                          <TableHead
                            className="pl-6 cursor-pointer transition-colors w-[25%]"
                            onClick={() => handleSort("date")}
                          >
                            <div className="flex items-center gap-1.5 select-none">
                              {t("Date & Incident ID")}
                              {sortConfig?.key === "date" ? (
                                sortConfig.direction === "asc" ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-50 hover:text-indigo-600" />
                              )}
                            </div>
                          </TableHead>

                          <TableHead className="w-[20%]">
                            {t("Related Receipt")}
                          </TableHead>

                          <TableHead
                            className="cursor-pointer transition-colors w-[25%]"
                            onClick={() => handleSort("items")}
                          >
                            <div className="flex items-center gap-1.5 select-none">
                              {t("Failed Items Summary")}
                              {sortConfig?.key === "items" ? (
                                sortConfig.direction === "asc" ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-50 hover:text-indigo-600" />
                              )}
                            </div>
                          </TableHead>

                          <TableHead className="w-[15%] text-center">
                            {t("Status")}
                          </TableHead>
                          <TableHead className="text-right pr-6 w-[15%]">
                            {t("Action")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center">
                              <div className="flex justify-center items-center gap-2 text-indigo-600">
                                <Loader2 className="w-6 h-6 animate-spin" />{" "}
                                {t("Loading incidents...")}
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : paginatedData.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="h-32 text-center text-slate-500"
                            >
                              {t("No pending incidents found.")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedData.map((item) => {
                            const dateToShow =
                              (item as ManagerIncidentSummaryDto).submittedAt ||
                              (item as PurchasingIncidentSummaryDto).createdAt;

                            return (
                              <TableRow
                                key={item.incidentId}
                                className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                                onClick={() => {
                                  const selection = window.getSelection();
                                  if (
                                    selection &&
                                    selection.toString().length > 0
                                  )
                                    return;
                                  handleReview(item.incidentId);
                                }}
                              >
                                <TableCell className="pl-6">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <FileWarning className="w-4 h-4 text-amber-500" />
                                      <span className="font-bold text-slate-800">
                                        {item.incidentCode}
                                      </span>
                                    </div>
                                    <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                      <CalendarDays className="w-3.5 h-3.5" />{" "}
                                      {formatDateTime(dateToShow)}
                                    </span>
                                  </div>
                                </TableCell>

                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Receipt className="w-4 h-4 text-slate-400" />
                                    <span className="font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                      {item.receiptCode || `#${item.receiptId}`}
                                    </span>
                                  </div>
                                </TableCell>

                                <TableCell>
                                  <div className="flex flex-col items-start">
                                    <span className="font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100 flex items-center gap-1.5">
                                      <PackageX className="w-3.5 h-3.5" />
                                      {item.items?.length || 0}{" "}
                                      {t("Items Failed")}
                                    </span>
                                    <span className="text-xs text-slate-500 mt-1.5 line-clamp-1 max-w-[220px] italic">
                                      {item.items
                                        ?.map((i) => i.materialName)
                                        .join(", ")}
                                    </span>
                                  </div>
                                </TableCell>

                                <TableCell className="text-center">
                                  <Badge
                                    variant="outline"
                                    className={
                                      role === "purchase"
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                    }
                                  >
                                    {role === "purchase"
                                      ? t("Pending Action")
                                      : t("Pending Review")}
                                  </Badge>
                                </TableCell>

                                <TableCell className="text-right pr-6">
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReview(item.incidentId);
                                    }}
                                    disabled={loadingId === item.incidentId}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm min-w-[200px]"
                                  >
                                    {loadingId === item.incidentId ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <>
                                        {role === "purchase"
                                          ? t("Process")
                                          : t("Review")}{" "}
                                        <ArrowRight className="w-4 h-4 ml-1.5" />
                                      </>
                                    )}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* PAGINATION */}
                  {!isLoading && filteredData.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-4 mt-auto">
                      <div className="text-sm text-slate-500">
                        {t("Showing")}{" "}
                        <span className="font-medium text-slate-900">
                          {startIndex + 1}
                        </span>{" "}
                        {t("to")}{" "}
                        <span className="font-medium text-slate-900">
                          {Math.min(endIndex, filteredData.length)}
                        </span>{" "}
                        {t("of")}{" "}
                        <span className="font-medium text-slate-900">
                          {filteredData.length}
                        </span>{" "}
                        {t("results")}
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-500 whitespace-nowrap">
                            {t("Rows per page")}:
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
                              <SelectItem value="5">5</SelectItem>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="20">20</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                              <SelectItem value="-1">{t("All")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

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
                            <ChevronLeft className="w-4 h-4 mr-1" />{" "}
                            {t("Previous")}
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
