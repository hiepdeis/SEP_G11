namespace Backend.Domains.Audit.DTOs.Accountant
{
   

    public class StockTakeCreateRequest
    {
        public int WarehouseId { get; set; }

        public string? Title { get; set; }
        public string? Note { get; set; }

        public DateTime? PlannedStartDate { get; set; }
        public DateTime? PlannedEndDate { get; set; }

        // Optional rule: block create if there is an active audit in this warehouse
        public bool BlockIfActiveAuditExists { get; set; } = true;
    }

}
