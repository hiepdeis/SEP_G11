"use client";

import { useState, useMemo } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  Search, 
  MapPin, 
  MoreVertical, 
  Plus, 
  Warehouse, 
  Container, 
  User,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

// --- Fake Data ---
interface WarehouseDto {
  id: string;
  name: string;
  location: string;
  managerName: string;
  capacityTotal: number; // in tons or units
  capacityUsed: number;
  status: "active" | "maintenance" | "full";
}

const FAKE_WAREHOUSES: WarehouseDto[] = [
  { id: "WH-001", name: "Central District 1 Storage", location: "123 Le Loi, D1, HCMC", managerName: "Nguyen Van A", capacityTotal: 5000, capacityUsed: 3200, status: "active" },
  { id: "WH-002", name: "Site B Temporary Depot", location: "456 Construction Rd, Thu Duc", managerName: "Tran Thi B", capacityTotal: 1000, capacityUsed: 950, status: "full" },
  { id: "WH-003", name: "Steel Yard Material Hub", location: "789 Industrial Park, Dong Nai", managerName: "Le Van C", capacityTotal: 10000, capacityUsed: 4100, status: "active" },
  { id: "WH-004", name: "Auxiliary Warehouse 4", location: "Zone 4, Project Site X", managerName: "Pham Van D", capacityTotal: 2000, capacityUsed: 0, status: "maintenance" },
];

export default function WarehouseListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter Logic
  const filteredWarehouses = useMemo(() => {
    return FAKE_WAREHOUSES.filter(wh => 
      wh.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      wh.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const getUsagePercentage = (used: number, total: number) => {
    return Math.round((used / total) * 100);
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return "bg-red-500";
    if (percent >= 70) return "bg-orange-500";
    return "bg-green-500";
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Warehouses</h2>
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

        {/* Main Content */}
        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-6">
            
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Warehouse List</h1>
              <p className="text-sm text-slate-500">Overview of all storage locations and capacities.</p>
            </div>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all hover:scale-105">
              <Plus className="w-4 h-4 mr-2" /> Add Warehouse
            </Button>
          </div>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                  placeholder="Search warehouse name or location..." 
                  className="pl-9 bg-white transition-all duration-200 focus:ring-2 focus:ring-indigo-100"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50">
                      <TableHead className="w-[250px]">Warehouse Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="w-[200px]">Manager</TableHead>
                      <TableHead className="w-[200px]">Capacity Status</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWarehouses.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                No warehouses found.
                            </TableCell>
                        </TableRow>
                    ) : (
                    filteredWarehouses.map((wh) => {
                      const percent = getUsagePercentage(wh.capacityUsed, wh.capacityTotal);
                      return (
                        <motion.tr 
                          key={wh.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="group hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <Warehouse className="w-5 h-5" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-700">{wh.name}</span>
                                <span className="text-xs text-slate-400 font-mono">{wh.id}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-slate-600">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              <span className="text-sm truncate max-w-[200px]">{wh.location}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                             <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                    {wh.managerName.charAt(0)}
                                </div>
                                <span className="text-sm text-slate-700">{wh.managerName}</span>
                             </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs font-medium">
                                <span className="text-slate-600">{percent}% Used</span>
                                <span className="text-slate-400">{wh.capacityUsed}/{wh.capacityTotal} tons</span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${getProgressColor(percent)} transition-all duration-500`} 
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                                variant="outline" 
                                className={`
                                    ${wh.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                                    ${wh.status === 'maintenance' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : ''}
                                    ${wh.status === 'full' ? 'bg-red-50 text-red-700 border-red-200' : ''}
                                    capitalize
                                `}
                            >
                                {wh.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                <DropdownMenuItem>Edit Layout</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">Deactivate</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      );
                    }))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}