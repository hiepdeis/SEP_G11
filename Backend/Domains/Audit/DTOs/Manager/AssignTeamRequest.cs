namespace Backend.Domains.Audit.DTOs.Manager
{
    public class AssignTeamRequest
    {
       
            public List<TeamMemberItem> Members { get; set; } = new();

            // Nếu true: user đã có trong audit thì update Role/Status/Note
            // Nếu false: bỏ qua các user đã tồn tại
            public bool Upsert { get; set; } = true;

            public class TeamMemberItem
            {
                public int UserId { get; set; }
                public string? RoleInAudit { get; set; } = "Counter"; // Counter/Checker/Supervisor...
                public string? Note { get; set; }
            }
        }
}
