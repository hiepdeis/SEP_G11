"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header"; // Đảm bảo đường dẫn đúng component Header bạn đã tách
import {
  Clock,
  Search,
  ArrowRight,
  FileCheck,
  Loader2,
  CalendarDays,
  MapPin,
  Package,
  File,
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
import { receiptApi, ReceiptSummaryDto } from "@/services/receipt-service";

export default function ImportApprovalListPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<ReceiptSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [filterStatus, setFilterStatus] = useState<
    "All" | "Requested" | "History" | "Draft"
  >("Requested");

  // Fetch Data từ API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await receiptApi.getPendingAccountant();
        setRequests(res.data);
      } catch (error) {
        console.error("Failed to fetch pending receipts", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredData = requests.filter((item) => {
    let matchesStatus = true;

    if (filterStatus === "Requested") {
      matchesStatus = item.status === "Requested";
    } else if (filterStatus === "Draft") {
      matchesStatus = item.status === "Draft";
    } else if (filterStatus === "History") {
      matchesStatus = item.status !== "Requested" && item.status !== "Draft";
    }

    const matchesSearch = item.receiptCode
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const handleReview = (id: number) => {
    setLoadingId(id);
    router.push(`import-request/${id}`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title="Accountant Dashboard"></Header>

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Inbound Approvals
              </h1>
              <p className="text-sm text-slate-500">
                Select a supplier and pricing for requested materials.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    Pending Requests
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {
                      requests.filter((item) => item.status === "Requested")
                        .length
                    }
                  </h3>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
                  <File className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Drafts</p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {" "}
                    {requests.filter((item) => item.status === "Draft").length}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main List */}
          <Card className="border-slate-200 shadow-sm bg-white min-h-[500px] gap-0">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant={
                      filterStatus === "Requested" ? "default" : "outline"
                    }
                    onClick={() => setFilterStatus("Requested")}
                    className={
                      filterStatus === "Requested"
                        ? "bg-indigo-600 hover:bg-indigo-700"
                        : "hover:text-white"
                    }
                  >
                    Requested
                  </Button>
                  <Button
                    variant={filterStatus === "Draft" ? "default" : "outline"}
                    onClick={() => setFilterStatus("Draft")}
                    className={
                      filterStatus === "Draft"
                        ? "bg-indigo-600 hover:bg-indigo-700"
                        : "hover:text-white"
                    }
                  >
                    Draft
                  </Button>
                  <Button
                    variant={filterStatus === "History" ? "default" : "outline"}
                    onClick={() => setFilterStatus("History")}
                    className={
                      filterStatus === "History"
                        ? "bg-indigo-600 hover:bg-indigo-700"
                        : "hover:text-white"
                    }
                  >
                    History
                  </Button>
                  <Button
                    variant={filterStatus === "All" ? "default" : "outline"}
                    onClick={() => setFilterStatus("All")}
                    className={
                      filterStatus === "All"
                        ? "bg-indigo-600 hover:bg-indigo-700"
                        : "hover:text-white"
                    }
                  >
                    All
                  </Button>
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
                    <TableHead>Requester</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <div className="flex justify-center items-center gap-2 text-indigo-600">
                          <Loader2 className="w-6 h-6 animate-spin" /> Loading
                          data...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-32 text-center text-slate-500"
                      >
                        No pending requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((item) => (
                      <TableRow
                        key={item.receiptId}
                        className="group hover:bg-slate-50/50 transition-colors"
                      >
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-700">
                              {item.receiptCode}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />{" "}
                              {formatDate(item.receiptDate)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-slate-700 font-medium">
                              {item.createdByName}
                            </span>
                            <span className="text-xs text-slate-400">
                              Construction Team
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Package className="w-4 h-4 text-slate-400" />
                            {item.itemCount} items
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              item.status === "Requested"
                                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                : item.status === "Submitted"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : item.status === "Rejected"
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-gray-50 text-gray-700 border-gray-200"
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button
                            size="sm"
                            onClick={() => handleReview(item.receiptId)}
                            disabled={loadingId === item.receiptId}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                          >
                            {loadingId === item.receiptId ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                Review <ArrowRight className="w-4 h-4 ml-1.5" />
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
