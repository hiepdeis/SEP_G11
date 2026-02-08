"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  FileSpreadsheet, ArrowUpRight, ArrowDownLeft, 
  Calendar, Filter, Download, Bell, User, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TRANSACTIONS = [
  { date: "2025-11-01", doc: "GRN-8821", type: "Import", qty: 500, balance: 500, user: "Manager A" },
  { date: "2025-11-03", doc: "MIR-101", type: "Export", qty: -100, balance: 400, user: "Staff B" },
  { date: "2025-11-05", doc: "DN-001 (Audit)", type: "Adjust", qty: -5, balance: 395, user: "Accountant" },
];

const AGING_DATA = [
  { item: "Cement Ha Tien", total: 200, d0_30: 150, d31_60: 50, d61_90: 0, d90plus: 0 },
  { item: "Steel Beam I-200", total: 500, d0_30: 500, d31_60: 0, d61_90: 0, d90plus: 0 },
  { item: "Red Brick (Old Batch)", total: 10000, d0_30: 0, d31_60: 0, d61_90: 2000, d90plus: 8000 },
];

export default function StockCardPage() {
  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Inventory Reporting</h2>
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
              <h1 className="text-2xl font-bold text-slate-900">Inventory Reports</h1>
              <Button variant="outline"><Download className="w-4 h-4 mr-2" /> Export Excel</Button>
           </div>

           <Tabs defaultValue="stock-card" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4">
                 <TabsTrigger value="stock-card">Stock Card (Thẻ Kho)</TabsTrigger>
                 <TabsTrigger value="aging">Inventory Aging (Tuổi Kho)</TabsTrigger>
              </TabsList>

              {/* TAB 1: STOCK CARD */}
              <TabsContent value="stock-card" className="space-y-4">
                 <Card>
                    <CardHeader className="border-b border-slate-100 pb-4">
                       <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div>
                             <CardTitle>Steel Beam I-200</CardTitle>
                             <p className="text-sm text-slate-500">Unit: Pcs | SKU: 89350012</p>
                          </div>
                          <div className="flex items-center gap-2">
                             <Button variant="outline" size="sm"><Calendar className="w-4 h-4 mr-2"/> Date Range</Button>
                             <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2"/> Filter</Button>
                          </div>
                       </div>
                    </CardHeader>
                    <CardContent className="p-0">
                       <Table>
                          <TableHeader>
                             <TableRow className="bg-slate-50">
                                <TableHead>Date</TableHead>
                                <TableHead>Document Ref</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">In / Out</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead>User</TableHead>
                             </TableRow>
                          </TableHeader>
                          <TableBody>
                             <TableRow className="bg-slate-50/50">
                                <TableCell colSpan={4} className="font-bold text-slate-600">Opening Balance</TableCell>
                                <TableCell className="text-right font-bold">0</TableCell>
                                <TableCell>-</TableCell>
                             </TableRow>
                             {TRANSACTIONS.map((tx, idx) => (
                                <TableRow key={idx}>
                                   <TableCell>{tx.date}</TableCell>
                                   <TableCell className="font-medium text-indigo-600 cursor-pointer hover:underline">{tx.doc}</TableCell>
                                   <TableCell>{tx.type}</TableCell>
                                   <TableCell className="text-right">
                                      <span className={tx.qty > 0 ? "text-green-600" : "text-red-600"}>
                                         {tx.qty > 0 ? "+" : ""}{tx.qty}
                                      </span>
                                   </TableCell>
                                   <TableCell className="text-right font-bold">{tx.balance}</TableCell>
                                   <TableCell className="text-slate-500 text-xs">{tx.user}</TableCell>
                                </TableRow>
                             ))}
                          </TableBody>
                       </Table>
                    </CardContent>
                 </Card>
              </TabsContent>

              {/* TAB 2: AGING REPORT */}
              <TabsContent value="aging">
                 <Card>
                    <CardHeader className="bg-slate-50 border-b border-slate-100">
                       <CardTitle className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-orange-600" /> Stock Aging Analysis
                       </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                       <Table>
                          <TableHeader>
                             <TableRow>
                                <TableHead>Item Name</TableHead>
                                <TableHead className="text-right">Total Stock</TableHead>
                                <TableHead className="text-right bg-green-50 text-green-700">0 - 30 Days</TableHead>
                                <TableHead className="text-right bg-yellow-50 text-yellow-700">31 - 60 Days</TableHead>
                                <TableHead className="text-right bg-orange-50 text-orange-700">61 - 90 Days</TableHead>
                                <TableHead className="text-right bg-red-50 text-red-700">&gt; 90 Days</TableHead>
                             </TableRow>
                          </TableHeader>
                          <TableBody>
                             {AGING_DATA.map((row, idx) => (
                                <TableRow key={idx}>
                                   <TableCell className="font-medium">{row.item}</TableCell>
                                   <TableCell className="text-right font-bold">{row.total}</TableCell>
                                   <TableCell className="text-right bg-green-50/30">{row.d0_30}</TableCell>
                                   <TableCell className="text-right bg-yellow-50/30">{row.d31_60}</TableCell>
                                   <TableCell className="text-right bg-orange-50/30">{row.d61_90}</TableCell>
                                   <TableCell className="text-right bg-red-50/30 font-semibold text-red-700">{row.d90plus}</TableCell>
                                </TableRow>
                             ))}
                          </TableBody>
                       </Table>
                    </CardContent>
                 </Card>
              </TabsContent>
           </Tabs>

        </div>
      </main>
    </div>
  );
}