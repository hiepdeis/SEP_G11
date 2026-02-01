"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  ClipboardCheck, Check, X, Camera, AlertTriangle, 
  ChevronDown, ChevronUp, Bell, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

// Fake QC Items
const QC_ITEMS = [
  { id: 1, name: "Steel Beam I-200", qty: 500, status: "pending" as "pending" | "pass" | "fail" },
  { id: 2, name: "Cement Ha Tien", qty: 200, status: "pending" as "pending" | "pass" | "fail" },
];

export default function QualityControlPage() {
  const [items, setItems] = useState(QC_ITEMS);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleStatus = (id: number, status: "pass" | "fail") => {
    setItems(items.map(i => i.id === id ? { ...i, status } : i));
    if (status === "fail") {
       setExpandedId(id); // Auto expand report form on fail
    } else {
       if (expandedId === id) setExpandedId(null);
    }
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">QC Inspection</h2>
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

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 max-w-3xl mx-auto w-full space-y-6">
           
           <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex justify-between items-center">
              <div>
                 <h2 className="font-bold text-slate-900">GRN-8821 Inspection</h2>
                 <p className="text-xs text-slate-500">Supplier: Hoa Phat Steel Group</p>
              </div>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">In Progress</Badge>
           </div>

           <div className="space-y-4">
              {items.map((item) => (
                 <motion.div key={item.id} layout transition={{ duration: 0.2 }}>
                    <Card className={`border-l-4 transition-all ${
                       item.status === 'pass' ? 'border-l-green-500 border-slate-200' : 
                       item.status === 'fail' ? 'border-l-red-500 border-red-200 bg-red-50/10' : 
                       'border-l-slate-300 border-slate-200'
                    }`}>
                       <div className="p-4 flex items-center justify-between">
                          <div>
                             <h3 className="font-semibold text-slate-800">{item.name}</h3>
                             <p className="text-sm text-slate-500">Qty: {item.qty} units</p>
                          </div>
                          
                          <div className="flex gap-2">
                             <Button 
                                size="sm" 
                                variant={item.status === 'pass' ? "default" : "outline"}
                                className={item.status === 'pass' ? "bg-green-600 hover:bg-green-700" : "text-slate-500"}
                                onClick={() => handleStatus(item.id, 'pass')}
                             >
                                <Check className="w-4 h-4 mr-1" /> Pass
                             </Button>
                             <Button 
                                size="sm" 
                                variant={item.status === 'fail' ? "default" : "outline"}
                                className={item.status === 'fail' ? "bg-red-600 hover:bg-red-700" : "text-slate-500"}
                                onClick={() => handleStatus(item.id, 'fail')}
                             >
                                <X className="w-4 h-4 mr-1" /> Fail
                             </Button>
                          </div>
                       </div>

                       {/* 3.5. Irregularity Report Detail Form (Nested) */}
                       <AnimatePresence>
                          {item.status === 'fail' && (
                             <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                             >
                                <div className="border-t border-red-100 p-4 bg-red-50/50">
                                   <div className="flex items-center gap-2 mb-3 text-red-700 font-semibold text-sm">
                                      <AlertTriangle className="w-4 h-4" /> Irregularity Report Required
                                   </div>
                                   
                                   <div className="space-y-3">
                                      <div className="space-y-1">
                                         <label className="text-xs font-medium text-slate-700">Issue Description</label>
                                         <Textarea placeholder="Describe the damage, wrong quantity, or wrong item..." className="bg-white" />
                                      </div>
                                      
                                      <div className="flex items-center gap-3">
                                         <Button variant="outline" size="sm" className="bg-white text-slate-600 border-dashed border-slate-300 w-full justify-center">
                                            <Camera className="w-4 h-4 mr-2" /> Upload Evidence
                                         </Button>
                                         <Input type="number" placeholder="Failed Qty" className="w-32 bg-white" />
                                      </div>
                                   </div>
                                </div>
                             </motion.div>
                          )}
                       </AnimatePresence>
                    </Card>
                 </motion.div>
              ))}
           </div>

           <Button className="w-full h-12 text-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg mt-6">
              <ClipboardCheck className="w-5 h-5 mr-2" /> Complete Inspection
           </Button>

        </div>
      </main>
    </div>
  );
}