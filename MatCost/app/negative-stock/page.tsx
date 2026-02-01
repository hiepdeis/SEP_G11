"use client";

import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  AlertOctagon, Check, X, FileText, 
  ArrowUpRight, Bell, User 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const NEGATIVE_REQUESTS = [
  { 
    id: "NEG-REQ-001", 
    originalReq: "MIR-2025-103",
    item: "Cement Ha Tien",
    requested: 2000,
    available: 1500,
    shortage: 500,
    reason: "Urgent for foundation pouring tomorrow."
  }
];

export default function NegativeStockPage() {
  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Exception Handling</h2>
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

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-8">
           
           {/* Section 4.3: Manager Approval */}
           <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                 <AlertOctagon className="w-6 h-6 text-red-600" /> Negative Stock Approvals
              </h2>
              {NEGATIVE_REQUESTS.map(req => (
                 <Card key={req.id} className="border-l-4 border-l-red-500 shadow-md">
                    <CardContent className="p-6">
                       <div className="flex flex-col md:flex-row justify-between gap-6">
                          <div className="space-y-2">
                             <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-slate-900">{req.item}</h3>
                                <Badge variant="destructive">Shortage: -{req.shortage}</Badge>
                             </div>
                             <p className="text-slate-600 text-sm">
                                Stock: <strong>{req.available}</strong> | Requested: <strong>{req.requested}</strong>
                             </p>
                             <p className="text-sm text-slate-500 italic">"Reason: {req.reason}"</p>
                          </div>
                          
                          <div className="flex flex-col gap-2 min-w-[180px]">
                             <Button className="bg-red-600 hover:bg-red-700 text-white shadow-sm">
                                <Check className="w-4 h-4 mr-2" /> Approve Exception
                             </Button>
                             <Button variant="outline">
                                <X className="w-4 h-4 mr-2" /> Reject
                             </Button>
                          </div>
                       </div>
                       
                       <div className="mt-4 bg-slate-100 p-3 rounded text-xs text-slate-600 flex items-center gap-2">
                          <ArrowUpRight className="w-4 h-4" /> 
                          Approving this will automatically generate a <strong>Debit Note</strong> for Accounting.
                       </div>
                    </CardContent>
                 </Card>
              ))}
           </div>

           {/* Section 4.4: Debit Note List (Accountant View) */}
           <div className="pt-6 border-t border-slate-200 space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                 <FileText className="w-6 h-6 text-indigo-600" /> Debit Notes (Generated)
              </h2>
              <Card>
                 <CardContent className="p-0">
                    <table className="w-full text-sm text-left">
                       <thead className="bg-slate-50 text-slate-500">
                          <tr>
                             <th className="p-4">DN ID</th>
                             <th className="p-4">Related Request</th>
                             <th className="p-4">Amount</th>
                             <th className="p-4">Status</th>
                             <th className="p-4 text-right">Action</th>
                          </tr>
                       </thead>
                       <tbody>
                          <tr className="border-b border-slate-100">
                             <td className="p-4 font-medium">DN-2025-001</td>
                             <td className="p-4">NEG-REQ-001</td>
                             <td className="p-4">42,500,000 VND</td>
                             <td className="p-4"><Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pending Post</Badge></td>
                             <td className="p-4 text-right">
                                <Button size="sm" variant="ghost" className="text-indigo-600">Post to Ledger</Button>
                             </td>
                          </tr>
                       </tbody>
                    </table>
                 </CardContent>
              </Card>
           </div>
        </div>
      </main>
    </div>
  );
}