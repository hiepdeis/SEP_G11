"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  Search, Plus, Filter, Package, Tag, 
  DollarSign, MoreHorizontal, Edit3, 
  History, User, Bell 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";

// Fake Data
const MATERIALS = [
  { id: "MAT-001", name: "Steel Beam I-200", category: "Steel", unit: "kg", price: 15000, stock: 5400, lastUpdated: "2023-10-25" },
  { id: "MAT-002", name: "Cement Ha Tien", category: "Cement", unit: "bag", price: 85000, stock: 200, lastUpdated: "2023-10-20" },
  { id: "MAT-003", name: "Red Brick 4-hole", category: "Bricks", unit: "pcs", price: 1200, stock: 15000, lastUpdated: "2023-11-01" },
  { id: "MAT-004", name: "Sand (Yellow)", category: "Sand", unit: "m3", price: 450000, stock: 45, lastUpdated: "2023-10-28" },
];

export default function MaterialManagementPage() {
  const [activeTab, setActiveTab] = useState<"materials" | "categories">("materials");
  const [searchTerm, setSearchTerm] = useState("");

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Master Data</h2>
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
          
          {/* Page Header & Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Material Management</h1>
              <p className="text-sm text-slate-500">Manage definitions, pricing, and categorization.</p>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("materials")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === "materials" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Materials List
              </button>
              <button
                onClick={() => setActiveTab("categories")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === "categories" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Categories
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <Card className="border-slate-200 shadow-sm bg-white min-h-[500px]">
            <CardHeader className="pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input 
                    placeholder="Search by name, SKU..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2">
                    <Filter className="w-4 h-4" /> Filter
                  </Button>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                    <Plus className="w-4 h-4" /> Add New
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              {activeTab === "materials" ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Material Info</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Current Price</TableHead>
                      <TableHead>Stock Level</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MATERIALS.map((item, idx) => (
                      <motion.tr 
                        key={item.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group hover:bg-slate-50/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">{item.name}</span>
                            <span className="text-xs text-slate-400 font-mono">{item.id}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">{item.unit}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                             <span className="font-semibold text-slate-900">{formatCurrency(item.price)}</span>
                             <div className="text-xs text-slate-400 group-hover:text-indigo-500 cursor-pointer" title="Price History">
                                <History className="w-3 h-3" />
                             </div>
                          </div>
                          <span className="text-[10px] text-slate-400">Upd: {item.lastUpdated}</span>
                        </TableCell>
                        <TableCell>
                           <span className={`${item.stock < 100 ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                              {item.stock.toLocaleString()}
                           </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="gap-2">
                                <Edit3 className="w-4 h-4" /> Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2">
                                <DollarSign className="w-4 h-4" /> Update Price
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <Tag className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Category Management View Placeholder</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}