"use client";

import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  FileText, Search, Calendar, User, Bell,
  ShieldCheck, AlertCircle, ExternalLink, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const CONTRACTS = [
  { id: "CTR-2023-001", supplier: "Hoa Phat Steel Group", value: "2,500,000,000 VND", startDate: "2023-01-01", endDate: "2023-12-31", status: "Active" },
  { id: "CTR-2023-089", supplier: "Ha Tien Cement", value: "850,000,000 VND", startDate: "2023-06-01", endDate: "2024-06-01", status: "Active" },
  { id: "CTR-2022-112", supplier: "Binh Duong Bricks Co.", value: "400,000,000 VND", startDate: "2022-01-01", endDate: "2022-12-31", status: "Expired" },
];

export default function ContractPage() {
  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Contracts</h2>
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
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Supplier Contracts</h1>
              <p className="text-sm text-slate-500">
                 Reference for Inbound Verification (<span className="font-mono text-xs bg-slate-200 px-1 rounded">BR-05</span>).
              </p>
            </div>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
               <FileText className="w-4 h-4 mr-2" /> Upload Contract
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CONTRACTS.map((contract, idx) => (
              <motion.div
                key={contract.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="hover:shadow-md transition-shadow border-slate-200 bg-white">
                   <CardHeader className="flex flex-row items-start justify-between pb-2">
                      <div className="space-y-1">
                         <Badge 
                            variant="outline" 
                            className={`${
                               contract.status === 'Active' 
                               ? 'bg-green-50 text-green-700 border-green-200' 
                               : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                         >
                            {contract.status === 'Active' ? <ShieldCheck className="w-3 h-3 mr-1"/> : <AlertCircle className="w-3 h-3 mr-1"/>}
                            {contract.status}
                         </Badge>
                         <h3 className="font-bold text-lg text-slate-900 line-clamp-1">{contract.supplier}</h3>
                         <p className="text-xs text-slate-500 font-mono">{contract.id}</p>
                      </div>
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                         <FileText className="w-5 h-5" />
                      </div>
                   </CardHeader>
                   <CardContent className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                         <div>
                            <p className="text-slate-500 text-xs">Total Value</p>
                            <p className="font-medium text-slate-900">{contract.value}</p>
                         </div>
                         <div>
                            <p className="text-slate-500 text-xs">Valid Until</p>
                            <div className="flex items-center gap-1 font-medium text-slate-900">
                               <Calendar className="w-3 h-3 text-slate-400"/> {contract.endDate}
                            </div>
                         </div>
                      </div>
                      
                      <div className="pt-2 flex gap-2">
                         <Button variant="outline" size="sm" className="w-full text-xs">
                            <ExternalLink className="w-3 h-3 mr-2" /> View Details
                         </Button>
                         <Button variant="ghost" size="sm" className="w-10 px-0">
                            <Download className="w-4 h-4 text-slate-500" />
                         </Button>
                      </div>
                   </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}