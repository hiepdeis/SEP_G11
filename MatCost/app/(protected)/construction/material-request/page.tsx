"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { Plus, Loader2, Eye, FileText } from "lucide-react";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { importApi, CreateImportRequestDto } from "@/services/import-service";
import { Header } from "@/components/ui/custom/header"; // Using the shared Header component
import { useRouter } from "next/navigation";

export default function RequestListPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<CreateImportRequestDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title="Inbound Requests" />
        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Material Request
              </h1>
              <p className="text-sm text-slate-500">History of your requests</p>
            </div>

            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              onClick={() => router.push("material-request/create")}
            >
              <Plus className="w-4 h-4 mr-2" /> New Request
            </Button>
          </div>

          <Card className="border-slate-200 shadow-sm bg-white gap-0">
            <CardHeader className="pb-2 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" /> My Requests
              </h3>
            </CardHeader>
            <CardContent className="px-0">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="w-[100px] pl-6">No.</TableHead>
                      <TableHead>Total Items</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center py-12 text-slate-500 italic"
                        >
                          No requests found. Start by creating a new one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      requests.map((req, index) => (
                        <TableRow
                          key={index}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <TableCell className="font-medium text-slate-700 pl-6">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {req.items.length} materials
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-2 text-slate-600 hover:text-white hover:border-indigo-200"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md bg-white">
                                <DialogHeader>
                                  <DialogTitle>Request Details</DialogTitle>
                                </DialogHeader>

                                <div className="mt-4 border rounded-md overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-slate-50">
                                        <TableHead>Material Code</TableHead>
                                        <TableHead className="text-right">
                                          Quantity
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {req.items.map((item, idx) => (
                                        <TableRow key={idx}>
                                          <TableCell className="font-medium">
                                            {item.materialCode}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {item.quantity}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>

                                <div className="flex justify-end mt-4">
                                  <DialogTrigger asChild>
                                    <Button variant="secondary">Close</Button>
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
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
