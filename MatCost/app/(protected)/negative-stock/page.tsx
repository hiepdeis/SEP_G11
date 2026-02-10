"use client";

import { useState, useMemo } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  AlertOctagon, Check, X, Search, Eye, 
  Filter, Bell, User, AlertTriangle, ArrowRight,
  TrendingDown, PackageMinus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

// Mock Data
const NEGATIVE_REQUESTS = [
  { 
    id: "NEG-001", 
    reqId: "MIR-103",
    project: "Skyline Tower A",
    requester: "Construction Team C",
    date: "2025-11-02",
    item: "Cement Ha Tien",
    sku: "89350088",
    requested: 2000,
    available: 1500,
    shortage: 500,
    unit: "bag",
    reason: "Urgent foundation pouring. Supplier delivery delayed.",
    priority: "High"
  },
  { 
    id: "NEG-002", 
    reqId: "MIR-105",
    project: "Riverside Villa",
    requester: "Site Manager B",
    date: "2025-11-03",
    item: "Steel Pipe D42",
    sku: "89350012",
    requested: 100,
    available: 80,
    shortage: 20,
    unit: "pcs",
    reason: "Design change required extra piping immediately.",
    priority: "Normal"
  },
  { 
    id: "NEG-003", 
    reqId: "MIR-106",
    project: "City Mall Renovation",
    requester: "Staff A",
    date: "2025-11-04",
    item: "Red Brick",
    sku: "89350099",
    requested: 5000,
    available: 0,
    shortage: 5000,
    unit: "pcs",
    reason: "Inventory discrepancy found during picking.",
    priority: "High"
  },
];

