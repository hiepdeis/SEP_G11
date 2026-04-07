import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
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
  return apiGet<ProjectPagedResult>("/admin/master-data/projects");
}

export function createProject(payload: UpsertProjectPayload) {
  return apiPost<CreateProjectResponse>("/admin/master-data/projects", payload);
}

export function updateProject(projectId: number, payload: UpsertProjectPayload) {
  return apiPut<ProjectItem>(`/admin/master-data/projects/${projectId}`, payload);
}

export function deleteProject(projectId: number) {
  return apiDelete<void>(`/admin/master-data/projects/${projectId}`);
}
