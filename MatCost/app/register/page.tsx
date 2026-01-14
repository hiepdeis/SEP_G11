"use client"

import { useState } from "react"
import Link from "next/link"
import { GoogleSignInButton } from "@/components/google-sign-in-button"

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  })
  const [error, setError] = useState("")

  // Constants for validation
  const MIN_PASSWORD_LENGTH = 8
  const MAX_PASSWORD_LENGTH = 64
  const MIN_NAME_LENGTH = 2
  const MAX_NAME_LENGTH = 50
  const MAX_EMAIL_LENGTH = 50
  
  // Regex for basic email format
  const EMAIL_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error immediately when user types to improve UX
    if (error) setError("")
  }

  const validateForm = () => {
    const { name, email, password, confirmPassword } = formData

    // 1. Check for empty fields
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      return "All fields are required."
    }

    // 2. Name Validation
    if (name.trim().length < MIN_NAME_LENGTH) {
      return `Full Name must be at least ${MIN_NAME_LENGTH} characters.`
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      return `Full Name cannot exceed ${MAX_NAME_LENGTH} characters.`
    }

    // 3. Email Validation
    if (!EMAIL_REGEX.test(email)) {
      return "Please enter a valid email address."
    }

    // 4. Password Length
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      return "Password is too long."
    }

    // 5. Password Complexity (Optional but recommended)
    // Checks for at least one number
    if (!/\d/.test(password)) {
       return "Password must contain at least one number."
    }

    // 6. Confirm Password Match
    if (password !== confirmPassword) {
      return "Passwords do not match."
    }

    return null // No errors
  }

  const handleGoogleSignUp = async () => {
    setIsLoading(true)
    // TODO: Implement Google OAuth logic
    setTimeout(() => {
      window.location.href = "/dashboard"
    }, 1500)
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    // Run Validation
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return // Stop execution if validation fails
    }

    setIsLoading(true)

    // TODO: Implement Registration Logic
    try {
      setTimeout(() => {
        console.log("Registering user:", formData)
        window.location.href = "/dashboard"
      }, 1500)
    } catch (err) {
      setError("Registration failed. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-gray-100 flex items-center justify-center p-4 sm:p-8">
      
      {/* Centered Card */}
      <div className="w-full max-w-lg">
        {/* Logo / Branding Centered above card */}
        <div className="bg-white rounded-xl shadow-2xl p-8 sm:p-10 border border-slate-200">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h2>
            <p className="text-slate-600">Join the enterprise warehouse management system</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2 justify-center animate-in fade-in slide-in-from-top-2 duration-300">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleEmailSignUp} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="John Doe"
                maxLength={MAX_NAME_LENGTH}
                disabled={isLoading}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="name@company.com"
                maxLength={MAX_EMAIL_LENGTH}
                disabled={isLoading}
              />
            </div>

            {/* Password & Confirm Password Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="Min 8 chars"
                  maxLength={MAX_PASSWORD_LENGTH}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                <input 
                  type="password" 
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="Repeat password"
                  maxLength={MAX_PASSWORD_LENGTH}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : "Create Account"}
              </button>
            </div>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Or register with</span>
            </div>
          </div>

          <GoogleSignInButton isLoading={isLoading} onClick={handleGoogleSignUp} />

          {/* Footer */}
          <p className="text-sm text-slate-500 text-center mt-8">
            Already have an account?{" "}
            <Link href="/" className="text-orange-600 hover:underline font-bold">
              Sign in
            </Link>
          </p>
        </div>

        <div className="mt-8 text-center">
           <p className="text-xs text-slate-400">
             By clicking "Create Account", you agree to our <a href="#" className="hover:text-slate-600 underline">Terms of Service</a> and <a href="#" className="hover:text-slate-600 underline">Privacy Policy</a>.
           </p>
        </div>
      </div>
    </div>
  )
}