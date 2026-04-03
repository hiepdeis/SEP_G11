"use client";

import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { 
  Briefcase, TrendingUp, TrendingDown, 
  AlertTriangle, CheckCircle, PieChart,
  Bell, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress"; // Giả định có component UI này hoặc dùng HTML input range readonly
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { projectApi, ProjectDto } from "@/services/project-services";



export default function ProjectBudgetPage() {
  const formatMoney = (val: number) => 
     (val / 1000000000).toFixed(2) + "B VND";

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProject, setNewProject] = useState({
    code: "",
    name: "",
    startDate: "",
    endDate: "",
    budget: 0,
    status: "",
  });
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const data = await projectApi.getProjects();
        setProjects(data);
      } catch (err) {
        console.error("Failed to fetch projects");
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();

    
  }, []);

  const handleCreateProject = async () => {
    setCreatingProject(true);
    try {
      await projectApi.createProject({
        ...newProject,
        budget: Number(newProject.budget),
      });
      setShowCreateProject(false);
      setNewProject({
        code: "",
        name: "",
        startDate: "",
        endDate: "",
        budget: 0,
        status: "",
      });
      // Reload lại danh sách dự án
      setLoadingProjects(true);
      const data = await projectApi.getProjects();
      setProjects(data);
    } catch (err) {
      alert("Tạo dự án thất bại!");
    } finally {
      setCreatingProject(false);
    }
  };
  const activeProjects = projects.filter(p => p.status === "Active");

   // Tổng budget
   const totalBudget = activeProjects.reduce(
   (sum, p) => sum + (p.budget || 0),
   0
   );

   // Số lượng active
   const activeCount = activeProjects.length;
  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
           <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Project & Budget</h2>
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

        <div className="flex-grow overflow-y-auto p-6 lg:p-10 space-y-8">
           
           <div className="flex items-center justify-between">
              <div>
                 <h1 className="text-2xl font-bold tracking-tight text-slate-900">Budget Monitor</h1>
                 <p className="text-sm text-slate-500">Real-time tracking of material costs vs. project budget.</p>
              </div>
           </div>

           {/* Summary Cards */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-indigo-600 text-white border-none shadow-lg">
                 <CardContent className="p-6">
                    <p className="text-indigo-100 text-sm font-medium mb-1">Total Active Budget</p>
                    <h3 className="text-3xl font-bold">
                     {formatMoney(totalBudget)}
                     </h3>
                    <div className="mt-4 flex items-center gap-2 text-xs bg-white/10 w-fit px-2 py-1 rounded">
                       <PieChart className="w-3 h-3" /> {activeCount} Active Projects </div>
                 </CardContent>
              </Card>
              <Card>
                 <CardContent className="p-6">
                    <p className="text-slate-500 text-sm font-medium mb-1">Total Spent</p>
                    <h3 className="text-3xl font-bold text-slate-900">5.55B VND</h3>
                    <div className="mt-4 flex items-center gap-2 text-xs text-green-600 bg-green-50 w-fit px-2 py-1 rounded">
                       <TrendingDown className="w-3 h-3" /> 65.2% Utilization
                    </div>
                 </CardContent>
              </Card>
              <Card>
                 <CardContent className="p-6">
                    <p className="text-slate-500 text-sm font-medium mb-1">Remaining</p>
                    <h3 className="text-3xl font-bold text-slate-900">2.95B VND</h3>
                    <div className="mt-4 flex items-center gap-2 text-xs text-orange-600 bg-orange-50 w-fit px-2 py-1 rounded">
                       <AlertTriangle className="w-3 h-3" /> 1 Project at Risk
                    </div>
                 </CardContent>
              </Card>
           </div>

           {/* Detailed Project List */}
           <h3 className="text-lg font-semibold text-slate-900 mt-4">Project Breakdown</h3>
           <div className="space-y-4">
              {projects.map((prj, idx) => {
                 const percent = Math.round((prj.spent / prj.budget) * 100);
                 const statusColor = 
                    percent > 90 ? "bg-red-500" : 
                    percent > 70 ? "bg-orange-500" : "bg-green-500";
                 
                 const textColor = 
                    percent > 90 ? "text-red-600" : 
                    percent > 70 ? "text-orange-600" : "text-green-600";

                 return (
                    <motion.div 
                       key={prj.id}
                       initial={{ opacity: 0, x: -10 }}
                       animate={{ opacity: 1, x: 0 }}
                       transition={{ delay: idx * 0.1 }}
                    >
                       <Card className="border-slate-200">
                          <CardContent className="p-6">
                             <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                                <div className="flex items-start gap-4">
                                   <div className="p-3 bg-slate-100 rounded-lg">
                                      <Briefcase className="w-6 h-6 text-slate-600" />
                                   </div>
                                   <div>
                                      <h4 className="font-bold text-lg text-slate-900">{prj.name}</h4>
                                      <p className="text-sm text-slate-500">Manager: {prj.manager}</p>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className={`font-bold text-lg ${textColor}`}>{percent}% Used</p>
                                   <p className="text-xs text-slate-400">
                                      {formatMoney(prj.spent)} / {formatMoney(prj.budget)}
                                   </p>
                                </div>
                             </div>
                             
                             {/* Progress Bar Manual Implementation */}
                             <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden relative">
                                <motion.div 
                                   className={`h-full absolute left-0 top-0 rounded-full ${statusColor}`}
                                   initial={{ width: 0 }}
                                   animate={{ width: `${percent}%` }}
                                   transition={{ duration: 1, delay: 0.2 }}
                                />
                             </div>

                             {percent > 90 && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
                                   <AlertTriangle className="w-4 h-4" />
                                   <strong>Warning:</strong> Project budget is critical. Immediate review required by Accountant.
                                </div>
                             )}
                          </CardContent>
                       </Card>
                    </motion.div>
                 );
              })}
           </div>

        </div>

        {/* Nút Thêm dự án */}
        <div className="flex justify-end mb-4">
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            onClick={() => setShowCreateProject(true)}
          >
            + Thêm dự án
          </button>
        </div>

        {/* Modal tạo dự án */}
        {showCreateProject && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 min-w-[350px] w-full max-w-md">
              <h2 className="text-lg font-bold mb-4">Tạo dự án mới</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Mã dự án"
                  value={newProject.code}
                  onChange={e => setNewProject(p => ({ ...p, code: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Tên dự án"
                  value={newProject.name}
                  onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newProject.startDate}
                    onChange={e => setNewProject(p => ({ ...p, startDate: e.target.value }))}
                    className="w-1/2 border rounded px-3 py-2"
                  />
                  <input
                    type="date"
                    value={newProject.endDate}
                    onChange={e => setNewProject(p => ({ ...p, endDate: e.target.value }))}
                    className="w-1/2 border rounded px-3 py-2"
                  />
                </div>
                <input
                  type="number"
                  placeholder="Ngân sách (VND)"
                  value={newProject.budget}
                  onChange={e => setNewProject(p => ({ ...p, budget: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Trạng thái"
                  value={newProject.status}
                  onChange={e => setNewProject(p => ({ ...p, status: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button
                  className="px-4 py-2 rounded bg-gray-200"
                  onClick={() => setShowCreateProject(false)}
                  disabled={creatingProject}
                >
                  Hủy
                </button>
                <button
                  className="px-4 py-2 rounded bg-indigo-600 text-white"
                  onClick={handleCreateProject}
                  disabled={creatingProject}
                >
                  {creatingProject ? "Đang tạo..." : "Tạo dự án"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}