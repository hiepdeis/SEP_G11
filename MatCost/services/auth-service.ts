import axiosClient from "@/lib/axios-client";

export const authApi = {
  loginGoogle: () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_API_URL}/Auth/login-google`;

    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.append("client_id", clientId || "");
    googleAuthUrl.searchParams.append("redirect_uri", redirectUri);
    googleAuthUrl.searchParams.append("response_type", "code");
    googleAuthUrl.searchParams.append("scope", "openid email profile");
    googleAuthUrl.searchParams.append("access_type", "offline");
    googleAuthUrl.searchParams.append("prompt", "consent");

    window.location.href = googleAuthUrl.toString();
  },

  getMe: () => {
    return axiosClient.get("/Auth/me");
  },

  logout: () => {
    return Promise.resolve();
  }
};