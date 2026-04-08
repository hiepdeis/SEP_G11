"use client";
import { Sidebar } from "@/components/sidebar";
import React, { useState } from 'react';

export default function Setup2FA() {
  // Quản lý luồng các bước: 0 (Giới thiệu), 1 (Quét QR & Nhập mã), 2 (Thành công)
  const [step, setStep] = useState(0); 
  
  // Lưu trữ dữ liệu từ API
  const [setupData, setSetupData] = useState({ secret: '', qrUri: '' });
  const [otpCode, setOtpCode] = useState('');
  
  // Trạng thái UI (Loading, Error)
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Lấy token từ LocalStorage (hoặc nơi bạn lưu JWT trong đồ án)
  // Thay thế bằng logic lấy token thực tế của bạn
  const getToken = () => localStorage.getItem('accessToken') || '';

  // BƯỚC 1: Gọi API Setup để lấy mã QR
  const handleStartSetup = async () => {
    setIsLoading(true);
    setErrorMsg('');
    
    try {
      const response = await fetch('https://[TEN_MIEN_CUA_BAN]/api/TwoFactorAuth/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}` // Gửi JWT Token lên
        }
      });

      const data = await response.json();

      if (response.ok) {
        setSetupData({
          secret: data.secret,
          qrUri: data.qrUri
        });
        setStep(1); // Chuyển sang bước Quét QR
      } else {
        setErrorMsg(data.message || 'Có lỗi xảy ra khi tạo mã 2FA.');
      }
    } catch (err) {
      setErrorMsg('Không thể kết nối đến máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  // BƯỚC 2: Gọi API Verify để xác nhận mã người dùng nhập
  const handleVerify = async () => {
    if (otpCode.length !== 6) {
      setErrorMsg('Mã xác nhận phải đủ 6 chữ số.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('https://[TEN_MIEN_CUA_BAN]/api/TwoFactorAuth/verify-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ otpCode: otpCode }) // Gửi mã 6 số lên
      });

      const data = await response.json();

      if (response.ok) {
        setStep(2); // Chuyển sang màn hình Thành công
      } else {
        setErrorMsg(data.message || 'Mã xác nhận không đúng hoặc đã hết hạn.');
      }
    } catch (err) {
      setErrorMsg('Không thể kết nối đến máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
<div className="flex flex-row h-screen w-screen overflow-hidden bg-slate-50/50">
      <Sidebar />

    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header Progress Bar (Thanh tiến trình) */}
        <div className="bg-slate-800 p-6 text-white text-center">
          <div className="flex justify-center items-center space-x-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold ${step >= 0 ? 'bg-green-500' : 'bg-slate-600'}`}>1</div>
            <div className={`h-1 w-10 ${step >= 1 ? 'bg-green-500' : 'bg-slate-600'}`}></div>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-green-500' : 'bg-slate-600'}`}>2</div>
            <div className={`h-1 w-10 ${step >= 2 ? 'bg-green-500' : 'bg-slate-600'}`}></div>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-green-500' : 'bg-slate-600'}`}>3</div>
          </div>
          <h2 className="text-xl font-bold mt-4">
            {step === 0 && 'Bảo vệ tài khoản'}
            {step === 1 && 'Thiết lập ứng dụng'}
            {step === 2 && 'Hoàn tất'}
          </h2>
        </div>

        <div className="p-8">
          {/* HIỂN THỊ LỖI CHUNG CHUNG (NẾU CÓ) */}
          {errorMsg && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-6 border border-red-200 text-center">
              {errorMsg}
            </div>
          )}

          {/* STEP 0: GIỚI THIỆU */}
          {step === 0 && (
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                {/* Icon Lock SVG */}
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </div>
              <p className="text-gray-600 text-sm">
                Xác thực 2 lớp (2FA) giúp bảo vệ tài khoản MatCost của bạn khỏi những truy cập trái phép bằng cách yêu cầu mã xác nhận từ điện thoại khi đăng nhập.
              </p>
              <button 
                onClick={handleStartSetup}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition disabled:opacity-50"
              >
                {isLoading ? 'Đang xử lý...' : 'Bắt đầu thiết lập'}
              </button>
            </div>
          )}

          {/* STEP 1: QUÉT MÃ QR & NHẬP OTP */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  1. Mở ứng dụng <strong>Google Authenticator</strong> hoặc Authy trên điện thoại của bạn.
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  2. Chọn quét mã QR bên dưới:
                </p>
                
                {/* Tạo mã QR tĩnh bằng API để tránh lỗi thư viện React */}
                <div className="flex justify-center mb-4">
                  <div className="p-2 bg-white border-2 border-gray-100 rounded-xl shadow-sm">
                    {setupData.qrUri && (
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.qrUri)}`} 
                        alt="Mã QR 2FA" 
                        className="w-48 h-48"
                      />
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-500 mb-6">
                  <span>Không thể quét mã QR? Nhập khóa này thủ công:</span>
                  <br />
                  <code className="font-mono text-blue-600 font-bold tracking-widest block mt-1">
                    {setupData.secret}
                  </code>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  3. Nhập mã 6 số từ ứng dụng:
                </label>
                <input 
                  type="text" 
                  maxLength="6"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} // Chỉ cho phép nhập số
                  className="w-full text-center text-2xl tracking-[0.5em] font-mono py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div className="flex space-x-3 mt-6">
                <button 
                  onClick={() => setStep(0)}
                  className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition"
                >
                  Quay lại
                </button>
                <button 
                  onClick={handleVerify}
                  disabled={isLoading || otpCode.length !== 6}
                  className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Đang xác nhận...' : 'Xác nhận mã'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: THÀNH CÔNG */}
          {step === 2 && (
            <div className="text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4">
                {/* Icon Check SVG */}
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Bật thành công!</h3>
              <p className="text-gray-600 text-sm">
                Từ bây giờ, mỗi khi đăng nhập vào hệ thống MatCost, bạn sẽ cần nhập thêm mã xác nhận từ ứng dụng điện thoại.
              </p>
              <button 
                onClick={() => window.location.reload()} // Hoặc redirect về trang profile
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 px-4 rounded-xl transition mt-4"
              >
                Trở về trang cá nhân
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
    </div>
  );
}