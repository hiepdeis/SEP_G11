namespace Backend.Domains.Audit.DTOs.Accountants
{
    public class AuditPlanResponse
    {
        public int StockTakeId { get; set; }
        public int WarehouseId { get; set; }
        public string Title { get; set; } = default!;
        public DateTime PlannedStartDate { get; set; }
        public DateTime PlannedEndDate { get; set; }
        public string Status { get; set; } = default!;
        public DateTime CreatedAt { get; set; }
        public int CreatedBy { get; set; }
        public string? Notes { get; set; }
    }
}
