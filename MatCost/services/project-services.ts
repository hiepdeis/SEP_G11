import axiosClient from "@/lib/axios-client";
import { get } from "http";

export interface ProjectDto {
  projectId: number;
  code: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string | null;
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
};