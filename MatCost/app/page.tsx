"use client";

import { useState } from "react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { ConstructionIllustration } from "@/components/construction-illustration";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  // Email Regex for validation
  const EMAIL_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types to improve UX
    if (error) setError("");
  };

  // Validation Logic
  const validateForm = () => {
    // 1. Check for empty fields
    if (!formData.email.trim() || !formData.password) {
      return "Please fill in all fields.";
    }

    // 2. Check Email Format
    if (!EMAIL_REGEX.test(formData.email)) {
      return "Please enter a valid email address.";
    }

    // 3. Basic Password Length Check (Optional for login, but good for UX)
    // We don't check complexity here, just length, so we don't block legacy accounts
    if (formData.password.length < 8) {
      return "Password must be at least 8 characters.";
    }

    return null;
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    // TODO: Implement Google OAuth logic here
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1500);
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Run Validation
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return; // Stop execution if validation fails
    }

    setIsLoading(true);

    // TODO: Implement actual Auth logic here
    try {
      // Simulate API call
      setTimeout(() => {
        console.log("Logging in with:", formData);
        window.location.href = "/dashboard";
      }, 1500);
    } catch (err) {
      setError("Invalid credentials");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-gray-100 flex">
      {/* Left Section - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-800 to-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Abstract background pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-32 -mt-32"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Construction Warehouse Management
          </h1>
          <p className="text-slate-300 text-lg max-w-md">
            Streamline your material import, export, and inventory control with
            our enterprise solution.
          </p>
        </div>

        {/* Industrial Illustration */}
        <div className="mt-8 relative z-10 flex justify-center">
          <ConstructionIllustration />
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-2xl p-8 sm:p-10 border border-slate-200">
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
                  </svg>
                </div>
                <span className="text-slate-800 font-bold">CWM</span>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                Welcome Back
              </h2>
              <p className="text-slate-600">
                Please enter your details to access the warehouse.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {error}
              </div>
            )}

            {/* Email Form */}
            <form onSubmit={handleEmailSignIn} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  maxLength={64}
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="name@company.com"
                  disabled={isLoading}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <a
                    href="#"
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Forgot password?
                  </a>
                </div>
                <input
                  type="password"
                  name="password"
                  maxLength={64}
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  "Sign In to Account"
                )}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <GoogleSignInButton
              isLoading={isLoading}
              onClick={handleGoogleSignIn}
            />

            {/* Footer */}
            <p className="text-xs text-slate-500 text-center mt-8">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="text-orange-600 hover:underline font-bold"
              >
                Register
              </Link>
            </p>
          </div>

          <div className="mt-6 flex justify-center gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-slate-800">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-slate-800">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
