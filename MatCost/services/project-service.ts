import axiosClient from "@/lib/axios-client";

export interface ProjectDto {
  projectId: number;
  code: string;
  name: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  status?: string;
}

export interface SaveProjectRequest {
  projectId?: number;
  code: string;
  name: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  status?: string;
}

export interface UpdateProjectRequest {
  name: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  status?: string;
}

export const projectService = {
  getAll: async () => {
    const response = await axiosClient.get<ProjectDto[]>("/accountants/projects");
    return response.data;
  },
  save: async (data: SaveProjectRequest) => {
    const response = await axiosClient.post("/accountants/projects/save", data);
    return response.data;
  },
  // update: async (id: number, data: UpdateProjectRequest) => {
  //   const response = await axiosClient.put(`/accountants/projects/${id}`, data);
  //   return response.data;
  // },
  delete: async (id: number) => {
    const response = await axiosClient.delete(`/accountants/projects/${id}`);
    return response.data;
  },
  getStatuses: async () => {
    const response = await axiosClient.get<string[]>("/accountants/projects/statuses");
    return response.data;
  },
};