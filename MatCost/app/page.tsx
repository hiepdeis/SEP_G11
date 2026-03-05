"use client";

import { useEffect, useState } from "react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { ConstructionIllustration } from "@/components/construction-illustration";
import { authApi } from "@/services/auth-service"; 
import { setAccessToken } from "@/lib/axios-client";
import { useRouter } from "next/navigation";
import { FullPageSpinner } from "@/components/ui/custom/full-page-spinner";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    const res = authApi.loginGoogle();
    console.log(res);
  };

  useEffect(() => {
    const checkAlreadyLoggedIn = async () => {
      try {
        // 1. Thử gọi API /Auth/me
        // Nhờ cookie HttpOnly, nếu user chưa đăng xuất, request này sẽ thành công (200)
        const res = await authApi.getMe();
        console.log("Already logged in:", res.data);
        // 2. Nếu thành công -> User đã login rồi -> Set token lại
        setAccessToken(res.data.accessToken);
        sessionStorage.setItem("role", res.data.roleName);
        // 3. Đá thẳng vào Dashboard
        router.push("/dashboard");
      } catch (error) {
        // 4. Nếu lỗi (401) -> Nghĩa là chưa login -> Cho phép hiện form Login
        setIsChecking(false);
      }
    };

    checkAlreadyLoggedIn();
  }, [router]);

  if (isChecking) {
    return (
      <FullPageSpinner />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-gray-100 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-800 to-slate-900 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-orange-600 rounded flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
                <polyline points="13 2 13 9 20 9"></polyline>
                <line x1="9" y1="11" x2="15" y2="11"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">
              CWM
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Construction Warehouse Management
          </h1>
          <p className="text-slate-300 text-lg">
            Material import, export and inventory control
          </p>
        </div>

        {/* Industrial Illustration */}
        <div className="mt-12">
          <ConstructionIllustration />
        </div>
      </div>

      {/* Right Section - Login Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl p-8 sm:p-10 border border-slate-200">
            {/* Mobile Branding */}
            <div className="lg:hidden mb-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
                    <polyline points="13 2 13 9 20 9"></polyline>
                    <line x1="9" y1="11" x2="15" y2="11"></line>
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                  </svg>
                </div>
                <span className="text-slate-800 font-bold">CWM</span>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Access System
            </h2>
            <p className="text-slate-600 mb-8">
              Sign in to your construction materials warehouse
            </p>

            {/* Google Sign In Button */}
            <GoogleSignInButton
              isLoading={isLoading}
              onClick={handleGoogleSignIn}
            />

            {/* Divider */}
            {/* <div className="my-8 flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="text-xs text-slate-500 uppercase tracking-wide">
                Or continue with email
              </span>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            <button className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors duration-200">
              Sign in with Email
            </button> */}

            {/* Footer */}
            <p className="text-xs text-slate-500 text-center mt-6">
              Need access?{" "}
              <a
                href="#"
                className="text-orange-600 hover:underline font-semibold"
              >
                Request credentials
              </a>
            </p>

            {/* Security badge */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-xs text-slate-500 text-center">
                🔒 Enterprise-grade security | Secure authentication
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
