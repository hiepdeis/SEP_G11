"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/ui/custom/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ShieldCheck, QrCode, Plus, Loader2, CheckCircle2, ArrowLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { OTPInput } from "input-otp";

export default function TwoFactorAuthPage() {
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = () => {
    if (code.length < 6) {
      toast.error("Vui lòng nhập đủ 6 ký tự.");
      return;
    }
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      toast.success("Thiết lập xác minh 2 bước thành công!");
      router.push("/dashboard");
    }, 1500);
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-hidden relative z-10">
        <Header title="Bảo mật & Xác minh 2 lớp (2FA)" />

        <div className="flex-grow overflow-y-auto p-4 sm:p-6 lg:p-10 flex flex-col items-center justify-center">
          
          {/* BƯỚC 1: BẢO VỆ TÀI KHOẢN */}
          {step === 1 && (
            <Card className="w-full max-w-[500px] border-slate-200 shadow-sm gap-0">
              <CardHeader className="bg-white border-b border-slate-100 py-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-indigo-800">
                  <ShieldCheck className="w-5 h-5" /> Thiết lập Bảo vệ tài khoản
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 flex flex-col items-center text-center space-y-6 bg-white">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-inner">
                  <Lock className="w-8 h-8" />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Xác thực 2 lớp (2FA) giúp bảo vệ tài khoản MatCost của bạn khỏi những truy cập trái phép bằng cách yêu cầu mã xác nhận từ điện thoại khi đăng nhập.
                </p>
                <div className="text-left w-full text-sm text-slate-600 bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <p className="font-semibold mb-3 text-slate-800">Quy trình thiết lập:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Chuẩn bị ứng dụng <b>Google Authenticator</b> trên điện thoại.</li>
                    <li>Bấm nút <b>Bắt đầu thiết lập</b> ở dưới.</li>
                    <li>Quét mã QR và nhập mã xác minh để hoàn tất.</li>
                  </ol>
                </div>
                <Button 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-11 font-semibold shadow-sm"
                  onClick={() => setStep(2)}
                >
                  Bắt đầu thiết lập
                </Button>
              </CardContent>
            </Card>
          )}

          {/* BƯỚC 2: TẢI APP AUTHENTICATOR */}
          {step === 2 && (
            <Card className="w-full max-w-[550px] border-slate-200 shadow-sm gap-0">
              <CardHeader className="bg-white border-b border-slate-100 py-4 flex flex-row items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setStep(1)} className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <CardTitle className="text-base font-semibold text-slate-800">
                  Ứng dụng Authenticator
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 sm:p-8 bg-white">
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <div className="flex-1 space-y-4">
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Thay vì chờ tin nhắn văn bản, hãy lấy mã xác minh từ một ứng dụng xác thực. Ứng dụng này hoạt động ngay cả khi điện thoại không có kết nối mạng.
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Tải ứng dụng <span className="font-semibold text-slate-800">Google Authenticator</span> từ <span className="text-indigo-600 cursor-pointer hover:underline font-medium">Google Play</span> hoặc <span className="text-indigo-600 cursor-pointer hover:underline font-medium">App Store</span>.
                    </p>
                    <Button 
                      variant="outline" 
                      className="text-indigo-600 border-indigo-200 hover:bg-indigo-700 mt-4 font-semibold w-full sm:w-auto"
                      onClick={() => setStep(3)}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Thiết lập ứng dụng xác thực
                    </Button>
                  </div>
                  <div className="w-32 shrink-0 flex items-center justify-center p-4 bg-slate-50 rounded-full border border-slate-100">
                    <ShieldCheck className="w-16 h-16 text-indigo-300" strokeWidth={1.5} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* BƯỚC 3: HIỂN THỊ MÃ QR */}
          {step === 3 && (
            <Card className="w-full max-w-[450px] border-slate-200 shadow-sm gap-0">
              <CardHeader className="bg-white border-b border-slate-100 py-4">
                <CardTitle className="text-base font-semibold text-slate-800">
                  Quét mã QR
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 sm:p-8 space-y-6 bg-white">
                <ul className="text-sm text-slate-600 space-y-2 list-decimal pl-4">
                  <li>Mở ứng dụng Google Authenticator, nhấn vào dấu <b>+</b></li>
                  <li>Chọn <b>Quét mã QR</b> dưới đây:</li>
                </ul>
                
                <div className="flex justify-center py-2">
                  <div className="p-3 border border-slate-200 rounded-xl bg-white shadow-sm">
                    <QrCode className="w-40 h-40 text-slate-800" strokeWidth={1} />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5 space-y-3">
                  <p className="text-sm text-slate-600 font-medium">Hoặc nhập khóa thủ công:</p>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-center font-mono text-sm font-bold tracking-[0.2em] text-indigo-700 break-all">
                      JIP2 GYDW BBI5 NTRX RDJY 32YV
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <Button variant="ghost" onClick={() => setStep(2)} className="text-indigo-600 border-indigo-200 hover:bg-indigo-700 mt-4 font-semibold">Quay lại</Button>
                  <Button onClick={() => setStep(4)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">Tiếp theo <ChevronRight className="w-4 h-4 ml-1"/></Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* BƯỚC 4: NHẬP MÃ XÁC MINH */}
          {step === 4 && (
            <Card className="w-full max-w-[450px] border-slate-200 shadow-sm gap-0">
              <CardHeader className="bg-white border-b border-slate-100 py-4">
                <CardTitle className="text-base font-semibold text-slate-800">
                  Xác minh mã ứng dụng
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 sm:p-8 space-y-6 bg-white">
                <p className="text-sm text-slate-600 text-center">
                  Nhập mã 6 ký tự bạn nhìn thấy trong ứng dụng Authenticator để hoàn tất.
                </p>
                
                <div className="flex justify-center py-4">
                  <OTPInput
                    maxLength={6}
                    value={code}
                    onChange={setCode}
                    render={({ slots }) => (
                      <div className="flex gap-2 sm:gap-3">
                        {slots.map((slot, index) => (
                          <div
                            key={index}
                            className={`relative w-12 h-14 flex items-center justify-center text-2xl font-bold border rounded-lg bg-white transition-all ${
                              slot.isActive 
                                ? "border-indigo-500 ring-2 ring-indigo-100" 
                                : "border-slate-300"
                            }`}
                          >
                            {slot.char}
                            {slot.hasFakeCaret && (
                              <div className="absolute pointer-events-none inset-0 flex items-center justify-center animate-pulse">
                                <div className="w-[2px] h-8 bg-slate-900" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  />
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <Button variant="ghost" onClick={() => setStep(3)} className="text-indigo-600 border-indigo-200 hover:bg-indigo-700 mt-4 font-semibold">Quay lại</Button>
                  <Button 
                    onClick={handleVerify} 
                    disabled={code.length < 6 || isVerifying}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold min-w-[120px]"
                  >
                    {isVerifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Xác minh
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}