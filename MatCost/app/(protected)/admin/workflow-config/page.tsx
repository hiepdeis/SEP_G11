"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  Bell, 
  User, 
  ShieldCheck, 
  FileInput, 
  FileOutput, 
  AlertTriangle, 
  CheckCircle2, 
  Save,
  Loader2,
  GitPullRequest
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner"; // Hoặc useToast tùy library bạn dùng
import { motion } from "framer-motion";

// Fake Data Definitions
type WorkflowType = "inbound" | "outbound" | "negative_stock" | "audit";

interface WorkflowConfig {
  id: string;
  name: string;
  description: string;
  type: WorkflowType;
  approverRole: string; // Role required to approve
  isActive: boolean;
  icon: React.ElementType;
}

export default function ApprovalConfigPage() {
  const [isSaving, setIsSaving] = useState(false);
  
  // Fake Initial State
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([
    {
      id: "wf-01",
      name: "Standard Inbound Approval",
      description: "Approval required for standard goods receipt notes (GRN).",
      type: "inbound",
      approverRole: "warehouse_manager",
      isActive: true,
      icon: FileInput,
    },
    {
      id: "wf-02",
      name: "Standard Outbound Approval",
      description: "Approval for issuing materials based on valid requests.",
      type: "outbound",
      approverRole: "warehouse_manager",
      isActive: true,
      icon: FileOutput,
    },
    {
      id: "wf-03",
      name: "Negative Stock Issue",
      description: "Special approval when issuing items with insufficient system stock.",
      type: "negative_stock",
      approverRole: "director",
      isActive: true,
      icon: AlertTriangle,
    },
    {
      id: "wf-04",
      name: "Inventory Audit Adjustment",
      description: "Approval to finalize stock discrepancies after stocktaking.",
      type: "audit",
      approverRole: "accountant",
      isActive: true,
      icon: ShieldCheck,
    },
  ]);

  const handleRoleChange = (id: string, newRole: string) => {
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, approverRole: newRole } : w));
  };

  const handleToggle = (id: string) => {
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, isActive: !w.isActive } : w));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Fake API Call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSaving(false);
    toast.success("Workflow configurations updated successfully.");
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Approval Workflows</h2>
            </div>
            <div className="flex items-center gap-4 ml-auto">
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
          </div>
        </header>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6 lg:p-10">
          <div className="max-w-4xl mx-auto space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Workflow Configuration</h1>
                <p className="text-slate-500">Manage approval hierarchies and permissions.</p>
              </div>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>}
                Save Changes
              </Button>
            </div>

            <div className="grid gap-6">
              {workflows.map((wf, index) => (
                <motion.div
                  key={wf.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`border-l-4 ${wf.isActive ? 'border-l-indigo-500' : 'border-l-slate-300'}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${wf.isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                            <wf.icon className="w-6 h-6" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-medium text-slate-900 flex items-center gap-2">
                              {wf.name}
                              {!wf.isActive && <Badge variant="secondary" className="text-xs font-normal">Inactive</Badge>}
                            </CardTitle>
                            <CardDescription className="mt-1">{wf.description}</CardDescription>
                          </div>
                        </div>
                        <Switch 
                          checked={wf.isActive} 
                          onCheckedChange={() => handleToggle(wf.id)}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-md border border-slate-100">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <GitPullRequest className="w-4 h-4" />
                          <span>Assigned Approver:</span>
                        </div>
                        <div className="w-[250px]">
                          <Select 
                            value={wf.approverRole} 
                            onValueChange={(val) => handleRoleChange(wf.id, val)} 
                            disabled={!wf.isActive}
                          >
                            <SelectTrigger className="bg-white border-slate-300">
                              <SelectValue placeholder="Select Role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="warehouse_manager">Warehouse Manager</SelectItem>
                              <SelectItem value="accountant">Accountant</SelectItem>
                              <SelectItem value="director">Director / Admin</SelectItem>
                              <SelectItem value="project_manager">Project Manager</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {wf.type === "negative_stock" && wf.isActive && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Warning: Negative stock approvals affect accounting entries (Debit Note).
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}