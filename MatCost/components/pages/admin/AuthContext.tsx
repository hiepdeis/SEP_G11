"use client";
import { createContext, useContext, useState, ReactNode } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  phone: string;
  department: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>({
    id: "1",
    name: "Nguyen Van Admin",
    email: "admin@company.vn",
    role: "Super Admin",
    avatar: "",
    phone: "0901234567",
    department: "IT Department",
  });

  const login = (email: string, _password: string) => {
    setUser({
      id: "1",
      name: "Nguyen Van Admin",
      email,
      role: "Super Admin",
      avatar: "",
      phone: "0901234567",
      department: "IT Department",
    });
    return true;
  };

  const logout = () => setUser(null);

  const updateProfile = (data: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}