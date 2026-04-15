using Backend.Domains.Projects.DTOs;

namespace Backend.Domains.Projects.Interfaces
{
    public interface IProjectService
    {
        Task<List<ProjectDto>> GetAllProjectsAsync(CancellationToken ct);
        Task<(bool success, string message)> SaveProjectAsync(SaveProjectRequest request, CancellationToken ct);
        Task<(bool success, string message)> UpdateProjectAsync(int id, UpdateProjectRequest request, CancellationToken ct);
        Task<(bool success, string message)> DeleteProjectAsync(int id, CancellationToken ct);
    }
}