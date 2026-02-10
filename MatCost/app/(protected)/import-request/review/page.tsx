"use client";

import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  FileCheck, XCircle, PenTool, CheckCircle2,
  Bell, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function ImportApprovalPage() {
  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Review Inbound Request</h2>
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

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 flex justify-center">
           <Card className="w-full max-w-4xl border-slate-200 shadow-lg bg-white">
              <CardHeader className="text-center border-b border-slate-100 pb-6">
                 <div className="mx-auto w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                    <FileCheck className="w-6 h-6" />
                 </div>
                 <h1 className="text-2xl font-bold text-slate-900">Goods Receipt Note #GRN-8821</h1>
                 <p className="text-slate-500">Submitted by: Accountant User • Date: Oct 26, 2025</p>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                 {/* Key Info */}
                 <div className="grid grid-cols-3 gap-6 text-sm">
                    <div>
                       <p className="text-slate-500 mb-1">Supplier</p>
                       <p className="font-semibold text-slate-900">Hoa Phat Steel Group</p>
                    </div>
                    <div>
                       <p className="text-slate-500 mb-1">Linked Contract</p>
                       <p className="font-semibold text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> CTR-2023-001
                       </p>
                    </div>
                    <div>
                       <p className="text-slate-500 mb-1">Total Value</p>
                       <p className="font-semibold text-slate-900">767,000,000 VND</p>
                    </div>
                 </div>

                 <Separator />

                 {/* Items Table */}
                 <div>
                    <h3 className="font-semibold text-slate-800 mb-4">Items Summary</h3>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                       <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 font-medium">
                             <tr>
                                <th className="p-3">Item</th>
                                <th className="p-3 text-right">Qty</th>
                                <th className="p-3 text-right">Price</th>
                                <th className="p-3 text-right">Total</th>
                             </tr>
                          </thead>
                          <tbody>
                             <tr className="border-b border-slate-100">
                                <td className="p-3">Steel Beam I-200</td>
                                <td className="p-3 text-right">500</td>
                                <td className="p-3 text-right">1.5m</td>
                                <td className="p-3 text-right font-medium">750,000,000</td>
                             </tr>
                             <tr>
                                <td className="p-3">Cement Ha Tien</td>
                                <td className="p-3 text-right">200</td>
                                <td className="p-3 text-right">85k</td>
                                <td className="p-3 text-right font-medium">17,000,000</td>
                             </tr>
                          </tbody>
                       </table>
                    </div>
                 </div>
              </CardContent>
              <CardFooter className="bg-slate-50 p-6 flex justify-between items-center border-t border-slate-100">
                 <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    <XCircle className="w-4 h-4 mr-2" /> Reject & Return
                 </Button>
                 <div className="flex gap-3">
                    <Button variant="outline">Hold for Review</Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                       <PenTool className="w-4 h-4 mr-2" /> Approve & Digitally Sign
                    </Button>
                 </div>
              </CardFooter>
           </Card>
        </div>
      </main>
    </div>
  );
}