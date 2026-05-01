"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  Search,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  CalendarDays,
  Warehouse as WarehouseIcon,
  ClipboardList,
  Clock,
  Filter,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { auditService, AuditListItemDto } from "@/services/audit-service";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { useTranslation } from "react-i18next";

// Nhập thêm các component cho Filter và Chart
import { DateRangePicker } from "@/components/ui/custom/date-range-picker";
import { YearRangePicker } from "@/components/ui/custom/year-range-picker";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type UserRole = "admin" | "manager" | "accountant";

interface Props {
  role?: UserRole;
}

export default function AuditReportPage({ role = "admin" }: Props) {
  const { t } = useTranslation();
  const router = useRouter();

  const [audits, setAudits] = useState<AuditListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // States cho Filter
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });

  const [yearRange, setYearRange] = useState<{
    from: number | undefined;
    to: number | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await auditService.getAll();
      const completedAudits = data.filter(
        (a) => a.status.toLowerCase() === "completed",
      );
      setAudits(completedAudits);
    } catch (error) {
      console.error("Failed to load audits:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage, sortConfig, dateRange, yearRange]);

  const navigateToDetail = (auditId: number) => {
    router.push(`/${role}/audit/detail/${auditId}`);
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc")
      direction = "desc";
    setSortConfig({ key, direction });
  };

  const filteredData = audits.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.title.toLowerCase().includes(term) ||
      item.stockTakeId.toString().includes(term) ||
      (item.warehouseName && item.warehouseName.toLowerCase().includes(term));

    let matchesDate = true;
    if (dateRange.from || dateRange.to) {
      if (!item.plannedStartDate) matchesDate = false;
      else {
        const itemDate = new Date(item.plannedStartDate);
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

    let matchesYear = true;
    if (yearRange.from || yearRange.to) {
      if (!item.plannedStartDate) {
        matchesYear = false;
      } else {
        const itemYear = new Date(item.plannedStartDate).getFullYear();
        if (yearRange.from && itemYear < yearRange.from) matchesYear = false;
        if (yearRange.to && itemYear > yearRange.to) matchesYear = false;
      }
    }

    return matchesSearch && matchesDate && matchesYear;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;
    if (sortConfig.key === "title")
      return sortConfig.direction === "asc"
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title);
    if (sortConfig.key === "warehouse")
      return sortConfig.direction === "asc"
        ? (a.warehouseName || "").localeCompare(b.warehouseName || "")
        : (b.warehouseName || "").localeCompare(a.warehouseName || "");
    if (sortConfig.key === "date") {
      const dateA = a.plannedStartDate
        ? new Date(a.plannedStartDate).getTime()
        : 0;
      const dateB = b.plannedStartDate
        ? new Date(b.plannedStartDate).getTime()
        : 0;
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }
    if (sortConfig.key === "progress")
      return sortConfig.direction === "asc"
        ? a.countingProgress - b.countingProgress
        : b.countingProgress - a.countingProgress;
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

  const processTrendChartData = () => {
    const dataMap: Record<string, { date: string; count: number }> = {};
    const sortedForChart = [...filteredData].sort(
      (a, b) =>
        new Date(a.plannedStartDate).getTime() -
        new Date(b.plannedStartDate).getTime(),
    );

    sortedForChart.forEach((item) => {
      if (!item.plannedStartDate) return;
      const dateStr = format(new Date(item.plannedStartDate), "MM/yyyy");
      if (!dataMap[dateStr]) dataMap[dateStr] = { date: dateStr, count: 0 };
      dataMap[dateStr].count += 1;
    });
    return Object.values(dataMap).slice(-12);
  };

  const processPieChartData = () => {
    const dataMap: Record<string, { name: string; value: number }> = {};
    filteredData.forEach((item) => {
      const wName =
        item.warehouseName || `${t("Warehouse")} ${item.warehouseId}`;
      if (!dataMap[wName]) dataMap[wName] = { name: wName, value: 0 };
      dataMap[wName].value += 1;
    });

    const COLORS = [
      "#10b981",
      "#3b82f6",
      "#f43f5e",
      "#f59e0b",
      "#8b5cf6",
      "#06b6d4",
    ];
    return Object.values(dataMap).map((d, i) => ({
      ...d,
      color: COLORS[i % COLORS.length],
    }));
  };

  const trendChartData = processTrendChartData();
  const pieChartData = processPieChartData();

  // KPIs
  const totalCompleted = audits.length;
  const warehouseCount = new Set(audits.map((a) => a.warehouseId)).size;
  const latestAudit =
    audits.length > 0
      ? new Date(
          Math.max(
            ...audits.map((a) => new Date(a.plannedStartDate).getTime()),
          ),
        )
      : null;

  const getSortIcon = (columnKey: string) => {
    if (sortConfig?.key === columnKey)
      return sortConfig.direction === "asc" ? (
        <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
      ) : (
        <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
      );
    return (
      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />
    );
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("Audit Reports")} (${role.toUpperCase()})`} />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {t("Completed Audit Reports")}
              </h1>
              <p className="text-sm text-slate-500">
                {t(
                  "Analyze historical data and statistics of finished inventory audits.",
                )}
              </p>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {t("Total Completed")}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {totalCompleted}
                  </h3>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                  <WarehouseIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {t("Warehouses Audited")}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {warehouseCount}
                  </h3>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {t("Latest Completion")}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {latestAudit ? format(latestAudit, "dd/MM/yyyy") : t("N/A")}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Thanh công cụ tìm kiếm và lọc */}
          <Card className="flex flex-col bg-white p-4 mb-4 shadow-sm border-slate-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-[350px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder={t("Search title, ID or warehouse...")}
                  className="pl-9 h-9 shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Advanced Filters Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 bg-white shadow-sm relative group w-full sm:w-auto"
                  >
                    <Filter className="w-4 h-4 mr-2 text-slate-500 group-hover:text-white" />
                    {t("Filters")}
                    {(dateRange.from ||
                      dateRange.to ||
                      yearRange.from ||
                      yearRange.to) && (
                      <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-sm">
                        {(dateRange.from || dateRange.to ? 1 : 0) +
                          (yearRange.from || yearRange.to ? 1 : 0)}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[340px] p-5 shadow-lg" align="end">
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                      <h4 className="font-semibold text-slate-800">
                        {t("Advanced Filters")}
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-slate-500 hover:text-white"
                        onClick={() => {
                          setDateRange({ from: undefined, to: undefined });
                          setYearRange({ from: undefined, to: undefined });
                        }}
                      >
                        {t("Clear All")} <X className="w-3 h-3 ml-1" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                        {t("Date Range")}
                      </label>
                      <DateRangePicker
                        dateRange={dateRange}
                        onDateRangeChange={setDateRange}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                        {t("Year Range")}
                      </label>
                      <YearRangePicker
                        yearRange={yearRange}
                        onYearRangeChange={setYearRange}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </Card>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Biểu đồ xu hướng */}
            <Card className="border-slate-200 shadow-sm bg-white lg:col-span-2">
              <CardHeader className="border-b border-slate-100 py-4">
                <h3 className="text-base font-bold text-slate-800">
                  {t("Audits Over Time")}
                </h3>
              </CardHeader>
              <CardContent className="p-4 pt-6 h-[300px]">
                {trendChartData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">
                      {t("No audit data available in this period")}
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={trendChartData}
                      margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: "#f1f5f9" }}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                      />
                      <Bar
                        dataKey="count"
                        name={t("Completed Audits")}
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Biểu đồ phân bổ theo kho */}
            <Card className="border-slate-200 shadow-sm bg-white lg:col-span-1">
              <CardHeader className="border-b border-slate-100 py-4">
                <h3 className="text-base font-bold text-slate-800">
                  {t("Audits by Warehouse")}
                </h3>
              </CardHeader>
              <CardContent className="p-4 flex flex-col items-center justify-center h-[300px]">
                {pieChartData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">{t("No data available")}</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value} ${t("audits")}`, ""]}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Legend
                        iconType="circle"
                        verticalAlign="bottom"
                        wrapperStyle={{ fontSize: "12px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bảng Dữ liệu */}
          <Card className="border-slate-200 shadow-sm bg-slate-50 min-h-[500px] flex flex-col pb-0 pt-2">
            <CardContent className="p-0 flex flex-col justify-between flex-1">
              <div className="overflow-y-auto">
                <Table className="w-full min-w-[800px] table-fixed">
                  <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm outline outline-1 outline-slate-200">
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead
                        className="pl-6 w-[30%] cursor-pointer select-none group"
                        onClick={() => handleSort("title")}
                      >
                        <div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
                          {t("Audit Info")} {getSortIcon("title")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="w-[20%] cursor-pointer select-none group"
                        onClick={() => handleSort("warehouse")}
                      >
                        <div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
                          {t("Warehouse")} {getSortIcon("warehouse")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="w-[18%] cursor-pointer select-none group"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
                          {t("Completed Date")} {getSortIcon("date")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="w-[17%] cursor-pointer select-none group"
                        onClick={() => handleSort("progress")}
                      >
                        <div className="flex items-center justify-center gap-1.5 hover:text-slate-800 transition-colors">
                          {t("Progress")} {getSortIcon("progress")}
                        </div>
                      </TableHead>
                      <TableHead className="w-[15%] pr-6 text-right">
                        {t("Action")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center">
                          <div className="flex justify-center items-center gap-2 text-indigo-600">
                            <Loader2 className="w-6 h-6 animate-spin" />{" "}
                            {t("Loading reports...")}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-40 text-center text-slate-500 border-b-0"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <FileText className="w-8 h-8 text-slate-300" />
                            <p>
                              {t(
                                "No completed audits found matching your filters.",
                              )}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((audit) => (
                        <TableRow
                          key={audit.stockTakeId}
                          className="group hover:bg-slate-50/50 transition-colors cursor-pointer bg-white"
                          onClick={() => navigateToDetail(audit.stockTakeId)}
                        >
                          <TableCell className="pl-6 py-4">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 mb-1">
                                <ClipboardList className="w-4 h-4 text-indigo-500" />
                                <span
                                  className="font-bold text-slate-800 truncate"
                                  title={audit.title}
                                >
                                  {audit.title}
                                </span>
                              </div>
                              <span className="text-xs text-slate-400">
                                ID: AUD-{audit.stockTakeId}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <WarehouseIcon className="w-4 h-4 text-slate-400" />
                              <span
                                className="text-sm text-slate-600 block truncate"
                                title={audit.warehouseName}
                              >
                                {audit.warehouseName ||
                                  `${t("Warehouse")} #${audit.warehouseId}`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                              <CalendarDays className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                              {audit.plannedStartDate
                                ? format(
                                    new Date(audit.plannedStartDate),
                                    "HH:mm dd/MM/yyyy",
                                  )
                                : t("N/A")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 sm:w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden flex-shrink-0">
                                <div
                                  className={`h-1.5 rounded-full ${audit.countingProgress === 100 ? "bg-emerald-500" : "bg-indigo-500"}`}
                                  style={{
                                    width: `${Math.min(audit.countingProgress, 100)}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-xs font-medium text-slate-600">
                                {audit.countingProgress}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 min-w-[100px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateToDetail(audit.stockTakeId);
                              }}
                            >
                              <FileText className="w-4 h-4 mr-1.5" />
                              {t("Detail")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Phân trang */}
              {!loading && filteredData.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50 gap-4 mt-auto">
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
                        onValueChange={(val) => setItemsPerPage(Number(val))}
                      >
                        <SelectTrigger className="h-8 w-[75px] bg-white border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
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
                        <ChevronLeft className="w-4 h-4 mr-1" /> {t("Previous")}
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
                        {t("Next")} <ChevronRight className="w-4 h-4 ml-1" />
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
