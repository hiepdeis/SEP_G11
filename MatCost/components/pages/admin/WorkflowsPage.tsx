"use client";
import { useState } from "react";
import { GitBranch, Plus, Edit2, Trash2, X, Check, Clock, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface WorkflowStep { role: string; action: string; }
interface Workflow {
  id: string;
  name: string;
  description: string;
  status: "active" | "draft";
  steps: WorkflowStep[];
  triggerEvent: string;
}

const initialWorkflows: Workflow[] = [
  {
    id: "1", name: "Phê duyệt đơn đặt hàng", description: "Quy trình duyệt đơn mua hàng mới",
    status: "active", triggerEvent: "Tạo đơn mua hàng",
    steps: [
      { role: "Nhân viên", action: "Nộp đơn mua hàng" },
      { role: "Trưởng phòng", action: "Xem xét & phê duyệt" },
      { role: "Kế toán", action: "Kiểm tra ngân sách" },
      { role: "Giám đốc", action: "Phê duyệt cuối cùng" },
    ],
  },
  {
    id: "2", name: "Chuyển kho vật tư", description: "Phê duyệt yêu cầu chuyển vật tư giữa các kho",
    status: "active", triggerEvent: "Yêu cầu chuyển kho",
    steps: [
      { role: "Nhân viên kho", action: "Yêu cầu chuyển hàng" },
      { role: "Quản lý kho xuất", action: "Phê duyệt xuất kho" },
      { role: "Quản lý kho nhận", action: "Xác nhận nhập kho" },
    ],
  },
  {
    id: "3", name: "Tiếp nhận nhân viên mới", description: "Tạo tài khoản và phân quyền người dùng mới",
    status: "draft", triggerEvent: "Đăng ký người dùng",
    steps: [
      { role: "HR", action: "Gửi yêu cầu" },
      { role: "IT Admin", action: "Tạo tài khoản" },
      { role: "Trưởng phòng", action: "Phân quyền" },
    ],
  },
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", triggerEvent: "", steps: [{ role: "", action: "" }] as WorkflowStep[] });

  const openAdd = () => {
    setForm({ name: "", description: "", triggerEvent: "", steps: [{ role: "", action: "" }] });
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (w: Workflow) => {
    setForm({ name: w.name, description: w.description, triggerEvent: w.triggerEvent, steps: [...w.steps] });
    setEditId(w.id);
    setShowModal(true);
  };

  const save = () => {
    if (!form.name) return;
    const steps = form.steps.filter((s) => s.role && s.action);
    if (editId) {
      setWorkflows((prev) => prev.map((w) => w.id === editId ? { ...w, ...form, steps } : w));
      toast.success("Cập nhật quy trình thành công");
    } else {
      setWorkflows((prev) => [...prev, { ...form, steps, id: Date.now().toString(), status: "draft" }]);
      toast.success("Tạo quy trình thành công");
    }
    setShowModal(false);
  };

  const deleteWorkflow = (id: string) => {
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
    toast.success("Xóa quy trình thành công");
  };

  const toggleStatus = (id: string) => {
    setWorkflows((prev) => prev.map((w) => w.id === id ? { ...w, status: w.status === "active" ? "draft" : "active" } : w));
    toast.success("Cập nhật trạng thái thành công");
  };

  const addStep = () => setForm({ ...form, steps: [...form.steps, { role: "", action: "" }] });
  const removeStep = (i: number) => setForm({ ...form, steps: form.steps.filter((_, idx) => idx !== i) });
  const updateStep = (i: number, field: "role" | "action", value: string) => {
    const steps = [...form.steps];
    steps[i] = { ...steps[i], [field]: value };
    setForm({ ...form, steps });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-gray-900">Quy trình phê duyệt</h1>
          <p className="text-gray-500 mt-1">Cấu hình các quy trình phê duyệt trong hệ thống</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Tạo quy trình
        </button>
      </div>

      <div className="space-y-4">
        {workflows.map((w) => (
          <div key={w.id} className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${w.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-gray-900">{w.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${w.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{w.status === "active" ? "Hoạt động" : "Nháp"}</span>
                  </div>
                  <p className="text-sm text-gray-500">{w.description}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => toggleStatus(w.id)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Toggle status">
                  {w.status === "active" ? <Clock className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(w)} className="p-2 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => deleteWorkflow(w.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="px-5 pb-4">
              <p className="text-xs text-gray-400 mb-3">Sự kiện kích hoạt: {w.triggerEvent}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {w.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="px-3 py-1.5 bg-blue-50 rounded-lg text-sm">
                      <span className="text-blue-600">{step.role}</span>
                      <span className="text-gray-400 mx-1">-</span>
                      <span className="text-gray-600">{step.action}</span>
                    </div>
                    {i < w.steps.length - 1 && <ArrowRight className="w-4 h-4 text-gray-300" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3>{editId ? "Chỉnh sửa quy trình" : "Tạo quy trình mới"}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên quy trình" className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none" />
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả" className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none" />
              <input value={form.triggerEvent} onChange={(e) => setForm({ ...form, triggerEvent: e.target.value })} placeholder="Sự kiện kích hoạt" className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-600">Các bước</label>
                  <button onClick={addStep} className="text-sm text-blue-600 hover:text-blue-700">+ Thêm bước</button>
                </div>
                <div className="space-y-2">
                  {form.steps.map((step, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                      <input value={step.role} onChange={(e) => updateStep(i, "role", e.target.value)} placeholder="Vai trò" className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 outline-none text-sm" />
                      <input value={step.action} onChange={(e) => updateStep(i, "action", e.target.value)} placeholder="Hành động" className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 outline-none text-sm" />
                      {form.steps.length > 1 && <button onClick={() => removeStep(i)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={save} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editId ? "Cập nhật" : "Tạo mới"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}