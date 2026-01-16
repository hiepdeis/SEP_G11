import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Định nghĩa URL API gốc
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Biến lưu Access Token trong Memory (An toàn hơn lưu LocalStorage)
let accessToken: string | null = null;

// Cờ để đánh dấu đang trong quá trình refresh token
let isRefreshing = false;

// Hàng đợi các request bị lỗi 401 để gọi lại sau khi refresh thành công
let failedQueue: any[] = [];

// Hàm xử lý hàng đợi
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

// Hàm setter để login xong thì gán token vào ngay
export const setAccessToken = (token: string) => {
  accessToken = token;
};

// Khởi tạo axios instance
const axiosClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Quan trọng: Cho phép gửi cookie (HttpOnly) đi kèm request
  withCredentials: true, 
});

// --- INTERCEPTOR REQUEST: Gắn Access Token vào Header ---
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- INTERCEPTOR RESPONSE: Xử lý 401 & Refresh Token ---
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Nếu lỗi không phải 401 hoặc request đã retry rồi thì trả lỗi luôn
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Nếu đang refresh, thì add request này vào hàng đợi
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

    // Bắt đầu quá trình Refresh Token
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Gọi API refresh token (Cookie HttpOnly sẽ tự động được gửi đi nhờ withCredentials: true)
      // Giả sử API trả về: { data: { accessToken: "..." } }
      const response = await axiosClient.post('/auth/refresh-token');
      
      const newAccessToken = response.data.accessToken; // Điều chỉnh field này theo response của BE ông
      
      // Gán lại token vào biến memory
      setAccessToken(newAccessToken);

      // Gán token mới vào header của request đang bị lỗi
      axiosClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      // Xử lý hàng đợi các request đang chờ
      processQueue(null, newAccessToken);
      
      // Gọi lại request ban đầu
      return axiosClient(originalRequest);
    } catch (refreshError) {
      // Nếu refresh token cũng lỗi (hết hạn hẳn hoặc không hợp lệ) -> Logout
      processQueue(refreshError, null);
      
      // Xóa token
      accessToken = null;
      
      // Redirect về trang login hoặc bắn event logout
      if (typeof window !== 'undefined') {
          // Lưu ý: Next.js dùng router.push sẽ mượt hơn, nhưng ở file lib dùng window.location cho chắc cốp
          // window.location.href = '/login'; 
          console.log("Phiên đăng nhập hết hạn, vui lòng login lại");
      }
      
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default axiosClient;