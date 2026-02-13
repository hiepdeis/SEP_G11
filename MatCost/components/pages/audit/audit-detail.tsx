"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import {
  ArrowLeft,
  Lock,
  AlertTriangle,
  CheckCircle,
  FileSignature,
  Download,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UserRole = "admin" | "manager" | "accountant" | "staff";

interface AuditDetailProps {
  role: UserRole;
}

// Fake Data
const RECON_ROWS = [
  {
    id: 1,
    item: "Steel Beam I-200",
    sys: 500,
    count: 500,
    diff: 0,
    status: "Matched",
  },
  {
    id: 2,
    item: "Cement Ha Tien",
    sys: 200,
    count: 195,
    diff: -5,
    status: "Discrepancy",
  },
  {
    id: 3,
    item: "Red Brick",
    sys: 10000,
    count: 10050,
    diff: +50,
    status: "Discrepancy",
  },
];

export default function SharedAuditDetail({ role }: AuditDetailProps) {
  const router = useRouter();
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Quyền hạn
  const canExport = ["accountant", "admin"].includes(role);
  const canResolve = ["manager"].includes(role);
  const canFinalize = ["manager"].includes(role);

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </Button>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Q4 2025 Full Count
                </h2>
                <p className="text-xs text-slate-500">ID: AUD-2025-Q4</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-red-100 text-red-700 border-red-200 gap-1 pl-2 pr-3 py-1">
                <Lock className="w-3 h-3" /> System Locked
              </Badge>
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
          {/* Summary Stats - GIỮ NGUYÊN GIAO DIỆN CŨ */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 uppercase font-bold">
                  Total Items
                </p>
                <p className="text-2xl font-bold text-slate-900">1,250</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 uppercase font-bold">
                  Counted
                </p>
                <p className="text-2xl font-bold text-indigo-600">100%</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-green-700 uppercase font-bold">
                  Matched
                </p>
                <p className="text-2xl font-bold text-green-800">1,248</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-red-700 uppercase font-bold">
                  Discrepancy
                </p>
                <p className="text-2xl font-bold text-red-800">2</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Reconciliation Table */}
          <Card className="border-slate-200 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
              <CardTitle>Reconciliation Data</CardTitle>
              <div className="flex gap-2">
                {canExport && (
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" /> Export Data
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">System Qty</TableHead>
                    <TableHead className="text-right">Physical Count</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RECON_ROWS.map((row) => (
                    <TableRow
                      key={row.id}
                      className={row.diff !== 0 ? "bg-red-50/20" : ""}
                    >
                      <TableCell className="font-medium text-slate-700">
                        {row.item}
                      </TableCell>
                      <TableCell className="text-right text-slate-500">
                        {row.sys}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-900">
                        {row.count}
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold ${
                          row.diff < 0
                            ? "text-red-600"
                            : row.diff > 0
                            ? "text-blue-600"
                            : "text-green-600"
                        }`}
                      >
                        {row.diff > 0 ? "+" : ""}
                        {row.diff}
                      </TableCell>
                      <TableCell>
                        {row.status === "Matched" ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">
                            Matched
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none flex w-fit gap-1">
                            <AlertTriangle className="w-3 h-3" /> Variant
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.diff !== 0 ? (
                          canResolve ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  Resolve
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Resolve Variance</DialogTitle>
                                </DialogHeader>
                                <div className="py-4 space-y-4">
                                  <p className="text-sm">
                                    Action required for{" "}
                                    <strong>{row.item}</strong>.
                                  </p>
                                  <Select>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select Adjustment Reason" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="damage">
                                        Damaged
                                      </SelectItem>
                                      <SelectItem value="theft">
                                        Lost/Theft
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <DialogFooter>
                                  <Button className="bg-red-600 text-white">
                                    Confirm Adjustment
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <span className="text-slate-300 text-xs">
                              Pending Manager
                            </span>
                          )
                        ) : (
                          <span className="text-slate-300 text-xs">
                            No Action
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Finalize Section - Chỉ Manager mới thấy và thao tác được */}
          {canFinalize && (
            <div className="mt-8">
              <Card className="bg-slate-50 border-slate-200">
                <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
                  <h3 className="text-xl font-bold text-slate-900">
                    Finalize & Sign Audit
                  </h3>
                  <p className="text-slate-500 max-w-lg">
                    Ensure all discrepancies are resolved. This action will
                    generate the final Stocktake Report, adjust inventory levels
                    in the ledger, and unlock the system.
                  </p>

                  <div className="flex gap-8 w-full max-w-2xl justify-center py-4">
                    <div className="flex-1 border-b-2 border-slate-300 pb-2 text-left">
                      <p className="text-xs uppercase font-bold text-slate-400 mb-2">
                        Warehouse Staff
                      </p>
                      <div className="font-script text-2xl text-slate-600">
                        Nguyen Van A
                      </div>
                      <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                        <CheckCircle className="w-3 h-3" /> Signed
                      </p>
                    </div>
                    <div className="flex-1 border-b-2 border-slate-300 pb-2 text-left relative">
                      <p className="text-xs uppercase font-bold text-slate-400 mb-2">
                        Manager Approval
                      </p>
                      {!isFinalizing ? (
                        <Button
                          variant="outline"
                          className="w-full border-dashed text-slate-400 h-10"
                          onClick={() => setIsFinalizing(true)}
                        >
                          Click to Sign
                        </Button>
                      ) : (
                        <div className="font-script text-2xl text-indigo-600 animate-in fade-in">
                          Manager Signature
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg min-w-[200px]"
                    disabled={!isFinalizing}
                  >
                    <FileSignature className="w-5 h-5 mr-2" /> Complete & Unlock
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}