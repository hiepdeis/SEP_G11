"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import {
  ArrowLeft,
  Users,
  Save,
  User,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

// Mock Data nhân sự
const STAFF_LIST = [
  { id: "s1", name: "Nguyen Van A", role: "Warehouse Staff" },
  { id: "s2", name: "Tran Thi B", role: "Warehouse Staff" },
  { id: "s3", name: "Le Van C", role: "Supervisor" },
];

export default function AssignTeamPage() {
  const router = useRouter();
  const [selectedStaffId, setSelectedStaffId] = useState("");
  // State lưu danh sách nhân viên đã được gán
  const [assignedTeam, setAssignedTeam] = useState<typeof STAFF_LIST>([]);

  const handleAddStaff = () => {
    if (!selectedStaffId) return;
    
    // Kiểm tra xem đã add chưa
    if (assignedTeam.find(s => s.id === selectedStaffId)) {
        alert("Staff already assigned!");
        return;
    }

    const staff = STAFF_LIST.find(s => s.id === selectedStaffId);
    if (staff) {
      setAssignedTeam([...assignedTeam, staff]);
      setSelectedStaffId(""); // Reset selection
    }
  };

  const handleRemoveStaff = (id: string) => {
    setAssignedTeam(assignedTeam.filter(s => s.id !== id));
  };

  const handleSave = () => {
    // API Call to save team
    alert("Team assigned successfully!");
    router.push("/audit");
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </Button>
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-slate-900 leading-none">
                  Assign Audit Team
                </h2>
                <span className="text-xs text-slate-500 mt-1">For Audit: AUD-2026-Q1</span>
              </div>
            </div>
            <UserDropdown
              align="end"
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  <User className="h-5 w-5" />
                </Button>
              }
            />
          </div>
        </header>

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 flex justify-center">
          <Card className="w-full max-w-3xl shadow-lg border-slate-200 h-fit">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                 <Users className="w-5 h-5 text-indigo-600" /> Team Management
              </CardTitle>
              <CardDescription>
                Select staff members responsible for counting stock in this audit session.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* Add Member Section */}
              <div className="flex flex-col md:flex-row gap-4 items-end bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                <div className="w-full space-y-2">
                   <label className="text-sm font-medium text-slate-700">Add Staff Member</label>
                   <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select staff..." />
                    </SelectTrigger>
                    <SelectContent>
                        {STAFF_LIST.map(staff => (
                            <SelectItem key={staff.id} value={staff.id}>
                                {staff.name} - {staff.role}
                            </SelectItem>
                        ))}
                    </SelectContent>
                   </Select>
                </div>
                <Button onClick={handleAddStaff} className="bg-slate-900 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Add
                </Button>
              </div>

              {/* Assigned List */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                    Assigned Members ({assignedTeam.length})
                </h3>
                
                <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-200">
                    {assignedTeam.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm italic">
                            No team members assigned yet.
                        </div>
                    ) : (
                        assignedTeam.map((member) => (
                            <div key={member.id} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                        {member.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{member.name}</p>
                                        <p className="text-xs text-slate-500">{member.role}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="secondary" className="bg-white border-slate-200">Counter</Badge>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleRemoveStaff(member.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
                <Button variant="ghost" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px]"
                >
                  <Save className="w-4 h-4 mr-2" /> Save Assignment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}