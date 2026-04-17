"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OTPInput } from "input-otp";
import { Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { otpApi } from "@/services/otpservices";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";

interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
  title?: string;
  description?: string;
  submitText?: string;
}

export function OtpVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  title,
  description,
  submitText,
}: OtpVerificationModalProps) {
  const { t } = useTranslation();
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const router = useRouter();

  const displayTitle = title || t("OTP Security Verification");
  const displayDescription =
    description ||
    t(
      "The system requires 2nd layer authentication. Please check your Authenticator app and enter the 6-digit code.",
    );
  const displaySubmitText = submitText || t("Complete Approval");

  const handleConfirm = async () => {
    if (isVerifying) return;

    if (otp.length !== 6) {
      toast.error(t("Please enter all 6 OTP digits."));
      return;
    }

    try {
      setIsVerifying(true);
      await otpApi.verifyAction(otp);

      await onSuccess();

      setOtp("");
      onClose();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || t("Incorrect or expired OTP code."),
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setOtp("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <ShieldCheck className="w-5 h-5" /> {displayTitle}
          </DialogTitle>
          <DialogDescription>{displayDescription}</DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center justify-center space-y-4">
          <OTPInput
            maxLength={6}
            value={otp}
            onChange={setOtp}
            disabled={isVerifying}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleConfirm();
              }
            }}
            render={({ slots }) => (
              <div className="flex gap-2 sm:gap-3">
                {slots.map((slot, index) => (
                  <div
                    key={index}
                    className={`relative w-12 h-14 flex items-center justify-center text-3xl font-bold border rounded-lg bg-white transition-all ${
                      slot.isActive
                        ? "border-primary ring-2 ring-primary/10"
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
          <p className="text-xs text-slate-500 m-0">
            {t("OTP code will reset in every 1 minute.")}
          </p>
          <p className="text-xs text-slate-500 cursor-pointer m-0">
            <span>{t("If you haven't setup OTP, ")}</span>
            <span
              className="text-primary underline"
              onClick={() => {
                router.push("/security/2fa");
              }}
            >
              {t("setup here.")}
            </span>
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isVerifying}
          >
            {t("Cancel")}
          </Button>
          <Button
            className="bg-primary hover:bg-primary/80 text-white"
            onClick={handleConfirm}
            disabled={isVerifying || otp.length !== 6}
          >
            {isVerifying ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            {displaySubmitText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
