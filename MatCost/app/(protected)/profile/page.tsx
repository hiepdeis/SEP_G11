"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserDropdown } from "@/components/user-dropdown";
import { useRouter } from "next/navigation";
import { userApi, UserDto } from "@/services/user-service";
import {
  Bell,
  User,
  Briefcase,
  Camera,
  Save,
  Shield,
  Key,
  History,
  MapPin,
  Mail,
  Phone,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { LabelCharCount } from "@/components/ui/custom/label-charcount";
import { Card } from "@/components/ui/custom/card-wrapper";
import { FullPageSpinner } from "@/components/ui/custom/full-page-spinner";

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<UserDto | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [originalUser, setOriginalUser] = useState<UserDto | null>(null);

  // GIẢ ĐỊNH: ID của user đang đăng nhập là 1.
  // Thực tế bạn sẽ lấy ID này từ Context, LocalStorage hoặc Decode Token.
  const CURRENT_USER_ID = 1;

  const LIMITS = {
    fullName: 50,
    phoneNumber: 11,
    bio: 200,
    address: 200,
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await userApi.getById(CURRENT_USER_ID);
        setUser(res.data);
        setOriginalUser(res.data);
      } catch (error) {
        console.error("Failed to load profile", error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchProfile();
  }, []);

  const validateField = (field: string, value: string) => {
    let error = "";

    switch (field) {
      case "fullName":
        if (!value.trim()) error = "Full name is required.";
        else if (value.length > LIMITS.fullName) error = "Name is too long.";
        break;

      case "phoneNumber":
        const phoneRegex = /^[0-9]*$/;
        if (value && !phoneRegex.test(value))
          error = "Phone number must contain only digits.";
        else if (
          value &&
          (value.length < 10 || value.length > LIMITS.phoneNumber)
        )
          error = "Phone number must be 10-11 digits.";
        else if (!value.trim()) error = "Phone number is required.";
        break;

      case "bio":
        if (value.length > LIMITS.bio) error = "Bio is too long.";
        break;

      case "address":
        if (value.length > LIMITS.address) error = "Address is too long.";
        break;
    }

    setErrors((prev) => ({ ...prev, [field]: error }));
    return error === "";
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      await userApi.update(user.id, user);
      await new Promise((resolve) => setTimeout(resolve, 500));

      setOriginalUser(user);

      toast.success("Update success!");
    } catch (error) {
      console.error("Update failed", error);
      toast.error("Update failed!");
      alert("");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (originalUser) {
      setUser({ ...originalUser });
      setErrors({});
      setFocusedField(null);
    }
  };

  const hasChanges =
    user &&
    originalUser &&
    (user.fullName !== originalUser.fullName ||
      (user.phoneNumber || "") !== (originalUser.phoneNumber || "") ||
      (user.bio || "") !== (originalUser.bio || "") ||
      (user.address || "") !== (originalUser.address || ""));

  const hasErrors = Object.values(errors).some((error) => error.length > 0);

  if (loadingData) {
    return <FullPageSpinner />;
  }

  if (!user)
    return <div className="p-10 text-center">Failed to load user data.</div>;

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />

      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="bg-white px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="hidden md:block">
              <h2 className="text-lg font-semibold text-slate-900">
                My Profile
              </h2>
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>

              <UserDropdown
                align="end"
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  >
                    <User className="h-5 w-5" />
                  </Button>
                }
              />
            </div>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto">
          <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto w-full">
            {/* Page Title & Actions */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">
                  Account Settings
                </h1>
                <p className="text-slate-500 text-lg">
                  Manage your personal information and preferences
                </p>
              </div>
              <div className="flex gap-3">
                {hasChanges && (
                  <Button
                    variant="outline"
                    className="text-slate-600 border-slate-300 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all duration-300 animate-in fade-in slide-in-from-right-4"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 min-w-[140px]"
                  disabled={isSaving || !hasChanges || hasErrors}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* LEFT COLUMN - Avatar & Key Info */}
              <div className="lg:col-span-1 space-y-6">
                <Card interactive>
                  <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600 w-full relative rounded-md">
                    <div className="absolute top-4 right-4">
                      <button className="p-1.5 bg-white/20 hover:bg-white/30 rounded-md text-white backdrop-blur-sm transition-all">
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="relative -mt-12 mb-4 flex justify-center">
                    <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg relative group">
                      <div className="w-full h-full rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                        <User className="w-12 h-12 text-slate-400" />
                      </div>
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-2">
                    {/* Hiển thị tên từ API */}
                    <h3 className="text-xl text-center font-bold text-slate-900 break-all">
                      {user.fullName}
                    </h3>
                    {/* Role từ API (ví dụ: WORKER) */}
                    <p className="text-center text-slate-500 text-sm mb-4">
                      {user.roleName || "N/A"}
                    </p>

                    <div className="flex items-center justify-center gap-2 mb-6">
                      {user.status && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active Status
                        </span>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-4 text-left space-y-3">
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{user.phoneNumber || "No phone number"}</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Login History (Static for now) */}
                <Card interactive>
                  <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-600" />
                    Login History
                  </h3>
                  <div className="space-y-4">
                    {[
                      {
                        device: "Macbook Pro",
                        loc: "Ho Chi Minh, VN",
                        time: "Active now",
                        active: true,
                      },
                      {
                        device: "iPhone 14",
                        loc: "Ho Chi Minh, VN",
                        time: "2 hours ago",
                        active: false,
                      },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {item.device}
                          </p>
                          <p className="text-xs text-slate-500">{item.loc}</p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-xs font-medium ${item.active ? "text-green-600" : "text-slate-500"}`}
                          >
                            {item.time}
                          </p>
                          {item.active && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 ml-auto mt-1" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* RIGHT COLUMN - Edit Forms */}
              <div className="lg:col-span-2 space-y-6">
                {/* --- PERSONAL INFORMATION --- */}
                <Card interactive>
                  <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          Personal Information
                        </h3>
                        <p className="text-slate-500 text-sm">
                          Update your personal details here.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* --- FULL NAME --- */}
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <div className="flex justify-between">
                        <LabelCharCount
                          className={errors.fullName ? "text-red-500" : ""}
                          currentLength={
                            focusedField === "fullName"
                              ? user.fullName?.length || 0
                              : undefined
                          }
                          maxLength={LIMITS.fullName}
                        >
                          Full Name
                        </LabelCharCount>
                      </div>
                      <Input
                        value={user.fullName}
                        onChange={(e) => {
                          setUser({ ...user, fullName: e.target.value });
                          if (errors.fullName)
                            setErrors({ ...errors, fullName: "" });
                        }}
                        onFocus={() => setFocusedField("fullName")}
                        onBlur={() => {
                          setFocusedField(null);
                          validateField("fullName", user.fullName);
                        }}
                        placeholder="Enter your full name"
                        maxLength={LIMITS.fullName}
                        className={
                          errors.fullName
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }
                      />
                      {errors.fullName && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.fullName}
                        </p>
                      )}
                    </div>

                    {/* --- EMAIL --- */}
                    <div className="space-y-2">
                      <LabelCharCount>Email Address</LabelCharCount>
                      <Input
                        value={user.email}
                        disabled
                        className="bg-slate-50 text-slate-500 cursor-not-allowed"
                      />
                      <p className="text-xs text-slate-400">
                        Email cannot be changed.
                      </p>
                    </div>

                    {/* --- PHONE NUMBER --- */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <LabelCharCount
                          className={errors.phoneNumber ? "text-red-500" : ""}
                          currentLength={
                            focusedField === "phoneNumber"
                              ? user.phoneNumber?.length || 0
                              : undefined
                          }
                          maxLength={LIMITS.phoneNumber}
                        >
                          Phone Number
                        </LabelCharCount>
                      </div>
                      <Input
                        value={user.phoneNumber || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!/^[0-9]*$/.test(val)) return;

                          setUser({ ...user, phoneNumber: val });
                          if (errors.phoneNumber)
                            setErrors({ ...errors, phoneNumber: "" });
                        }}
                        onFocus={() => setFocusedField("phoneNumber")}
                        onBlur={() => {
                          setFocusedField(null);
                          validateField("phoneNumber", user.phoneNumber || "");
                        }}
                        placeholder="0987654321"
                        maxLength={LIMITS.phoneNumber}
                        className={
                          errors.phoneNumber
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }
                      />
                      {errors.phoneNumber && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.phoneNumber}
                        </p>
                      )}
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <div className="flex justify-between">
                        <LabelCharCount
                          className={errors.bio ? "text-red-500" : ""}
                          currentLength={
                            focusedField === "bio"
                              ? user.bio?.length || 0
                              : undefined
                          }
                          maxLength={LIMITS.bio}
                        >
                          Bio / Notes
                        </LabelCharCount>
                      </div>
                      <textarea
                        className={`flex min-h-[80px] w-full rounded-md border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 transition-all duration-200
                ${
                  errors.bio
                    ? "border-red-500 focus-visible:ring-red-500 placeholder:text-red-300"
                    : "border-slate-300 focus-visible:ring-indigo-600 placeholder:text-slate-500"
                }`}
                        placeholder="Write a short bio..."
                        value={(user as any).bio || ""}
                        onChange={(e) => {
                          setUser({ ...user, bio: e.target.value } as any);
                          if (errors.bio) setErrors({ ...errors, bio: "" });
                        }}
                        onFocus={() => setFocusedField("bio")}
                        onBlur={() => {
                          setFocusedField(null);
                          validateField("bio", (user as any).bio || "");
                        }}
                        maxLength={LIMITS.bio}
                      />
                      {errors.bio && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.bio}
                        </p>
                      )}
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <div className="flex justify-between">
                        <LabelCharCount
                          className={errors.address ? "text-red-500" : ""}
                          currentLength={
                            focusedField === "address"
                              ? user.address?.length || 0
                              : undefined
                          }
                          maxLength={LIMITS.address}
                        >
                          Personal Address
                        </LabelCharCount>
                      </div>
                      <Input
                        value={user.address || ""}
                        onChange={(e) => {
                          setUser({ ...user, address: e.target.value });
                          if (errors.address)
                            setErrors({ ...errors, address: "" });
                        }}
                        onFocus={() => setFocusedField("address")}
                        onBlur={() => {
                          setFocusedField(null);
                          validateField("address", user.address || "");
                        }}
                        placeholder="Enter your personal address"
                        maxLength={LIMITS.address}
                        className={
                          errors.address
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }
                      />
                      {errors.address && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.address}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Address & Work */}
                {/* <Card interactive>
                  <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          Job & Location
                        </h3>
                        <p className="text-slate-500 text-sm">
                          Details about your role and work location.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <LabelCharCount>Department</LabelCharCount>
                      <Input defaultValue="Logistics & Supply Chain" />
                    </div>
                    <div className="space-y-2">
                      <LabelCharCount>Job Title</LabelCharCount>
                      <Input defaultValue={user.roleName || "Employee"} />
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <LabelCharCount>Work Address</LabelCharCount>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          className="pl-9"
                          defaultValue="123 Construction Ave, District 1, HCMC"
                        />
                      </div>
                    </div>
                  </div>
                </Card> */}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
