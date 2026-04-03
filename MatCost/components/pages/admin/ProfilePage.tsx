"use client";
import { useState } from "react";
import { useAuth } from "./AuthContext";
import { User, Mail, Phone, Building, Shield, Save, Camera } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    department: user?.department || "",
  });

  const save = () => {
    updateProfile(form);
    setEditing(false);
    toast.success("Cập nhật hồ sơ thành công");
  };

  if (!user) return null;

  const fields = [
    { icon: User, label: "Họ và tên", key: "name" as const, value: user.name },
    { icon: Mail, label: "Email", key: "email" as const, value: user.email },
    { icon: Phone, label: "Điện thoại", key: "phone" as const, value: user.phone },
    { icon: Building, label: "Phòng ban", key: "department" as const, value: user.department },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl text-gray-900">Hồ sơ cá nhân</h1>
        <p className="text-gray-500 mt-1">Xem và cập nhật thông tin cá nhân</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="h-32 bg-gradient-to-r from-blue-500 to-blue-600 relative">
          <div className="absolute -bottom-12 left-6">
            <div className="w-24 h-24 rounded-2xl bg-white shadow-lg flex items-center justify-center border-4 border-white">
              <span className="text-3xl text-blue-600">{user.name.charAt(0)}</span>
            </div>
          </div>
        </div>

        <div className="pt-16 px-6 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-gray-900">{user.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Shield className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-600">{user.role}</span>
              </div>
            </div>
            {!editing ? (
              <button onClick={() => { setForm({ name: user.name, email: user.email, phone: user.phone, department: user.department }); setEditing(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                Chỉnh sửa
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={save} className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  <Save className="w-4 h-4" /> Lưu
                </button>
                <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">Hủy</button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {fields.map((f) => (
              <div key={f.key} className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">{f.label}</p>
                  {editing ? (
                    <input
                      value={form[f.key]}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 mt-0.5">{f.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="mb-4">Thông tin tài khoản</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="py-2"><span className="text-gray-400">Mã người dùng</span><p className="text-gray-900 mt-1">{user.id}</p></div>
          <div className="py-2"><span className="text-gray-400">Vai trò</span><p className="text-gray-900 mt-1">{user.role}</p></div>
          <div className="py-2"><span className="text-gray-400">Trạng thái</span><p className="text-emerald-600 mt-1">Hoạt động</p></div>
          <div className="py-2"><span className="text-gray-400">Đăng nhập lần cuối</span><p className="text-gray-900 mt-1">20/03/2026</p></div>
        </div>
      </div>
    </div>
  );
}