"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setAccessToken } from "@/lib/axios-client"; // Import đúng đường dẫn file axios của bạn
import { authApi } from "@/services/auth-service";
import { FullPageSpinner } from "@/components/ui/custom/full-page-spinner";

export default function LoginSuccess() {
  const router = useRouter();
  const [status, setStatus] = useState("Checking");

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Gọi API /Auth/me bằng axiosClient.
        // Cookie HttpOnly sẽ tự động được gửi kèm request này.
        const res = await authApi.getMe();

        const  accessToken  = res.data.accessToken;
        console.log("Received access token:", accessToken);
        if (!accessToken) throw new Error("Không nhận được access token");

        // 1. Lưu token vào Memory (Biến trong axios-client)
        setAccessToken(accessToken);
        sessionStorage.setItem("role", res.data.roleName);
        // 2. (Optional) Nếu bạn có AuthContext, hãy gọi setUser hoặc setToken của Context tại đây
        // const { setAuth } = useAuth();
        // setAuth(accessToken);

        setStatus("Login success! Redirecting...");

        // 3. Chuyển hướng vào Dashboard
        router.replace("/dashboard");
      } catch (error: any) {
        console.error("Error", error);
        // Lấy message lỗi từ Backend
        let msg = "Login failed. Please try again.";
        
        if (error.response) {
            // Backend trả về lỗi 403 (Forbid) kèm message
            if (error.response.data) msg = error.response.data;
            if (error.response.status === 403) msg = "Your account has been deactivated.";
        } else if (error.request) {
            msg = "Network error. Cannot connect to server.";
        }

        router.replace(`/login-error?message=${encodeURIComponent(msg)}`);
      }
    };

    initializeAuth();
  }, [router]);

  return <FullPageSpinner text={status} />;
}