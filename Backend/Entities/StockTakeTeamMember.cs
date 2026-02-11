

namespace Backend.Entities;

public partial class StockTakeTeamMember
{
    public long Id { get; set; }

    public int StockTakeId { get; set; }
    public int UserId { get; set; }

    // Counter / Checker / Supervisor ...
    public string? RoleInAudit { get; set; }

    // Assigned by manager
    public int? AssignedBy { get; set; }
    public DateTime? AssignedAt { get; set; }

    // Optional: Assigned / Accepted / Declined / Removed
    public string? Status { get; set; }

    public string? Note { get; set; }

    public virtual StockTake? StockTake { get; set; }
    public virtual User? User { get; set; }
    public virtual User? AssignedByNavigation { get; set; }
}