export default function NegativeStockListPage() {
  const [requests, setRequests] = useState(NEGATIVE_REQUESTS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<typeof NEGATIVE_REQUESTS[0] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter Logic
  const filteredRequests = useMemo(() => {
    return requests.filter(req => 
      req.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [requests, searchQuery]);

  // Toggle selection for one item
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Toggle Select All
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRequests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRequests.map(r => r.id));
    }
  };

  // Bulk Action Handler
  const handleBulkAction = async (action: "Approve" | "Reject") => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 800)); // Fake API
    
    setRequests(prev => prev.filter(r => !selectedIds.includes(r.id)));
    setSelectedIds([]);
    setIsSubmitting(false);
    
    alert(`Successfully ${action}d ${selectedIds.length} requests.`);
  };

  // Single Action Handler (from Dialog)
  const handleSingleAction = (id: string, action: "Approve" | "Reject") => {
    setRequests(prev => prev.filter(r => r.id !== id));
    setSelectedRequest(null);
    alert(`Request ${id} ${action}d.`);
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Negative Stock</h2>
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

        <div className="flex-grow overflow-y-auto p-4 lg:p-8 space-y-6 pb-28">
           
           {/* Stats Summary */}
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-600 text-white p-4 rounded-xl shadow-md">
                 <p className="text-xs font-medium opacity-80 uppercase">Pending Exceptions</p>
                 <h3 className="text-3xl font-bold flex items-center gap-2">
                    {requests.length} <AlertOctagon className="w-6 h-6 opacity-50"/>
                 </h3>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                 <p className="text-xs font-medium text-slate-500 uppercase">High Priority</p>
                 <h3 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                    {requests.filter(r => r.priority === 'High').length} <TrendingDown className="w-6 h-6 text-red-500"/>
                 </h3>
              </div>
           </div>

           {/* Search & Filter */}
           <div className="flex items-center justify-between gap-4">
              <div className="relative flex-grow">
                 <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                 <Input 
                    placeholder="Search Item or Project..." 
                    className="pl-9 bg-white" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                 />
              </div>
              <Button variant="outline" size="icon" className="shrink-0">
                 <Filter className="w-4 h-4" />
              </Button>
           </div>

           {/* List Header: Select All */}
           <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                 <Checkbox 
                    checked={filteredRequests.length > 0 && selectedIds.length === filteredRequests.length}
                    onCheckedChange={toggleSelectAll}
                    id="select-all"
                 />
                 <label htmlFor="select-all" className="text-sm font-medium text-slate-600 cursor-pointer select-none">
                    Select All ({filteredRequests.length})
                 </label>
              </div>
              <span className="text-xs text-slate-400">Swipe or tap to view</span>
           </div>

           {/* Request List (Cards) */}
           <div className="space-y-3">
              <AnimatePresence>
                 {filteredRequests.map((req) => (
                    <motion.div 
                       key={req.id}
                       layout
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, x: -50 }}
                    >
                       <Card 
                          className={`border-l-4 shadow-sm transition-all cursor-pointer ${
                             selectedIds.includes(req.id) 
                                ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/30' 
                                : 'border-slate-300 bg-white hover:border-red-300'
                          }`}
                          onClick={(e) => {
                             // Prevent toggling when clicking the "View Detail" button
                             if ((e.target as HTMLElement).closest('.view-btn')) return;
                             toggleSelection(req.id);
                          }}
                       >
                          <CardContent className="p-4 flex gap-4 items-start">
                             
                             {/* Checkbox */}
                             <Checkbox 
                                checked={selectedIds.includes(req.id)}
                                onCheckedChange={() => toggleSelection(req.id)}
                                className="mt-1"
                             />

                             {/* Content */}
                             <div className="flex-grow space-y-3">
                                {/* Top Row: Title & Priority */}
                                <div className="flex justify-between items-start">
                                   <div>
                                      <h3 className="font-bold text-slate-900 leading-tight">{req.item}</h3>
                                      <p className="text-xs text-slate-500 mt-0.5">{req.project}</p>
                                   </div>
                                   <div className="flex flex-col items-end gap-1">
                                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-slate-50 text-slate-500 border-slate-200">
                                         {req.id}
                                      </Badge>
                                      {req.priority === 'High' && (
                                         <span className="text-[10px] font-bold text-red-600 uppercase flex items-center gap-0.5">
                                            <AlertTriangle className="w-3 h-3" /> High
                                         </span>
                                      )}
                                   </div>
                                </div>

                                {/* Shortage Visual (Similar to Movement "From->To") */}
                                <div className="bg-red-50 p-2.5 rounded-lg border border-red-100 flex items-center justify-between text-sm">
                                   <div className="flex flex-col">
                                      <span className="text-[10px] text-red-400 font-bold uppercase">Available</span>
                                      <span className="font-semibold text-slate-700">{req.available} {req.unit}</span>
                                   </div>
                                   
                                   <div className="flex flex-col items-center px-2">
                                      <ArrowRight className="w-4 h-4 text-red-300" />
                                      <span className="text-[10px] text-red-600 font-bold">-{req.shortage}</span>
                                   </div>

                                   <div className="flex flex-col items-end">
                                      <span className="text-[10px] text-red-400 font-bold uppercase">Requested</span>
                                      <span className="font-bold text-red-700">{req.requested} {req.unit}</span>
                                   </div>
                                </div>

                                {/* Footer: Reason & Detail Button */}
                                <div className="flex items-center justify-between gap-4 pt-1">
                                   <p className="text-xs text-slate-500 italic truncate flex-grow">
                                      "{req.reason}"
                                   </p>
                                   <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="view-btn h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 -mr-2"
                                      onClick={(e) => {
                                         e.stopPropagation();
                                         setSelectedRequest(req);
                                      }}
                                   >
                                      View Detail <Eye className="w-3 h-3 ml-1" />
                                   </Button>
                                </div>
                             </div>
                          </CardContent>
                       </Card>
                    </motion.div>
                 ))}
              </AnimatePresence>

              {filteredRequests.length === 0 && (
                 <div className="text-center py-12 text-slate-400">
                    <PackageMinus className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No negative stock requests found.</p>
                 </div>
              )}
           </div>

        </div>

        {/* Floating Bottom Action Bar */}
        <AnimatePresence>
           {selectedIds.length > 0 && (
              <motion.div 
                 initial={{ y: 100 }}
                 animate={{ y: 0 }}
                 exit={{ y: 100 }}
                 className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.1)] z-40"
              >
                 <div className="flex items-center justify-between max-w-4xl mx-auto gap-4">
                    <div className="hidden sm:block">
                       <p className="font-bold text-slate-900">{selectedIds.length} items selected</p>
                       <p className="text-xs text-slate-500">Bulk approval action</p>
                    </div>
                    
                    <div className="flex gap-3 w-full sm:w-auto">
                       <Button 
                          variant="outline"
                          onClick={() => handleBulkAction("Reject")}
                          disabled={isSubmitting}
                          className="flex-1 sm:flex-none border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-12 sm:h-10"
                       >
                          <X className="w-4 h-4 mr-2" /> Reject
                       </Button>
                       <Button 
                          onClick={() => handleBulkAction("Approve")} 
                          disabled={isSubmitting}
                          className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white shadow-md h-12 sm:h-10"
                       >
                          <Check className="w-4 h-4 mr-2" /> Approve All
                       </Button>
                    </div>
                 </div>
              </motion.div>
           )}
        </AnimatePresence>

        {/* Detail Dialog */}
        {selectedRequest && (
           <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
              <DialogContent className="max-w-md">
                 <DialogHeader>
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                       <AlertTriangle className="w-5 h-5" />
                       <span className="font-bold uppercase text-xs tracking-wide">Negative Stock Warning</span>
                    </div>
                    <DialogTitle>Exception Request: {selectedRequest.id}</DialogTitle>
                    <DialogDescription>
                       Requested by {selectedRequest.requester}
                    </DialogDescription>
                 </DialogHeader>
                 
                 <div className="space-y-4 py-2">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                       <p className="text-xs font-bold text-slate-500 uppercase mb-1">Material</p>
                       <p className="text-lg font-bold text-slate-900">{selectedRequest.item}</p>
                       <p className="text-sm text-slate-500">{selectedRequest.project}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       <div className="p-3 border border-slate-200 rounded-lg text-center">
                          <p className="text-xs text-slate-500 font-bold uppercase">Current</p>
                          <p className="text-xl font-bold text-slate-700">{selectedRequest.available}</p>
                       </div>
                       <div className="p-3 border border-red-200 bg-red-50 rounded-lg text-center">
                          <p className="text-xs text-red-600 font-bold uppercase">Requested</p>
                          <p className="text-xl font-bold text-red-700">{selectedRequest.requested}</p>
                       </div>
                    </div>

                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                       <p className="text-xs font-bold text-yellow-700 uppercase mb-1">Justification</p>
                       <p className="text-sm text-yellow-900 italic">"{selectedRequest.reason}"</p>
                    </div>
                 </div>

                 <DialogFooter className="flex-row gap-2 justify-end">
                    <Button variant="outline" className="flex-1" onClick={() => handleSingleAction(selectedRequest.id, "Reject")}>
                       Reject
                    </Button>
                    <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => handleSingleAction(selectedRequest.id, "Approve")}>
                       Approve Exception
                    </Button>
                 </DialogFooter>
              </DialogContent>
           </Dialog>
        )}

      </main>
    </div>
  );
}