"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import {
  Clock,
  Search,
  ArrowRight,
  Loader2,
  CalendarDays,
  MapPin,
  Package, // Thay DollarSign bằng Package
  Truck,
  ClipboardList,
  AlertCircle,
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
  staffReceiptApi,
  GetInboundRequestListDto,
} from "@/services/receipt-service"; // Đảm bảo import đúng file service bạn vừa tạo

export default function StaffInboundPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<GetInboundRequestListDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // API Staff chỉ trả về "Approved", nên trang này đóng vai trò là "Pending Inbound"
  // Ta có thể filter client-side nếu cần (ví dụ: theo kho)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await staffReceiptApi.getAllInboundRequests();
        setRequests(res.data);
      } catch (error) {
        console.error("Failed to fetch inbound requests", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredData = requests.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.receiptCode.toLowerCase().includes(term) ||
      (item.warehouseName && item.warehouseName.toLowerCase().includes(term));

    return matchesSearch;
  });

  const handleProcess = (id: number) => {
    setLoadingId(id);
    router.push(`import-request/${id}`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title="Warehouse Dashboard" />

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Inbound Requests
            </h1>
            <p className="text-sm text-slate-500">
              Approved receipts waiting for physical inventory check and confirmation.
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    Pending Shipments
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {requests.length}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    Total Items Quantity
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {/* Tính tổng số lượng thay vì tổng tiền */}
                    {requests
                      .reduce((sum, item) => sum + (item.totalQuantity || 0), 0)
                      .toLocaleString("vi-VN")}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                     Approved Today
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {
                      requests.filter((item) => {
                        if (!item.receiptApprovalDate) return false;
                        const date = new Date(item.receiptApprovalDate);
                        const today = new Date();
                        return date.toDateString() === today.toDateString();
                      }).length
                    }
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main List Table */}
          <Card className="border-slate-200 shadow-sm bg-white min-h-[500px] gap-0">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    {/* Staff view is usually simpler, simplified filters */}
                  <Badge variant="secondary" className="px-3 py-1 h-9 text-sm font-medium bg-slate-100 text-slate-600">
                    Status: Approved / Ready to Inbound
                  </Badge>
                </div>

                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Search Receipt Code..."
                    className="pl-9"
                    maxLength={50}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="pl-6">Receipt Code</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-center">Approval Date</TableHead>
                    <TableHead className="text-center">Total Quantity</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <div className="flex justify-center items-center gap-2 text-indigo-600">
                          <Loader2 className="w-6 h-6 animate-spin" /> Loading
                          inbound requests...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-32 text-center text-slate-500 hover:slate-50"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="w-8 h-8 text-slate-300" />
                          <p>No pending inbound requests found.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((item) => (
                      <TableRow
                        key={item.receiptCode}
                        className="group hover:bg-slate-50/50 transition-colors"
                      >
                        {/* Receipt Code */}
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-700">
                              {item.receiptCode}
                            </span>
                          </div>
                        </TableCell>

                        {/* Warehouse */}
                        <TableCell>
                          <div className="flex items-center gap-2 text-slate-600">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            {item.warehouseName || "N/A"}
                          </div>
                        </TableCell>

                        {/* Approval Date */}
                         <TableCell className="text-center">
                            <span className="text-sm text-slate-600 flex items-center justify-center gap-1">
                              <CalendarDays className="w-3 h-3 text-slate-400" />{" "}
                              {formatDate(item.receiptApprovalDate)}
                            </span>
                        </TableCell>

                        {/* Total Quantity (Thay vì Total Amount) */}
                        <TableCell className="text-center">
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md">
                             <Package className="w-3.5 h-3.5 text-slate-500"/>
                             <span className="font-bold text-slate-800 text-sm">
                                {item.totalQuantity.toLocaleString("vi-VN")}
                             </span>
                          </div>
                        </TableCell>

                        {/* Status (Luôn là Approved theo logic API) */}
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200"
                          >
                            Ready to Inbound
                          </Badge>
                        </TableCell>

                        {/* Action */}
                        <TableCell className="text-right pr-6">
                          <Button
                            size="sm"
                            onClick={() => handleProcess(item.receiptId)}
                            disabled={loadingId === item.receiptId}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                          >
                            {loadingId === item.receiptId ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                Process <ArrowRight className="w-4 h-4 ml-1.5" />
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}