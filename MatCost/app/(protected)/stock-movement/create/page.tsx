"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  ScanBarcode, ArrowRight, MapPin, Save, 
  Search, History, Bell, User 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

export default function StockMovementPage() {
  const [step, setStep] = useState<1 | 2>(1); // 1: Scan, 2: Update
  const [barcode, setBarcode] = useState("");
  
  // Fake Item Data
  const scannedItem = {
    id: "MAT-001",
    name: "Steel Beam I-200",
    currentLoc: "Zone A - Shelf 12",
    sku: "89350012",
    qty: 50
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if(barcode) setStep(2);
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Move Stock</h2>
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

        <div className="flex-grow overflow-y-auto p-4 lg:p-10 flex flex-col items-center justify-start pt-10">
           
           <AnimatePresence mode="wait">
             {step === 1 ? (
                <motion.div 
                   key="scan"
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   className="w-full max-w-md"
                >
                   <Card className="shadow-lg border-slate-200">
                      <CardHeader className="text-center pb-2">
                         <div className="mx-auto bg-indigo-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-4 text-indigo-600">
                            <ScanBarcode className="w-10 h-10" />
                         </div>
                         <h1 className="text-2xl font-bold text-slate-900">Scan Item</h1>
                         <p className="text-slate-500">Scan barcode or enter SKU to move item</p>
                      </CardHeader>
                      <CardContent>
                         <form onSubmit={handleScan} className="space-y-4">
                            <Input 
                               placeholder="Enter Barcode / SKU..." 
                               className="text-center text-lg h-12"
                               value={barcode}
                               onChange={(e) => setBarcode(e.target.value)}
                               autoFocus
                            />
                            <Button type="submit" className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-semibold">
                               Search
                            </Button>
                         </form>
                      </CardContent>
                      <CardFooter className="justify-center border-t border-slate-100 pt-4">
                         <Button variant="ghost" className="text-slate-500 text-sm">
                            <History className="w-4 h-4 mr-2" /> Recent Movements
                         </Button>
                      </CardFooter>
                   </Card>
                </motion.div>
             ) : (
                <motion.div 
                   key="update"
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   className="w-full max-w-md space-y-4"
                >
                   <Button variant="ghost" onClick={() => setStep(1)} className="text-slate-500 pl-0 hover:bg-transparent">
                      ← Back to Scan
                   </Button>
                   
                   <Card className="shadow-md border-indigo-200 bg-indigo-50/50">
                      <CardContent className="p-6 flex items-start gap-4">
                         <div className="w-16 h-16 bg-white rounded-lg border border-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600 shadow-sm">
                            {scannedItem.name.charAt(0)}
                         </div>
                         <div>
                            <h3 className="font-bold text-lg text-slate-900">{scannedItem.name}</h3>
                            <p className="text-sm text-slate-500">SKU: {scannedItem.sku}</p>
                            <p className="text-sm font-semibold text-slate-700 mt-1">Qty: {scannedItem.qty}</p>
                         </div>
                      </CardContent>
                   </Card>

                   <Card className="shadow-lg border-slate-200">
                      <CardHeader className="pb-2">
                         <h3 className="font-semibold text-slate-900">Update Location</h3>
                      </CardHeader>
                      <CardContent className="space-y-6">
                         <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                            <div>
                               <p className="text-xs text-slate-500 uppercase font-bold">Current Location</p>
                               <p className="text-slate-900 font-medium flex items-center gap-2 mt-1">
                                  <MapPin className="w-4 h-4 text-red-500" /> {scannedItem.currentLoc}
                               </p>
                            </div>
                         </div>
                         
                         <div className="flex justify-center">
                            <ArrowRight className="w-6 h-6 text-slate-400 rotate-90 md:rotate-0" />
                         </div>

                         <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-900">New Location</label>
                            <Select>
                               <SelectTrigger className="h-12 text-lg">
                                  <SelectValue placeholder="Select Zone/Shelf" />
                               </SelectTrigger>
                               <SelectContent>
                                  <SelectItem value="z-b-12">Zone B - Shelf 01</SelectItem>
                                  <SelectItem value="z-c-05">Zone C - Floor</SelectItem>
                                  <SelectItem value="ds-01">Deep Storage 01</SelectItem>
                               </SelectContent>
                            </Select>
                         </div>
                      </CardContent>
                      <CardFooter>
                         <Button className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-md">
                            <Save className="w-5 h-5 mr-2" /> Confirm Move
                         </Button>
                      </CardFooter>
                   </Card>
                </motion.div>
             )}
           </AnimatePresence>

        </div>
      </main>
    </div>
  );
}