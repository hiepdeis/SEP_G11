import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const REFRESH_ENDPOINT = "/Auth/me";

let accessToken: string | null = null;
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

const axiosClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Để gửi kèm Cookie RefreshToken
});

// Request Interceptor
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // 1. Nếu không phải lỗi 401 -> Bỏ qua
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }
    // Nếu chính cái API dùng để check auth (/Auth/me) bị lỗi
    // Thì đừng cố refresh nữa (tránh lặp vô tận) -> Trả lỗi ngay để Dashboard đá về Login
   if (originalRequest.url?.includes(REFRESH_ENDPOINT)) {
      // Xóa token rác nếu có
      setAccessToken(null);
      return Promise.reject(error);
    }

    // 3. Nếu request này đã từng retry rồi mà vẫn lỗi -> Bỏ qua
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // --- Phần xử lý Queue và Refresh Token giữ nguyên bên dưới ---
    if (isRefreshing) {
      return new Promise(function (resolve, reject) {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Gọi API check/refresh
      const response = await axiosClient.get(REFRESH_ENDPOINT);
      const newAccessToken = response.data.accessToken;
      
      setAccessToken(newAccessToken);

      axiosClient.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${newAccessToken}`;
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      processQueue(null, newAccessToken);

      return axiosClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      setAccessToken(null);

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default axiosClient;