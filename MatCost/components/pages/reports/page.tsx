"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import {
  FileBarChart,
  FileSpreadsheet,
  FileWarning,
  ArrowRight,
  Download,
  Printer,
  Bell,
  User,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const REPORTS = [
  {
    id: "RPT-001",
    title: "Quantity Report (Inventory Summary)",
    desc: "Current stock levels across all warehouses with value estimation.",
    icon: FileBarChart,
    color: "text-blue-600",
    bg: "bg-blue-100",
    url: "",
  },
  {
    id: "RPT-002",
    title: "Import / Export History",
    desc: "Detailed log of all material movements within a date range.",
    icon: FileSpreadsheet,
    color: "text-green-600",
    bg: "bg-green-100",
    url: "reports/import-export",
  },
  {
    id: "RPT-003",
    title: "Irregularity / Quality Report",
    desc: "List of failed QC inspections and damaged goods reported.",
    icon: FileWarning,
    color: "text-red-600",
    bg: "bg-red-100",
    url: "",
  },
  {
    id: "RPT-004",
    title: "Post-Audit Discrepancy",
    desc: "Variance analysis between system stock and physical count.",
    icon: FileBarChart,
    color: "text-orange-600",
    bg: "bg-orange-100",
    url: "",
  },
];

export default function ReportCenterPage({ role }: { role: string }) {
  const [isExporting, setIsExporting] = useState(false);
  const router = useRouter();

  const handleExport = (type: "pdf" | "excel") => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      toast.success(`Report exported as ${type.toUpperCase()} successfully.`);
      alert(`Report exported as ${type.toUpperCase()} successfully.`);
    }, 1500);
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Report Center
            </h2>
            <div className="flex items-center gap-4 ml-auto">
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 relative">
                <Bell className="w-5 h-5" />
              </button>
              <UserDropdown
                align="end"
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  >
                    <User className="h-5 w-5" />
                  </Button>
                }
              />
            </div>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Available Reports
            </h1>
            <p className="text-sm text-slate-500">
              Select a report to view or export data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {REPORTS.map((rpt) => (
              <Card
                key={rpt.id}
                className="hover:shadow-md transition-shadow border-slate-200"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`p-3 rounded-xl ${rpt.bg} ${rpt.color}`}>
                      <rpt.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">
                        {rpt.title}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                        {rpt.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="text-slate-600">
                          View Options
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Export Options: {rpt.title}</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Date Range
                            </label>
                            <Select defaultValue="this_month">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="this_month">
                                  This Month
                                </SelectItem>
                                <SelectItem value="last_month">
                                  Last Month
                                </SelectItem>
                                <SelectItem value="custom">
                                  Custom Range
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Warehouse
                            </label>
                            <Select defaultValue="all">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">
                                  All Warehouses
                                </SelectItem>
                                <SelectItem value="wh1">
                                  Central Storage
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter className="gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleExport("pdf")}
                            disabled={isExporting}
                          >
                            {isExporting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Printer className="w-4 h-4 mr-2" />
                            )}
                            PDF
                          </Button>
                          <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleExport("excel")}
                            disabled={isExporting}
                          >
                            {isExporting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <FileSpreadsheet className="w-4 h-4 mr-2" />
                            )}
                            Excel
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                      onClick={() => router.push(rpt.url)}
                    >
                      View Report <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
