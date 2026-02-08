"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  Grid3X3, Save, RotateCcw, Box, 
  Container, Layers, MousePointer2, Eraser,
  ZoomIn, ZoomOut, Bell, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Grid Configuration
const ROWS = 10;
const COLS = 12;

type CellType = "empty" | "shelf" | "deep-storage" | "staging" | "walkway";

interface CellData {
  row: number;
  col: number;
  type: CellType;
  label?: string;
}

export default function WarehouseLayoutEditor() {
  const [selectedTool, setSelectedTool] = useState<CellType | "eraser">("shelf");
  const [gridData, setGridData] = useState<CellData[]>([]);

  // Initialize Grid Logic
  const handleCellClick = (r: number, c: number) => {
    if (selectedTool === "eraser") {
      setGridData(gridData.filter((cell) => !(cell.row === r && cell.col === c)));
    } else {
      // Remove existing if any, then add new
      const filtered = gridData.filter((cell) => !(cell.row === r && cell.col === c));
      const label = selectedTool === "shelf" ? `S-${r}-${c}` : selectedTool === "deep-storage" ? `DS-${r}-${c}` : "";
      setGridData([...filtered, { row: r, col: c, type: selectedTool, label }]);
    }
  };

  const getCellColor = (type?: CellType) => {
    switch (type) {
      case "shelf": return "bg-indigo-500 hover:bg-indigo-600";
      case "deep-storage": return "bg-orange-500 hover:bg-orange-600";
      case "staging": return "bg-green-400 hover:bg-green-500";
      case "walkway": return "bg-slate-300 hover:bg-slate-400";
      default: return "bg-slate-50 hover:bg-slate-100 border-slate-200";
    }
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Warehouse Layout Editor</h2>
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

        <div className="flex-grow overflow-hidden flex">
           
           {/* Toolbox Sidebar */}
           <div className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-4 z-20 shadow-sm overflow-y-auto">
              <div>
                 <h3 className="text-sm font-bold text-slate-900 mb-2">Tools</h3>
                 <div className="grid grid-cols-2 gap-2">
                    <Button 
                       variant={selectedTool === "shelf" ? "default" : "outline"} 
                       className={`justify-start ${selectedTool === "shelf" ? "bg-indigo-600" : ""}`}
                       onClick={() => setSelectedTool("shelf")}
                    >
                       <Layers className="w-4 h-4 mr-2" /> Shelf
                    </Button>
                    <Button 
                       variant={selectedTool === "deep-storage" ? "default" : "outline"} 
                       className={`justify-start ${selectedTool === "deep-storage" ? "bg-orange-600" : ""}`}
                       onClick={() => setSelectedTool("deep-storage")}
                    >
                       <Container className="w-4 h-4 mr-2" /> Deep
                    </Button>
                    <Button 
                       variant={selectedTool === "staging" ? "default" : "outline"} 
                       className={`justify-start ${selectedTool === "staging" ? "bg-green-600" : ""}`}
                       onClick={() => setSelectedTool("staging")}
                    >
                       <Box className="w-4 h-4 mr-2" /> Staging
                    </Button>
                    <Button 
                       variant={selectedTool === "walkway" ? "default" : "outline"} 
                       className={`justify-start ${selectedTool === "walkway" ? "bg-slate-600" : ""}`}
                       onClick={() => setSelectedTool("walkway")}
                    >
                       <Grid3X3 className="w-4 h-4 mr-2" /> Path
                    </Button>
                 </div>
              </div>
              
              <div className="border-t border-slate-100 pt-4">
                 <h3 className="text-sm font-bold text-slate-900 mb-2">Actions</h3>
                 <Button 
                    variant={selectedTool === "eraser" ? "secondary" : "ghost"} 
                    className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setSelectedTool("eraser")}
                 >
                    <Eraser className="w-4 h-4 mr-2" /> Eraser Mode
                 </Button>
                 <Button variant="ghost" className="w-full justify-start" onClick={() => setGridData([])}>
                    <RotateCcw className="w-4 h-4 mr-2" /> Reset Layout
                 </Button>
              </div>

              <div className="mt-auto">
                 <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Save className="w-4 h-4 mr-2" /> Save Layout
                 </Button>
              </div>
           </div>

           {/* Canvas Area */}
           <div className="flex-grow bg-slate-100/50 p-8 overflow-auto flex items-center justify-center relative">
              
              {/* Toolbar Floating */}
              <div className="absolute top-4 right-4 flex gap-2 bg-white p-1 rounded-md shadow border border-slate-200">
                 <Button variant="ghost" size="icon" className="h-8 w-8"><ZoomIn className="w-4 h-4"/></Button>
                 <Button variant="ghost" size="icon" className="h-8 w-8"><ZoomOut className="w-4 h-4"/></Button>
              </div>

              {/* Grid */}
              <Card className="shadow-lg border-slate-300">
                 <CardContent className="p-4">
                    <div 
                       className="grid gap-1 bg-slate-200 border-2 border-slate-300 p-1"
                       style={{ 
                          gridTemplateColumns: `repeat(${COLS}, minmax(40px, 1fr))`,
                          gridTemplateRows: `repeat(${ROWS}, minmax(40px, 1fr))`
                       }}
                    >
                       {Array.from({ length: ROWS }).map((_, r) => (
                          Array.from({ length: COLS }).map((_, c) => {
                             const cell = gridData.find(g => g.row === r && g.col === c);
                             return (
                                <TooltipProvider key={`${r}-${c}`}>
                                   <Tooltip>
                                      <TooltipTrigger asChild>
                                         <div 
                                            onClick={() => handleCellClick(r, c)}
                                            className={`
                                               w-12 h-12 border border-black/5 rounded-sm cursor-pointer transition-all duration-200
                                               flex items-center justify-center text-[10px] font-bold text-white shadow-sm
                                               ${getCellColor(cell?.type)}
                                            `}
                                         >
                                            {cell?.label}
                                         </div>
                                      </TooltipTrigger>
                                      {cell && <TooltipContent>{cell.type.toUpperCase()}: {cell.label}</TooltipContent>}
                                   </Tooltip>
                                </TooltipProvider>
                             );
                          })
                       ))}
                    </div>
                 </CardContent>
              </Card>

           </div>
        </div>
      </main>
    </div>
  );
}