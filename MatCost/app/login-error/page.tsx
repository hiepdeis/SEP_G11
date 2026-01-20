"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function LoginErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const message = searchParams.get("message") || "An unknown error occurred during login.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-red-100">
        <CardHeader className="flex flex-col items-center space-y-2 pb-2">
          <div className="p-3 bg-red-100 rounded-full">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-xl font-bold text-red-600">
            Login Failed
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center pt-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 font-medium break-words">
            {message}
          </div>
        </CardContent>

        <CardFooter className="justify-center pb-6">
          <Button 
            onClick={() => router.push("/login")} 
            className="w-full sm:w-auto gap-2 bg-slate-900 hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginErrorPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-10">Loading...</div>}>
      <LoginErrorContent />
    </Suspense>
  );
}