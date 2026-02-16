"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { ArrowLeft, Users, Plus, User, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import { auditService, EligibleStaffDto, AssignedMemberDto } from "@/services/audit-service";

export default function AssignTeamPage() {
  const router = useRouter();
  const params = useParams();
  const stockTakeId = Number(params?.id); // Lấy ID từ URL

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  
  const [auditTitle, setAuditTitle] = useState("Loading...");
  const [eligibleStaff, setEligibleStaff] = useState<EligibleStaffDto[]>([]);
  const [assignedTeam, setAssignedTeam] = useState<AssignedMemberDto[]>([]);

  useEffect(() => {
    if (!stockTakeId) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Gọi API song song
        const [teamData, eligibleData] = await Promise.all([
            auditService.getTeam(stockTakeId),
            auditService.getEligibleStaff(stockTakeId)
        ]);

        setAuditTitle(teamData.title);
        setAssignedTeam(teamData.assignedMembers);
        setEligibleStaff(eligibleData);
      } catch (error) {
        console.error("Failed to load team data", error);
        // alert("Failed to load audit data."); // Tắt alert nếu phiền
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [stockTakeId]);

  const handleAddStaff = async () => {
    if (!selectedStaffId) return;
    try {
        setIsSaving(true);
        const userId = parseInt(selectedStaffId);
        await auditService.saveTeam(stockTakeId, [userId]);
        
        // Refresh data
        const [teamData, eligibleData] = await Promise.all([
            auditService.getTeam(stockTakeId),
            auditService.getEligibleStaff(stockTakeId)
        ]);
        setAssignedTeam(teamData.assignedMembers);
        setEligibleStaff(eligibleData);
        setSelectedStaffId("");
    } catch (error: any) {
        alert(error.response?.data?.message || "Cannot assign staff.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleRemoveStaff = async (userId: number) => {
    if(!confirm("Remove this staff member?")) return;
    try {
        setIsSaving(true);
        await auditService.removeMember(stockTakeId, userId);
        
        const [teamData, eligibleData] = await Promise.all([
            auditService.getTeam(stockTakeId),
            auditService.getEligibleStaff(stockTakeId)
        ]);
        setAssignedTeam(teamData.assignedMembers);
        setEligibleStaff(eligibleData);
    } catch (error: any) {
         alert(error.response?.data?.message || "Cannot remove member.");
    } finally {
        setIsSaving(false);
    }
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
                <h2 className="text-lg font-semibold text-slate-900 leading-none">Assign Audit Team</h2>
                <span className="text-xs text-slate-500 mt-1">Audit #{stockTakeId}: {auditTitle}</span>
              </div>
            </div>
            <UserDropdown align="end" trigger={<Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"><User className="h-5 w-5" /></Button>} />
          </div>
        </header>

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 flex justify-center">
          <Card className="w-full max-w-3xl shadow-lg border-slate-200 h-fit">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                 <Users className="w-5 h-5 text-indigo-600" /> Team Management
              </CardTitle>
              <CardDescription>Select staff members responsible for counting stock in this audit session.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div className="flex flex-col md:flex-row gap-4 items-end bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                <div className="w-full space-y-2">
                    <label className="text-sm font-medium text-slate-700">Add Staff Member</label>
                    <Select value={selectedStaffId} onValueChange={setSelectedStaffId} disabled={isSaving || isLoading}>
                     <SelectTrigger className="w-full">
                         <SelectValue placeholder="Select available staff..." />
                     </SelectTrigger>
                     <SelectContent>
                        {eligibleStaff.length === 0 ? (
                            <SelectItem value="none" disabled>No eligible staff found</SelectItem>
                        ) : (
                            eligibleStaff.map(staff => (
                                <SelectItem key={staff.userId} value={staff.userId.toString()}>
                                    {staff.fullName} ({staff.email})
                                </SelectItem>
                            ))
                        )}
                     </SelectContent>
                    </Select>
                </div>
                <Button onClick={handleAddStaff} className="bg-slate-900 text-white" disabled={isSaving || !selectedStaffId}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Add
                </Button>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                    Assigned Members ({assignedTeam.length})
                </h3>
                
                <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-200">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-400">Loading team...</div>
                    ) : assignedTeam.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm italic">
                            No team members assigned yet.
                        </div>
                    ) : (
                        assignedTeam.map((member) => (
                            <div key={member.userId} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                        {member.fullName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{member.fullName}</p>
                                        <p className="text-xs text-slate-500">Assigned: {new Date(member.assignedAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="secondary" className="bg-white border-slate-200">Counter</Badge>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleRemoveStaff(member.userId)}
                                        disabled={isSaving}
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
                 <Button onClick={() => router.push("/manager/audit")}>Done</Button>
              </div>

            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}