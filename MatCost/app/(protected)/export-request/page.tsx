"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import {
  FileOutput,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Search,
  Bell,
  User,
  CalendarDays,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";

// Fake Data: Các yêu cầu xuất kho đang chờ Manager duyệt
const PENDING_EXPORTS = [
  {
    id: "MIR-2025-105",
    project: "Skyline Tower A",
    requester: "Construction Team C",
    submittedDate: "2025-11-05",
    itemsCount: 15,
    priority: "High",
    status: "Pending Review",
    items: [
      { name: "Steel Beam I-200", qty: 50, unit: "pcs" },
      { name: "Cement Ha Tien", qty: 200, unit: "bag" },
    ],
  },
  {
    id: "MIR-2025-106",
    project: "Riverside Villa",
    requester: "Site Manager B",
    submittedDate: "2025-11-06",
    itemsCount: 4,
    priority: "Normal",
    status: "Pending Review",
    items: [{ name: "Red Brick", qty: 5000, unit: "pcs" }],
  },
];

export default function ExportApprovalPage() {
  const [selectedReq, setSelectedReq] = useState<
    (typeof PENDING_EXPORTS)[0] | null
  >(null);
  const router = useRouter();

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Manage Export Stock
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

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Export Requests
              </h1>
              <p className="text-sm text-slate-500">
                Review and approve material issue requests from sites.
              </p>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search Request ID..."
                className="pl-9 bg-white"
              />
            </div>
          </div>

          <div className="grid gap-4">
            {PENDING_EXPORTS.map((req) => (
              <Card
                key={req.id}
                className="hover:shadow-md transition-all border-slate-200"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    {/* Info Column */}
                    <div className="space-y-2 flex-grow">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-slate-900">
                          {req.id}
                        </h3>
                        <Badge
                          className={
                            req.priority === "High"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }
                        >
                          {req.priority} Priority
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-slate-500 gap-1"
                        >
                          <Clock className="w-3 h-3" /> {req.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-slate-400" />{" "}
                          {req.project}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4 text-slate-400" />{" "}
                          {req.requester}
                        </div>
                        <div className="flex items-center gap-1">
                          <CalendarDays className="w-4 h-4 text-slate-400" />{" "}
                          {req.submittedDate}
                        </div>
                      </div>
                    </div>

                    {/* Actions Column */}
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Dialog: View Export Request Detail */}
                      <Button
                        variant="outline"
                        onClick={() => router.push("export-request/task")}
                      >
                        <Eye className="w-4 h-4 mr-2" /> Staff Task
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            onClick={() => setSelectedReq(req)}
                          >
                            <Eye className="w-4 h-4 mr-2" /> View Detail
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>
                              Export Request Detail: {req.id}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="py-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-slate-50 rounded-lg">
                              <div>
                                <span className="font-semibold">Project:</span>{" "}
                                {req.project}
                              </div>
                              <div>
                                <span className="font-semibold">
                                  Requester:
                                </span>{" "}
                                {req.requester}
                              </div>
                              <div>
                                <span className="font-semibold">Date:</span>{" "}
                                {req.submittedDate}
                              </div>
                              <div>
                                <span className="font-semibold">Priority:</span>{" "}
                                {req.priority}
                              </div>
                            </div>

                            <Separator />

                            <div>
                              <h4 className="font-semibold mb-2">
                                Requested Materials
                              </h4>
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-slate-50">
                                    <TableHead>Item Name</TableHead>
                                    <TableHead className="text-right">
                                      Quantity
                                    </TableHead>
                                    <TableHead>Unit</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {req.items.map((item, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>{item.name}</TableCell>
                                      <TableCell className="text-right font-medium">
                                        {item.qty}
                                      </TableCell>
                                      <TableCell>{item.unit}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                          <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="ghost" className="text-slate-500">
                              Cancel
                            </Button>
                            <div className="flex gap-2">
                              <Button
                                variant="destructive"
                                className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200 border"
                              >
                                Deny Request
                              </Button>
                              <Button className="bg-green-600 hover:bg-green-700 text-white">
                                Approve Request
                              </Button>
                            </div>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden md:block"></div>

                      {/* Quick Actions */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Deny Export Request"
                      >
                        <XCircle className="w-5 h-5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        title="Approve Export Request"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </Button>
                    </div>
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
