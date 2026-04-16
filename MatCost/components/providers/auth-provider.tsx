"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/services/auth-service";
import { setAccessToken } from "@/lib/axios-client";
import { jwtDecode } from "jwt-decode";
import { FullPageSpinner } from "@/components/ui/custom/full-page-spinner";
import { userApi } from "@/services/user-service";

interface JwtRawPayload {
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": string;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier": string;
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": string;
  Status: string;
  exp: number;
  iss: string;
  aud: string;
}

export interface UserPayload {
  id: number;
  email: string;
  role: string;
  status: boolean;
  fullName?: string;
}

interface AuthContextType {
  user: UserPayload | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<UserPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await authApi.getMe();
        const token = res.data.accessToken;

        setAccessToken(token);
        if (typeof window !== "undefined") {
          (window as any).jwt = token;
        }

        if (token) {
          const decoded = jwtDecode<JwtRawPayload>(token);

          const cleanUser: UserPayload = {
            id: Number(
              decoded[
                "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
              ],
            ),
            email:
              decoded[
                "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
              ],
            role: decoded[
              "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
            ],
            status: decoded.Status === "True",
          };

          setUser(cleanUser);
        }
      } catch (error) {
        console.error("Auth failed", error);
        setAccessToken(null);
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [router]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id && !user.fullName) {
        try {
          const res = await userApi.getById(user.id);

          setUser((prev) => {
            if (!prev) return null;
            return { ...prev, fullName: res.data.fullName };
          });
        } catch (error) {
          console.error("Failed to fetch user profile", error);
        }
      }
    };

    fetchUserProfile();
  }, [user?.id, user?.fullName]);

  if (isLoading) {
    return <FullPageSpinner />;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}
