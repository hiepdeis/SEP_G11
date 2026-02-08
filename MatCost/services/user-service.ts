import axiosClient from "@/lib/axios-client";

export interface UserDto {
  id: number;
  email: string;
  fullName: string;
  roleName: string;
  phoneNumber: string | null;
  status: boolean; 
}

export interface UserProfileUpdateDto {
  fullName: string;
  phoneNumber: string | null;
}

export interface UserStatusUpdateDto {
  isActive: boolean;
}

export interface PaginatedUsersDto {
  users: UserDto[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}


export const userApi = {
  // GET /api/User?pageIndex=1&pageSize=10
  getAll: (pageIndex: number = 1, pageSize: number = 10) => {
    return axiosClient.get<PaginatedUsersDto>("/User", {
      params: {
        pageIndex,
        pageSize,
      },
    });
  },

  // GET /api/User/{userId}
  getById: (userId: number) => {
    return axiosClient.get<UserDto>(`/User/${userId}`);
  },

  // PUT /api/User/{userId}
  update: (userId: number, data: UserProfileUpdateDto) => {
    return axiosClient.put<UserDto>(`/User/${userId}`, data);
  },

  // PATCH /api/User/{userId}/status
  updateStatus: (userId: number, isActive: boolean) => {
    const payload: UserStatusUpdateDto = { isActive };
    return axiosClient.patch<boolean>(`/User/${userId}/status`, payload);
  },
};