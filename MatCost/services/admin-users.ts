import axiosClient from "@/lib/axios-client";

export type UserItem = {
  userId: number;
  username: string;
  roleId: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  status: boolean;
};

export type UserPagedResult = {
  items: UserItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type GetUsersParams = {
  keyword?: string;
  status?: boolean | "";
  page?: number;
  pageSize?: number;
};

export type RoleItem = {
  roleId: number;
  roleName: string;
};
export type UpdateUserPayload = {
  fullName: string;
  email: string;
  phoneNumber: string;
  roleId: number;
  status: boolean;
};
export function deleteUser(userId: number) {
  return axiosClient.delete(`/admin/users/${userId}`).then((res) => res.data);
}
export function updateUser(userId: number, payload: UpdateUserPayload) {
  return axiosClient.put(`/admin/users/${userId}`, payload).then((res) => res.data);
}
export function getRoles() {
  return axiosClient.get<RoleItem[]>("/admin/users/roles").then((res) => res.data);
}

export function getUsers(params: GetUsersParams = {}) {
  const search = new URLSearchParams();

  if (params.keyword) {
    search.append("keyword", params.keyword);
  }

  if (params.status !== undefined && params.status !== "") {
    search.append("status", String(params.status));
  }

  if (params.page !== undefined) {
    search.append("page", String(params.page));
  }

  if (params.pageSize !== undefined) {
    search.append("pageSize", String(params.pageSize));
  }

  const query = search.toString();
  return axiosClient.get<UserPagedResult>(`/admin/users${query ? `?${query}` : ""}`).then((res) => res.data);
}
export function updateUserRole(userId: number, roleId: number) {
  return axiosClient.patch(`/admin/users/${userId}/role`, { roleId }).then((res) => res.data);
}
export type UpdateRolePayload = {
  roleName: string;
};

export function updateRole(roleId: number, payload: { roleName: string }) {
  return axiosClient.put(`/admin/users/roles/${roleId}`, payload).then((res) => res.data);
}

export function deleteRole(roleId: number) {
  return axiosClient.delete(`/admin/users/roles/${roleId}`).then((res) => res.data);
}
export type CreateRolePayload = {
  roleName: string;
};
export function createRole(payload: CreateRolePayload) {
  return axiosClient.post<RoleItem>("/admin/users/roles", payload).then((res) => res.data);
}