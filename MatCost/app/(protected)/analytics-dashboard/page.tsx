"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  BarChart3, PieChart, TrendingUp, TrendingDown, 
  AlertTriangle, ArrowUpRight, Calendar, Filter,
  Bell, User, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

// Fake Data for Low Stock
const LOW_STOCK_ITEMS = [
  { id: "MAT-004", name: "Sand (Yellow)", stock: 45, min: 50, unit: "m3", status: "Critical" },
  { id: "MAT-002", name: "Cement Ha Tien", stock: 200, min: 200, unit: "bag", status: "Warning" },
  { id: "MAT-088", name: "Steel Pipe D42", stock: 12, min: 30, unit: "pcs", status: "Critical" },
];

export default function AnalyticsDashboardPage() {
  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Analytics & Insights</h2>
            <div className="flex items-center gap-4 ml-auto">
               <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 relative">
                  <Bell className="w-5 h-5" />
               </button>
               <UserDropdown align="end" trigger={<Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"><User className="h-5 w-5" /></Button>} />
            </div>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-8">
           
           {/* Top Controls */}
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                 <h1 className="text-2xl font-bold text-slate-900">Executive Overview</h1>
                 <p className="text-sm text-slate-500">Inventory performance and financial metrics.</p>
              </div>
              <div className="flex items-center gap-2">
                 <Select defaultValue="this_month">
                    <SelectTrigger className="w-[150px] bg-white"><SelectValue placeholder="Period" /></SelectTrigger>
                    <SelectContent>
                       <SelectItem value="this_week">This Week</SelectItem>
                       <SelectItem value="this_month">This Month</SelectItem>
                       <SelectItem value="last_quarter">Last Quarter</SelectItem>
                    </SelectContent>
                 </Select>
                 <Button variant="outline" className="bg-white"><Download className="w-4 h-4 mr-2" /> Export PDF</Button>
              </div>
           </div>

           {/* KPI Cards */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-l-4 border-l-indigo-500 shadow-sm">
                 <CardContent className="p-6">
                    <p className="text-sm font-medium text-slate-500">Total Inventory Value</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-2">12.5B VND</h3>
                    <div className="flex items-center gap-1 text-xs text-green-600 mt-2">
                       <TrendingUp className="w-3 h-3" /> +2.5% vs last month
                    </div>
                 </CardContent>
              </Card>
              <Card className="border-l-4 border-l-orange-500 shadow-sm">
                 <CardContent className="p-6">
                    <p className="text-sm font-medium text-slate-500">Pending Requests</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-2">18</h3>
                    <div className="flex items-center gap-1 text-xs text-orange-600 mt-2">
                       <ArrowUpRight className="w-3 h-3" /> 5 Urgent Approvals
                    </div>
                 </CardContent>
              </Card>
              <Card className="border-l-4 border-l-blue-500 shadow-sm">
                 <CardContent className="p-6">
                    <p className="text-sm font-medium text-slate-500">Items Processed</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-2">1,240</h3>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-2">
                       Inbound & Outbound total
                    </div>
                 </CardContent>
              </Card>
              <Card className="border-l-4 border-l-red-500 shadow-sm">
                 <CardContent className="p-6">
                    <p className="text-sm font-medium text-slate-500">Low Stock Alerts</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-2">3</h3>
                    <div className="flex items-center gap-1 text-xs text-red-600 mt-2 font-medium">
                       <AlertTriangle className="w-3 h-3" /> Action Required
                    </div>
                 </CardContent>
              </Card>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Fake Chart: Inventory Movement */}
              <Card className="lg:col-span-2 shadow-sm border-slate-200">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                       <BarChart3 className="w-5 h-5 text-indigo-600" /> Inventory Movement Trends
                    </CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="h-64 w-full flex items-end justify-between gap-2 px-2">
                       {[60, 45, 70, 30, 80, 50, 90, 65, 40, 55, 75, 85].map((h, i) => (
                          <div key={i} className="w-full bg-slate-100 rounded-t-sm relative group hover:bg-slate-200 transition-colors cursor-pointer">
                             <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                transition={{ duration: 1, delay: i * 0.05 }}
                                className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-t-sm opacity-80 group-hover:opacity-100"
                             />
                          </div>
                       ))}
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-2 px-2">
                       <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                       <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
                    </div>
                 </CardContent>
              </Card>

              {/* Low Stock Alerts Table */}
              <Card className="shadow-sm border-slate-200">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                       <AlertTriangle className="w-5 h-5" /> Critical Low Stock
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                       {LOW_STOCK_ITEMS.map((item, idx) => (
                          <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                             <div>
                                <p className="font-semibold text-slate-800">{item.name}</p>
                                <p className="text-xs text-slate-500">ID: {item.id}</p>
                             </div>
                             <div className="text-right">
                                <p className="font-bold text-red-600">{item.stock} <span className="text-xs font-normal text-slate-400">{item.unit}</span></p>
                                <p className="text-[10px] text-slate-400">Min: {item.min}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                    <div className="p-4 border-t border-slate-100">
                       <Button variant="outline" className="w-full text-xs">View All Alerts</Button>
                    </div>
                 </CardContent>
              </Card>

           </div>
        </div>
      </main>
    </div>
  );
}