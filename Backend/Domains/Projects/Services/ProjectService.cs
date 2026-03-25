using Backend.Data;
using Backend.Domains.Projects.DTOs;
using Backend.Domains.Projects.Interfaces;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Projects.Services
{
    public class ProjectService : IProjectService
    {
        private readonly MyDbContext _db;

        public ProjectService(MyDbContext db)
        {
            _db = db;
        }

        public async Task<List<ProjectDto>> GetAllProjectsAsync(CancellationToken ct)
        {
            return await _db.Projects
                .AsNoTracking()
                .OrderByDescending(x => x.ProjectId)
                .Select(x => new ProjectDto
                {
                    ProjectId = x.ProjectId,
                    Code = x.Code,
                    Name = x.Name,
                    StartDate = x.StartDate,
                    EndDate = x.EndDate,
                    Budget = x.Budget,
                    Status = x.Status
                })
                .ToListAsync(ct);
        }

        public async Task<(bool success, string message)> CreateProjectAsync(CreateProjectRequest request, CancellationToken ct)
        {
            var exists = await _db.Projects.AnyAsync(x => x.Code == request.Code, ct);
            if (exists) return (false, "Mã dự án (Project Code) đã tồn tại.");

            var project = new Project
            {
                Code = request.Code,
                Name = request.Name,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                Budget = request.Budget,
                Status = string.IsNullOrWhiteSpace(request.Status) ? ProjectStatus.Active : request.Status
            };

            _db.Projects.Add(project);
            await _db.SaveChangesAsync(ct);
            return (true, "Tạo dự án thành công.");
        }

        public async Task<(bool success, string message)> UpdateProjectAsync(int id, UpdateProjectRequest request, CancellationToken ct)
        {
            var project = await _db.Projects.FirstOrDefaultAsync(x => x.ProjectId == id, ct);
            if (project == null) return (false, "Dự án không tồn tại.");

            project.Name = request.Name;
            project.StartDate = request.StartDate;
            project.EndDate = request.EndDate;
            project.Budget = request.Budget;
            project.Status = request.Status;

            await _db.SaveChangesAsync(ct);
            return (true, "Cập nhật dự án thành công.");
        }

        public async Task<(bool success, string message)> DeleteProjectAsync(int id, CancellationToken ct)
        {
            var project = await _db.Projects.FirstOrDefaultAsync(x => x.ProjectId == id, ct);
            if (project == null) return (false, "Dự án không tồn tại.");

            _db.Projects.Remove(project);
            await _db.SaveChangesAsync(ct);
            return (true, "Xóa dự án thành công.");
        }
    }
}