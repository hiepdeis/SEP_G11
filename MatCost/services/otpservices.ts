import axiosClient from "@/lib/axios-client";


export interface OtpSetupResponse {
    secret: string;
    qrUri: string;    
    message: string;
}
export interface OtpStatusResponse {
  isEnabled: boolean;
  isPending: boolean;
  setupAt: Date | null;
  verifiedAt: Date | null;
}

export const otpApi = {
    setup2FA: async () => {
        const response = await axiosClient.post("/TwoFactor/setup");
        return response.data as OtpSetupResponse;
    },
    validotp: async (otpCode: string) => {
        const response = await axiosClient.post("/TwoFactor/verify-setup", { otpCode });
        return response.data;
    },
   
    get2FAStatus: async () => {
        const response = await axiosClient.get("/TwoFactor/status");
        return response.data as OtpStatusResponse;
    },
    verifyAction: async (otpCode: string) => {
        const response = await axiosClient.post("/TwoFactor/verify-action", { otpCode });
        return response.data;
    }
}