"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { Plus, Bell, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { importApi, CreateImportRequestDto } from "@/services/import-service";

export default function RequestListPage() {
  const [requests, setRequests] = useState<CreateImportRequestDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data từ API
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
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Inbound Requests</h2>
            <div className="flex items-center gap-4 ml-auto">
                <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 relative">
                   <Bell className="w-5 h-5" />
                </button>
                <UserDropdown 
                   align="end" 
                   trigger={
                      <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                         <User className="h-5 w-5" />
                      </Button>
                   } 
                />
            </div>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
          <div className="flex justify-between items-center">
            <div>
               <h1 className="text-2xl font-bold text-slate-900">Material Request</h1>
               <p className="text-sm text-slate-500">For Construction Team (Site C)</p>
            </div>
            {/* Nút chuyển sang trang Create */}
            <Link href="/material-request/create">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                   <Plus className="w-4 h-4 mr-2" /> New Request
                </Button>
            </Link>
          </div>

          <Card className="border-slate-200 shadow-sm bg-white">
             <CardHeader className="pb-2"><h3 className="font-semibold">My Requests</h3></CardHeader>
             <CardContent>
               {isLoading ? (
                 <div className="flex justify-center p-8">
                   <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                 </div>
               ) : (
                 <Table>
                    <TableHeader>
                       <TableRow className="bg-slate-50">
                          <TableHead>Warehouse ID</TableHead>
                          <TableHead>Total Items</TableHead>
                          <TableHead>Details</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       {requests.length === 0 ? (
                           <TableRow>
                               <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                                   No requests found.
                               </TableCell>
                           </TableRow>
                       ) : (
                           requests.map((req, index) => (
                              <TableRow key={index} className="hover:bg-slate-50">
                                 <TableCell className="font-medium">Warehouse #{req.warehouseId}</TableCell>
                                 <TableCell>{req.items.length} materials</TableCell>
                                 <TableCell>
                                    <div className="text-sm text-slate-500">
                                        {req.items.slice(0, 2).map(i => i.materialCode).join(", ")} 
                                        {req.items.length > 2 && "..."}
                                    </div>
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