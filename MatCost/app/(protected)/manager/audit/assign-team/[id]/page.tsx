"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { ArrowLeft, Users, Plus, Trash2, Loader2, CheckCircle2, CheckSquare, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { auditService, EligibleStaffDto, AssignedMemberDto } from "@/services/audit-service";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export default function AssignTeamPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const stockTakeId = Number(params?.id);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
  const [isStaffPopoverOpen, setIsStaffPopoverOpen] = useState(false);
  
  const [auditTitle, setAuditTitle] = useState("Loading...");
  const [eligibleStaff, setEligibleStaff] = useState<EligibleStaffDto[]>([]);
  const [assignedTeam, setAssignedTeam] = useState<AssignedMemberDto[]>([]);

  useEffect(() => {
    if (!stockTakeId) return;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [teamData, eligibleData] = await Promise.all([ auditService.getTeam(stockTakeId), auditService.getEligibleStaff(stockTakeId) ]);
        setAuditTitle(teamData.title);
        setAssignedTeam(teamData.assignedMembers);
        setEligibleStaff(eligibleData);
      } catch (error) { console.error("Error:", error); } finally { setIsLoading(false); }
    };
    fetchData();
  }, [stockTakeId]);

  const handleSelectStaff = (userId: number, checked: boolean) => {
    const next = checked ? [...selectedStaffIds, userId] : selectedStaffIds.filter(id => id !== userId);
    setSelectedStaffIds(next);
  };

  const handleAddStaff = async () => {
    if (selectedStaffIds.length === 0) return;
    try {
        setIsSaving(true);
        // Combine existing assigned members with the new selections
        const currentMemberIds = assignedTeam.map(m => m.userId);
        const allMemberIds = [...currentMemberIds, ...selectedStaffIds];
        
        await auditService.saveTeam(stockTakeId, allMemberIds);
        toast.success(t("Staff added to team!"));
        const [teamData, eligibleData] = await Promise.all([ auditService.getTeam(stockTakeId), auditService.getEligibleStaff(stockTakeId) ]);
        setAssignedTeam(teamData.assignedMembers);
        setEligibleStaff(eligibleData);
        setSelectedStaffIds([]);
        setIsStaffPopoverOpen(false);
    } catch (error: any) { toast.error(t(error.response?.data?.message || "Error assigning staff.")); } 
    finally { setIsSaving(false); }
  };

  const handleRemoveStaff = async (userId: number) => {
    if(!confirm(t("Are you sure you want to remove this staff from the team?"))) return;
    try {
        setIsSaving(true);
        await auditService.removeMember(stockTakeId, userId);
        toast.success(t("Staff removed."));
        const [teamData, eligibleData] = await Promise.all([ auditService.getTeam(stockTakeId), auditService.getEligibleStaff(stockTakeId) ]);
        setAssignedTeam(teamData.assignedMembers);
        setEligibleStaff(eligibleData);
    } catch (error: any) { toast.error(t(error.response?.data?.message || "Error")); } 
    finally { setIsSaving(false); }
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title={`${t("Assign Team - Audit")} #${stockTakeId}`} />

        <div className="flex-grow overflow-y-auto">
          <div className="p-6 lg:p-10 space-y-6 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:bg-transparent hover:text-indigo-600"><ArrowLeft className="w-4 h-4 mr-2" /> {t("Back to List")}</Button>
            <div className="text-sm text-slate-500 text-right">{t("Audit Title:")} <span className="font-semibold text-slate-800 block">{auditTitle}</span></div>
          </div>

          <Card className="border-slate-200 shadow-sm gap-0 overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 py-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800"><Users className="w-5 h-5 text-indigo-600" /> {t("Team Management")}</CardTitle>
              <CardDescription>{t("Select staff members responsible for counting stock in this audit session.")}</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8 bg-slate-50/50">
              <div className="pt-6">
                <div className="flex flex-col md:flex-row gap-4 items-end bg-white p-5 rounded-lg border border-slate-200 shadow-sm transition-all focus-within:ring-1 focus-within:ring-indigo-100">
                <div className="w-full space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">{t("Select Staff Members")}</label>
                    <Popover open={isStaffPopoverOpen} onOpenChange={setIsStaffPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          role="combobox" 
                          aria-expanded={isStaffPopoverOpen}
                          className="w-full justify-between bg-slate-50 hover:bg-white border-slate-200 h-11 px-4 transition-all"
                          disabled={isLoading || eligibleStaff.length === 0}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                            {selectedStaffIds.length > 0 ? (
                              <span className="font-bold text-indigo-700">{selectedStaffIds.length} {t("staff selected")}</span>
                            ) : (
                              <span className="text-slate-400">{t("Select available staff...")}</span>
                            )}
                          </div>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command className="w-full">
                          <CommandInput placeholder={t("Search staff members...")} className="h-10" />
                          <CommandList className="max-h-64">
                            <CommandEmpty>{t("No staff found.")}</CommandEmpty>
                            <CommandGroup className="p-0">
                              {eligibleStaff.map((staff) => {
                                const isChecked = selectedStaffIds.includes(staff.userId);
                                return (
                                  <CommandItem
                                    key={staff.userId}
                                    value={staff.fullName}
                                    onSelect={() => handleSelectStaff(staff.userId, !isChecked)}
                                    className="group flex items-center gap-3 cursor-pointer py-3.5 px-4 data-[selected=true]:bg-indigo-600 data-[selected=true]:text-white rounded-none w-full"
                                  >
                                    <div className={cn(
                                      "flex h-4 w-4 items-center justify-center rounded-sm border transition-colors",
                                      isChecked 
                                        ? "bg-indigo-600 border-indigo-600 text-white group-data-[selected=true]:bg-white group-data-[selected=true]:border-white group-data-[selected=true]:text-indigo-600" 
                                        : "border-slate-300 text-transparent group-data-[selected=true]:border-white"
                                    )}>
                                      <Check className="h-3 w-3 text-current" style={{ strokeWidth: 4 }} />
                                    </div>
                                    <div className="flex flex-col flex-1 truncate">
                                      <span className={cn(
                                        "truncate transition-colors font-bold", 
                                        isChecked ? "text-indigo-700 group-data-[selected=true]:text-white" : "text-slate-700 group-data-[selected=true]:text-white"
                                      )}>
                                        {staff.fullName}
                                      </span>
                                      <span className="text-[10px] opacity-70 truncate">{staff.email}</span>
                                    </div>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                </div>
                <Button 
                  onClick={handleAddStaff} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px] h-11 font-bold shadow-md transition-all active:scale-[0.98]" 
                  disabled={isSaving || selectedStaffIds.length === 0}
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} {t("Add Members")}
                </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                    {t("Assigned Members")}
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 font-bold">{assignedTeam.length}</Badge>
                </h3>
                
                <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 shadow-sm overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2"><Loader2 className="animate-spin w-5 h-5"/> {t("Loading team...")}</div>
                    ) : assignedTeam.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">{t("No team members assigned yet.")}</div>
                    ) : (
                        assignedTeam.map((member) => (
                            <div key={member.userId} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shadow-inner">{member.fullName.charAt(0)}</div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{member.fullName}</p>
                                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {t("Assigned:")} {new Date(member.assignedAt).toLocaleDateString("vi-VN")}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full" onClick={() => handleRemoveStaff(member.userId)} disabled={isSaving}><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-white border-t border-slate-100 p-4 px-6 flex justify-end">
               <Button onClick={() => router.push("/manager/audit")} className="min-w-[120px] shadow-sm">{t("Done")}</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
    </div>
  );
}