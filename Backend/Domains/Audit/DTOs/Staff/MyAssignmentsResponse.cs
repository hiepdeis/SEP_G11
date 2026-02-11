namespace Backend.Domains.Audit.DTOs.Staff
{
    public class MyAssignmentsResponse
    {
        public long TeamMemberId { get; set; }
        public int StockTakeId { get; set; }
        public int WarehouseId { get; set; }
        public string? AuditTitle { get; set; }

        public string? RoleInAudit { get; set; }
        public string Status { get; set; } = "Assigned";

        public DateTime? AssignedAt { get; set; }
        public int? AssignedBy { get; set; }
    }
}
