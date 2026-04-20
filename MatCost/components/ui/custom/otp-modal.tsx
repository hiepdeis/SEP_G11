"use client";

import { useState, useRef } from "react";
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
import {
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Eraser,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { otpApi } from "@/services/otpservices";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";

interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (signatureBase64?: string) => Promise<void> | void;
  title?: string;
  description?: string;
  submitText?: string;
  requireSignature?: boolean;
}

export function OtpVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  title,
  description,
  submitText,
  requireSignature = false,
}: OtpVerificationModalProps) {
  const { t } = useTranslation();
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const sigPadRef = useRef<SignatureCanvas>(null);
  const [hasSignature, setHasSignature] = useState(false);

  const router = useRouter();

  const displayTitle = title || t("Security Verification");
  const displayDescription =
    description ||
    t("The system requires authentication to proceed with this action.");
  const displaySubmitText = submitText || t("Complete Approval");

  const clearSignature = () => {
    sigPadRef.current?.clear();
    setHasSignature(false);
  };

  const handleConfirm = async () => {
    if (isVerifying) return;

    if (requireSignature && !hasSignature) {
      toast.error(t("Please provide your signature before proceeding."));
      return;
    }

    if (otp.length !== 6) {
      toast.error(t("Please enter all 6 OTP digits."));
      return;
    }

    try {
      setIsVerifying(true);

      await otpApi.verifyAction(otp);

      const signatureData = requireSignature
        ? sigPadRef.current?.getTrimmedCanvas().toDataURL("image/png")
        : undefined;

      await onSuccess(signatureData);

      setOtp("");
      if (requireSignature) clearSignature();
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
      if (requireSignature) clearSignature();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <ShieldCheck className="w-5 h-5" /> {displayTitle}
          </DialogTitle>
          <DialogDescription>{displayDescription}</DialogDescription>
        </DialogHeader>

        <div className="py-4 flex flex-col space-y-6">
          {requireSignature && (
            <div className="flex flex-col space-y-2 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <PenLine className="w-4 h-4 text-slate-500" />
                  {t("E-Signature")}
                </label>
                {hasSignature && (
                  <button
                    onClick={clearSignature}
                    className="text-xs font-medium text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Eraser className="w-3 h-3" /> {t("Clear")}
                  </button>
                )}
              </div>
              <div
                className={`border rounded-xl overflow-hidden bg-slate-50 transition-colors ${
                  !hasSignature
                    ? "border-slate-300"
                    : "border-primary ring-1 ring-primary/20"
                }`}
              >
                <SignatureCanvas
                  ref={sigPadRef}
                  onEnd={() => setHasSignature(true)}
                  canvasProps={{
                    className: "w-full h-[120px] cursor-crosshair",
                  }}
                  backgroundColor="rgb(248 250 252)"
                  penColor="black"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col items-center justify-center space-y-4">
            <label className="text-sm font-semibold text-slate-700 w-full text-left">
              {t("Authenticator Code (OTP)")}
            </label>
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
            <div className="w-full flex flex-col gap-1 items-center">
              <p className="text-xs text-slate-500 m-0">
                {t("OTP code will reset in every 1 minute.")}
              </p>
              <p className="text-xs text-slate-500 cursor-pointer m-0">
                <span>{t("If you haven't setup OTP, ")}</span>
                <span
                  className="text-primary hover:underline font-medium"
                  onClick={() => router.push("/security/2fa")}
                >
                  {t("setup here.")}
                </span>
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isVerifying}
          >
            {t("Cancel")}
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-white min-w-[140px] ml-4"
            onClick={handleConfirm}
            disabled={
              isVerifying ||
              otp.length !== 6 ||
              (requireSignature && !hasSignature)
            }
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
