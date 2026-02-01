"use client";

import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  ArrowLeft, Link as LinkIcon, FileText, Check, 
  Search, Bell, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default function ImportCreationPage() {
  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Create Goods Receipt Note</h2>
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
          <div className="flex items-center gap-4 mb-4">
             <Button variant="ghost" size="sm" className="text-slate-500">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Requests
             </Button>
             <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Draft Mode</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Main Form */}
             <div className="lg:col-span-2 space-y-6">
                <Card className="border-slate-200 shadow-sm">
                   <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                      <h3 className="font-bold text-slate-800">1. General Information</h3>
                   </CardHeader>
                   <CardContent className="p-6 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-sm font-medium">Original Request ID</label>
                         <Input value="REQ-2023-001" disabled className="bg-slate-100" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-medium">Warehouse Destination</label>
                         <Input value="Central Storage D1" disabled className="bg-slate-100" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-medium">Supplier</label>
                         <Input placeholder="Select Supplier..." />
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-medium">Expected Delivery</label>
                         <Input type="date" />
                      </div>
                   </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                   <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4 flex flex-row justify-between items-center">
                      <h3 className="font-bold text-slate-800">2. Materials to Import</h3>
                   </CardHeader>
                   <CardContent className="p-0">
                      <Table>
                         <TableHeader>
                            <TableRow>
                               <TableHead>Item Name</TableHead>
                               <TableHead className="w-24">Req. Qty</TableHead>
                               <TableHead className="w-24">Import Qty</TableHead>
                               <TableHead>Unit Price (Est.)</TableHead>
                            </TableRow>
                         </TableHeader>
                         <TableBody>
                            <TableRow>
                               <TableCell>Steel Beam I-200</TableCell>
                               <TableCell>500</TableCell>
                               <TableCell><Input className="h-8 w-20" defaultValue={500} /></TableCell>
                               <TableCell>1,500,000 VND</TableCell>
                            </TableRow>
                            <TableRow>
                               <TableCell>Cement Ha Tien</TableCell>
                               <TableCell>200</TableCell>
                               <TableCell><Input className="h-8 w-20" defaultValue={200} /></TableCell>
                               <TableCell>85,000 VND</TableCell>
                            </TableRow>
                         </TableBody>
                      </Table>
                   </CardContent>
                </Card>
             </div>

             {/* Sidebar Actions: Contract Linking */}
             <div className="lg:col-span-1 space-y-6">
                <Card className="border-indigo-100 bg-indigo-50/50 shadow-sm">
                   <CardHeader className="pb-2">
                      <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                         <LinkIcon className="w-4 h-4" /> Link Contract (BR-05)
                      </h3>
                   </CardHeader>
                   <CardContent className="space-y-4">
                      <p className="text-xs text-indigo-700">
                         You must attach a valid Supplier Contract before creating this draft.
                      </p>
                      
                      {/* Simulated Linked Contract */}
                      <div className="flex items-start gap-3 p-3 bg-white rounded border border-indigo-100 shadow-sm">
                         <div className="p-2 bg-green-100 text-green-600 rounded">
                            <FileText className="w-5 h-5" />
                         </div>
                         <div>
                            <p className="text-sm font-semibold text-slate-900">CTR-2023-001</p>
                            <p className="text-xs text-slate-500">Hoa Phat Steel Group</p>
                            <div className="flex items-center gap-1 mt-1 text-xs text-green-600 font-medium">
                               <Check className="w-3 h-3" /> Validated
                            </div>
                         </div>
                      </div>

                      <div className="relative">
                         <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                         <Input placeholder="Search another contract..." className="pl-9 bg-white" />
                      </div>
                   </CardContent>
                </Card>

                <div className="flex flex-col gap-3">
                   <Button variant="outline" className="w-full">Save as Draft</Button>
                   <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                      Submit for Approval
                   </Button>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}