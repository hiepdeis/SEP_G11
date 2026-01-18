"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setAccessToken } from "@/lib/axios-client"; // Import đúng đường dẫn file axios của bạn
import { authApi } from "@/services/auth-service";

export default function LoginSuccess() {
  const router = useRouter();
  const [status, setStatus] = useState("Đang xác thực...");

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Gọi API /Auth/me bằng axiosClient. 
        // Cookie HttpOnly sẽ tự động được gửi kèm request này.
        const res = await authApi.getMe();

        const { accessToken } = res.data;

        if (!accessToken) throw new Error("Không nhận được access token");

        // 1. Lưu token vào Memory (Biến trong axios-client)
        setAccessToken(accessToken);

        // 2. (Optional) Nếu bạn có AuthContext, hãy gọi setUser hoặc setToken của Context tại đây
        // const { setAuth } = useAuth(); 
        // setAuth(accessToken);

        setStatus("Đăng nhập thành công! Đang chuyển hướng...");
        
        // 3. Chuyển hướng vào Dashboard
        router.replace("/dashboard");

      } catch (error) {
        console.error("Lỗi xác thực:", error);
        setStatus("Đăng nhập thất bại. Vui lòng thử lại.");
        setTimeout(() => {
          router.replace("/");
        }, 2000);
      }
    };

    initializeAuth();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center flex-col gap-4">
      {/* Bạn có thể thay bằng Loading Spinner đẹp hơn */}
      <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-600 font-medium">{status}</p>
    </div>
  );
}