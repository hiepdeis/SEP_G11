namespace Backend.Domains.Audit.DTOs.Accountants
{
    public class AuditPlanResponse
    {
        public int StockTakeId { get; set; }
        public int WarehouseId { get; set; }
        
        /// <summary>
        /// Danh sach BinLocationIds kiem ke.
        /// Neu rong, audit dang o pham vi toan kho.
        /// </summary>
        public List<int> BinLocationIds { get; set; } = new();
        
        public string Title { get; set; } = default!;
        public DateTime PlannedStartDate { get; set; }
        public DateTime PlannedEndDate { get; set; }
        public string Status { get; set; } = default!;
        public DateTime CreatedAt { get; set; }
        public int CreatedBy { get; set; }
        public string? Notes { get; set; }
    }
}
