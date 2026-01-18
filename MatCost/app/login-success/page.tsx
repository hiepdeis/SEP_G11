// app/login-success/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginSuccess() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const completeLogin = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/Auth/me", {
          credentials: "include",
        });
        console.log("Login success response:", res);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const accessToken = data?.accessToken;
        if (!accessToken) throw new Error("No access token");

        // ⚠️ demo: KHÔNG lưu localStorage trong production
        sessionStorage.setItem("accessToken", accessToken);

        // ✅ redirect dashboard
        router.replace("/dashboard");
      } catch (e: any) {
        setError(e.message || "Login failed");
      }
    };

    completeLogin();
  }, [router]);

  return (
    <div>
      {error ? <p>Error: {error}</p> : <p>Completing login...</p>}
    </div>
  );
}
