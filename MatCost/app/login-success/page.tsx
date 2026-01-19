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

        const { accessToken } = res.data;

        if (!accessToken) throw new Error("Không nhận được access token");

        // 1. Lưu token vào Memory (Biến trong axios-client)
        setAccessToken(accessToken);

        // 2. (Optional) Nếu bạn có AuthContext, hãy gọi setUser hoặc setToken của Context tại đây
        // const { setAuth } = useAuth();
        // setAuth(accessToken);

        setStatus("Login success! Redirecting...");

        // 3. Chuyển hướng vào Dashboard
        router.replace("/dashboard");
      } catch (error) {
        console.error("Error", error);
        setStatus("Login failed. Try again later.");
        setTimeout(() => {
          router.replace("/");
        }, 2000);
      }
    };

    initializeAuth();
  }, [router]);

  return <FullPageSpinner text={status} />;
}