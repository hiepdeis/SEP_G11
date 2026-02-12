"use client";

import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import {
  ArrowLeft,
  Calendar,
  Warehouse,
  Save,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";

export default function CreateAuditPage() {
  const router = useRouter();
  const params = useParams();
  const role = params?.role as string;

  useEffect(() => {
    const allowedRoles = ["accountant", "admin"];
    if (!allowedRoles.includes(role)) {
      router.push(`/${role}/audit`); 
    }
  }, [role, router]);

  if (!["accountant", "admin"].includes(role)) return null;

  const handleSave = () => {
    // Logic gọi API tạo Audit Plan ở đây
    alert("Audit Plan created successfully!");
    router.push("/audit"); // Quay lại danh sách sau khi tạo xong
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
              <h2 className="text-lg font-semibold text-slate-900">
                Create New Audit Plan
              </h2>
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
          <Card className="w-full max-w-3xl shadow-lg border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle>Audit Configuration</CardTitle>
              <CardDescription>
                Define scope, location and timeline for the new audit.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Step 1: Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-indigo-600" /> 1. Scope & Location
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Audit Title</label>
                    <Input placeholder="e.g. Q1 2026 Opening Stock" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Target Warehouse
                    </label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wh1">Central Storage D1</SelectItem>
                        <SelectItem value="wh2">Site B Depot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Step 2: Timing */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" /> 2. Schedule
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Planned Start Date
                    </label>
                    <Input type="date" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Planned End Date
                    </label>
                    <Input type="date" />
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px]"
                >
                  <Save className="w-4 h-4 mr-2" /> Save & Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}