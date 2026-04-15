namespace Backend.Domains.Projects.DTOs
{
    public class ProjectDto
    {
        public int ProjectId { get; set; }
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal? Budget { get; set; }
        public string? Status { get; set; }
    }

    public class SaveProjectRequest
    {
        public int? ProjectId { get; set; }
        public string Code { get; set; } = null!;
        public string Name { get; set; } = null!;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal? Budget { get; set; }
        public string? Status { get; set; }
    }

    public class UpdateProjectRequest
    {
        public string Name { get; set; } = null!;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal? Budget { get; set; }
        public string? Status { get; set; }
    }
}