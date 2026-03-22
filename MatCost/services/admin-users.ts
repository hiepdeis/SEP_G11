import { apiGet, apiPatch, apiPut, apiDelete, apiPost } from "@/lib/api";

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
  return apiDelete(`/admin/users/${userId}`);
}
export function updateUser(userId: number, payload: UpdateUserPayload) {
  return apiPut(`/admin/users/${userId}`, payload);
}
export function getRoles() {
  return apiGet<RoleItem[]>("/admin/users/roles");
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
  return apiGet<UserPagedResult>(`/admin/users${query ? `?${query}` : ""}`);
}
export function updateUserRole(userId: number, roleId: number) {
  return apiPatch(`/admin/users/${userId}/role`, { roleId });
}
export type UpdateRolePayload = {
  roleName: string;
};

export function updateRole(roleId: number, payload: { roleName: string }) {
  return apiPut(`/admin/users/roles/${roleId}`, payload);
}

export function deleteRole(roleId: number) {
  return apiDelete(`/admin/users/roles/${roleId}`);
}
export type CreateRolePayload = {
  roleName: string;
};
export function createRole(payload: CreateRolePayload) {
  return apiPost<RoleItem>("/admin/users/roles", payload);
}