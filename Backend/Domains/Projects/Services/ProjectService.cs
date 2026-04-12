using Backend.Data;
using Backend.Domains.Projects.DTOs;
using Backend.Domains.Projects.Interfaces;
using Backend.Domains.Projects.Constants;
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

        public async Task<(bool success, string message)> SaveProjectAsync(SaveProjectRequest request, CancellationToken ct)
        {
            bool isUpdate = request.ProjectId.HasValue && request.ProjectId > 0;
            Project project;

            if (isUpdate)
            {
                project = await _db.Projects.FirstOrDefaultAsync(x => x.ProjectId == request.ProjectId, ct);
                if (project == null) return (false, "Dự án không tồn tại.");
            }
            else
            {
                var exists = await _db.Projects.AnyAsync(x => x.Code == request.Code, ct);
                if (exists) return (false, "Mã dự án (Project Code) đã tồn tại.");

                project = new Project { Code = request.Code };
                _db.Projects.Add(project);
            }

            project.Name = request.Name;
            project.StartDate = request.StartDate;
            project.EndDate = request.EndDate;
            project.Budget = request.Budget;

            project.Status = isUpdate ? request.Status : ProjectStatus.Pending;

            await _db.SaveChangesAsync(ct);

            string message = isUpdate ? "Cập nhật dự án thành công." : "Tạo dự án thành công.";
            return (true, message);
        }

        public async Task<(bool success, string message)> DeleteProjectAsync(int id, CancellationToken ct)
        {
            var project = await _db.Projects.FirstOrDefaultAsync(x => x.ProjectId == id, ct);
            if (project == null) return (false, "Dự án không tồn tại.");

            _db.Projects.Remove(project);
            await _db.SaveChangesAsync(ct);
            return (true, "Xóa dự án thành công.");
        }

        public Task<(bool success, string message)> UpdateProjectAsync(int id, UpdateProjectRequest request, CancellationToken ct)
        {
            throw new NotImplementedException();
        }
    }
}