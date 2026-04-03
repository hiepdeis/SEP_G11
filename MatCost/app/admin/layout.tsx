// ─── CÀI VÀO: app/(admin)/layout.tsx ──────────────────────────────────────
// Route group (admin) không thêm segment vào URL,
// chỉ để gắn AdminLayout bao ngoài tất cả trang admin.
import AdminLayout from "@/components/pages/admin/AdminLayout";
import { AuthProvider } from "@/components/pages/admin/AuthContext";
import { NotificationsProvider } from "@/components/pages/admin/NotificationsContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <AdminLayout>{children}</AdminLayout>
      </NotificationsProvider>
    </AuthProvider>
  );
}