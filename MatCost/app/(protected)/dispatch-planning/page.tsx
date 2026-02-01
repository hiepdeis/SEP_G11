"use client";

import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  Truck, CheckSquare, AlertTriangle, ArrowRight, 
  CalendarClock, Bell, User 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const PENDING_REQUESTS = [
  { 
    id: "MIR-2025-101", 
    project: "Skyline Tower A", 
    items: "Steel Beam (x50)", 
    stockStatus: "Available", 
    requestedDate: "2025-11-02" 
  },
  { 
    id: "MIR-2025-103", 
    project: "City Mall", 
    items: "Cement (x2000)", 
    stockStatus: "Insufficient", // Trigger Negative Stock
    requestedDate: "2025-11-03" 
  },
];

export default function DispatchPlanningPage() {
  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Dispatch Planning</h2>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             
             {/* Left: Requests Queue */}
             <div className="space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                   <CheckSquare className="w-5 h-5 text-indigo-600" /> Pending Requests
                </h3>
                {PENDING_REQUESTS.map(req => (
                   <Card key={req.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                         <div className="flex justify-between items-start mb-2">
                            <div>
                               <h4 className="font-bold text-slate-900">{req.id}</h4>
                               <p className="text-sm text-slate-500">{req.project}</p>
                            </div>
                            <Badge className={
                               req.stockStatus === 'Available' 
                               ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                               : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }>
                               {req.stockStatus}
                            </Badge>
                         </div>
                         <p className="text-sm text-slate-700 mb-4">Items: {req.items}</p>
                         
                         {req.stockStatus === 'Available' ? (
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                               Create Dispatch Plan <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                         ) : (
                            <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50">
                               Request Negative Approval <AlertTriangle className="w-4 h-4 ml-2" />
                            </Button>
                         )}
                      </CardContent>
                   </Card>
                ))}
             </div>

             {/* Right: Active Dispatch Plan Form */}
             <div className="space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                   <Truck className="w-5 h-5 text-indigo-600" /> New Dispatch Schedule
                </h3>
                <Card className="border-slate-200 bg-slate-50/50">
                   <CardHeader className="border-b border-slate-100 pb-3">
                      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Plan Details for MIR-2025-101</h4>
                   </CardHeader>
                   <CardContent className="p-6 space-y-4">
                      <div className="space-y-2">
                         <label className="text-sm font-medium">Assign Vehicle</label>
                         <Input placeholder="Plate Number (e.g. 59C-123.45)" className="bg-white" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-medium">Driver Name</label>
                         <Input placeholder="Select Driver..." className="bg-white" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <label className="text-sm font-medium">Gate</label>
                            <Input placeholder="Gate A/B/C" className="bg-white" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-sm font-medium">Time</label>
                            <div className="relative">
                               <CalendarClock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                               <Input className="pl-9 bg-white" type="datetime-local" />
                            </div>
                         </div>
                      </div>
                   </CardContent>
                   <CardFooter className="bg-white p-4 border-t border-slate-100">
                      <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                         Confirm & Send to Warehouse
                      </Button>
                   </CardFooter>
                </Card>
             </div>

          </div>
        </div>
      </main>
    </div>
  );
}