import axiosClient from "@/lib/axios-client";
import { get } from "http";

export interface ProjectDto {
  projectId: number;
  code: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string | null;
  budget: number | null;
  budgetUsed: number | null;
  budgetRemaining: number | null;
}

export const projectApi = {
  getProjects: async (): Promise<ProjectDto[]> => {
    const response = await axiosClient.get("/Projects");
    return response.data;
  },

  getProjectById: async (projectId: number): Promise<ProjectDto> => {
    const response = await axiosClient.get(`/Projects/${projectId}`);
    return response.data;
  },

  createProject: async (
    project: Omit<ProjectDto, "projectId">,
  ): Promise<ProjectDto> => {
    const response = await axiosClient.post("/Projects", project);
    return response.data;
  },
};
