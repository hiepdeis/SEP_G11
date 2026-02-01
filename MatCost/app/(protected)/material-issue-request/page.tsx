"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  PackageMinus, Calendar, MapPin, Plus, Trash2, 
  Send, History, Bell, User, AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { motion } from "framer-motion";

// Fake History
const ISSUE_HISTORY = [
  { id: "MIR-2025-101", project: "Skyline Tower A", date: "2025-11-02", items: 15, status: "Approved" },
  { id: "MIR-2025-102", project: "Riverside Villa", date: "2025-11-01", items: 5, status: "Pending" },
];

export default function MaterialIssueRequestPage() {
  const [view, setView] = useState<"list" | "create">("list");
  const [items, setItems] = useState([{ id: 1, name: "", qty: 1 }]);

  const addItem = () => setItems([...items, { id: Date.now(), name: "", qty: 1 }]);
  const removeItem = (id: number) => setItems(items.filter(i => i.id !== id));

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Outbound Requests</h2>
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
                <h1 className="text-2xl font-bold text-slate-900">Material Issue Request</h1>
                <p className="text-sm text-slate-500">Request materials for construction sites.</p>
             </div>
             {view === "list" ? (
                <Button onClick={() => setView("create")} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                   <Plus className="w-4 h-4 mr-2" /> Create Request
                </Button>
             ) : (
                <Button variant="outline" onClick={() => setView("list")}>Cancel</Button>
             )}
          </div>

          {view === "list" ? (
             <Card className="bg-white shadow-sm border-slate-200">
                <CardHeader className="pb-2 font-semibold flex flex-row items-center gap-2">
                   <History className="w-5 h-5 text-slate-500" /> Request History
                </CardHeader>
                <CardContent>
                   <Table>
                      <TableHeader>
                         <TableRow className="bg-slate-50">
                            <TableHead>ID</TableHead>
                            <TableHead>Project</TableHead>
                            <TableHead>Required Date</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Status</TableHead>
                         </TableRow>
                      </TableHeader>
                      <TableBody>
                         {ISSUE_HISTORY.map(req => (
                            <TableRow key={req.id}>
                               <TableCell className="font-medium text-indigo-600">{req.id}</TableCell>
                               <TableCell>{req.project}</TableCell>
                               <TableCell>{req.date}</TableCell>
                               <TableCell>{req.items}</TableCell>
                               <TableCell>
                                  <Badge variant="outline" className={req.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}>
                                     {req.status}
                                  </Badge>
                               </TableCell>
                            </TableRow>
                         ))}
                      </TableBody>
                   </Table>
                </CardContent>
             </Card>
          ) : (
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="max-w-3xl mx-auto shadow-lg border-slate-200">
                   <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                         <PackageMinus className="w-5 h-5 text-indigo-600" /> New Material Issue
                      </h3>
                   </CardHeader>
                   <CardContent className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <label className="text-sm font-medium">Project Site</label>
                            <div className="relative">
                               <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                               <Input className="pl-9" placeholder="Select Project..." />
                            </div>
                         </div>
                         <div className="space-y-2">
                            <label className="text-sm font-medium">Required Date</label>
                            <div className="relative">
                               <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                               <Input className="pl-9" type="date" />
                            </div>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <div className="flex justify-between border-b pb-2">
                            <h4 className="font-semibold text-slate-700">Items Needed</h4>
                            <Button size="sm" variant="ghost" onClick={addItem} className="text-indigo-600 bg-indigo-50">
                               <Plus className="w-4 h-4 mr-1" /> Add
                            </Button>
                         </div>
                         {items.map((item) => (
                            <div key={item.id} className="flex gap-2">
                               <Input className="flex-grow" placeholder="Material Name / Code" />
                               <Input className="w-24" type="number" placeholder="Qty" />
                               <Button variant="ghost" size="icon" className="text-red-400" onClick={() => removeItem(item.id)}>
                                  <Trash2 className="w-4 h-4" />
                               </Button>
                            </div>
                         ))}
                      </div>

                      <div className="bg-blue-50 p-3 rounded-md flex items-start gap-2 text-sm text-blue-700">
                         <AlertCircle className="w-4 h-4 mt-0.5" />
                         <p>Requests exceeding stock levels will trigger a "Negative Stock Approval" workflow.</p>
                      </div>

                      <div className="flex justify-end pt-4">
                         <Button className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto">
                            <Send className="w-4 h-4 mr-2" /> Submit Request
                         </Button>
                      </div>
                   </CardContent>
                </Card>
             </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}