"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  Plus, FileText, Clock, CheckCircle, XCircle, 
  Send, Trash2, Calendar, MapPin, Bell, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { motion } from "framer-motion";

// Fake Data for History
const REQUEST_HISTORY = [
  { id: "REQ-2023-001", project: "Skyline Tower A", date: "2023-11-01", items: 4, status: "Pending" },
  { id: "REQ-2023-002", project: "Skyline Tower A", date: "2023-10-25", items: 12, status: "Approved" },
  { id: "REQ-2023-003", project: "Riverside Villa", date: "2023-10-20", items: 2, status: "Rejected" },
];

export default function MaterialRequestPage() {
  const [view, setView] = useState<"list" | "create">("list");
  
  // Fake Form State
  const [requestItems, setRequestItems] = useState([{ id: 1, name: "", qty: 1, unit: "pcs" }]);

  const addItem = () => {
    setRequestItems([...requestItems, { id: Date.now(), name: "", qty: 1, unit: "pcs" }]);
  };

  const removeItem = (id: number) => {
    setRequestItems(requestItems.filter(i => i.id !== id));
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
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
            {view === "list" ? (
               <Button onClick={() => setView("create")} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Plus className="w-4 h-4 mr-2" /> New Request
               </Button>
            ) : (
               <Button variant="outline" onClick={() => setView("list")}>
                  Cancel
               </Button>
            )}
          </div>

          {view === "list" ? (
            <Card className="border-slate-200 shadow-sm bg-white">
               <CardHeader className="pb-2"><h3 className="font-semibold">My Requests</h3></CardHeader>
               <CardContent>
                  <Table>
                     <TableHeader>
                        <TableRow className="bg-slate-50">
                           <TableHead>Request ID</TableHead>
                           <TableHead>Project</TableHead>
                           <TableHead>Date Submitted</TableHead>
                           <TableHead>Items</TableHead>
                           <TableHead>Status</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {REQUEST_HISTORY.map((req) => (
                           <TableRow key={req.id} className="hover:bg-slate-50">
                              <TableCell className="font-medium text-indigo-600">{req.id}</TableCell>
                              <TableCell>{req.project}</TableCell>
                              <TableCell>{req.date}</TableCell>
                              <TableCell>{req.items}</TableCell>
                              <TableCell>
                                 <Badge variant="outline" className={
                                    req.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                    req.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                    'bg-yellow-50 text-yellow-700 border-yellow-200'
                                 }>
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
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
               <Card className="max-w-3xl mx-auto border-slate-200 shadow-lg">
                  <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                     <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" /> Create New Request
                     </h3>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-sm font-medium">Project</label>
                           <Input defaultValue="Skyline Tower A" disabled className="bg-slate-100" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-sm font-medium">Date Required</label>
                           <div className="relative">
                              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                              <Input className="pl-9" type="date" />
                           </div>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                           <h4 className="font-semibold text-slate-700">Materials List</h4>
                           <Button size="sm" variant="ghost" onClick={addItem} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                              <Plus className="w-4 h-4 mr-1" /> Add Item
                           </Button>
                        </div>
                        {requestItems.map((item, idx) => (
                           <div key={item.id} className="flex gap-2 items-end">
                              <div className="flex-grow space-y-1">
                                 <label className="text-xs text-slate-500">Material Name / SKU</label>
                                 <Input placeholder="e.g. Steel Beam I-200" />
                              </div>
                              <div className="w-24 space-y-1">
                                 <label className="text-xs text-slate-500">Qty</label>
                                 <Input type="number" defaultValue={1} />
                              </div>
                              <div className="w-24 space-y-1">
                                 <label className="text-xs text-slate-500">Unit</label>
                                 <Input defaultValue="pcs" />
                              </div>
                              <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 mb-0.5" onClick={() => removeItem(item.id)}>
                                 <Trash2 className="w-4 h-4" />
                              </Button>
                           </div>
                        ))}
                     </div>

                     <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setView("list")}>Cancel</Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
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