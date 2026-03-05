namespace Backend.Domains.Audit.DTOs.Managers;

public sealed class AssignedMemberDto
{
    public int UserId { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
    
    public DateTime? AssignedAt { get; set; }
}

public sealed class AuditTeamResponse
{
    public int StockTakeId { get; set; }
    public string? Title { get; set; }
    public int WarehouseId { get; set; }
    public DateTime? PlannedStartDate { get; set; }
    public DateTime? PlannedEndDate { get; set; }

    public List<AssignedMemberDto> AssignedMembers { get; set; } = new();
}

public sealed class EligibleStaffDto
{
    public int UserId { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
}

public sealed class SaveTeamRequest
{
    public List<int> MemberUserIds { get; set; } = new();
    public string RoleInTeam { get; set; } = "Counter"; // default
}
