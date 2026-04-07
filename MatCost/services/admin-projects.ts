import axiosClient from "@/lib/axios-client";
import type { ContractDto } from "@/services/admin-suppliers";

export type ProjectItem = {
  projectId: number;
  code: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  status: string | null;
  contracts?: ContractDto[];
};

export type ProjectPagedResult = {
  items: ProjectItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type UpsertProjectPayload = {
  code: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  status: string | null;
};

export type CreateProjectResponse = {
  id: number;
  message: string;
};

export function getProjects() {
  return axiosClient.get<ProjectPagedResult>("/admin/master-data/projects").then((res) => res.data);
}

export function createProject(payload: UpsertProjectPayload) {
  return axiosClient.post<CreateProjectResponse>("/admin/master-data/projects", payload).then((res) => res.data);
}

export function updateProject(projectId: number, payload: UpsertProjectPayload) {
  return axiosClient.put<ProjectItem>(`/admin/master-data/projects/${projectId}`, payload).then((res) => res.data);
}

export function deleteProject(projectId: number) {
  return axiosClient.delete<void>(`/admin/master-data/projects/${projectId}`).then((res) => res.data);
}
