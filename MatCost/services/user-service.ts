import axiosClient from "@/lib/axios-client";

export interface UserDto {
  id: number;
  email: string;
  fullName: string;
  roleName: string;
  phoneNumber: string | null;
  status: boolean;
}

export const userApi = {
  // GET /api/User
  getAll: () => {
    return axiosClient.get<UserDto[]>("/User");
  },

  // GET /api/User/{userId}
  getById: (userId: number) => {
    return axiosClient.get<UserDto>(`/User/${userId}`);
  },

  // PUT /api/User/update/{userId}
  update: (userId: number, data: UserDto) => {
    return axiosClient.put<UserDto>(`/User/update/${userId}`, data);
  },

  // PUT /api/User/activate/{userId}
  activate: (userId: number) => {
    return axiosClient.put<boolean>(`/User/activate/${userId}`);
  },

  // PUT /api/User/deactivate/{userId}
  deactivate: (userId: number) => {
    return axiosClient.put<boolean>(`/User/deactivate/${userId}`);
  },
};