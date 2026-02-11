namespace Backend.Domains.Audit.DTOs.Accountant
{
   

   
    public class StockTakeCreateResponse
    {
        public int StockTakeId { get; set; }
        public int WarehouseId { get; set; }

        public string? Title { get; set; }
        public string? Note { get; set; }

        public DateTime? PlannedStartDate { get; set; }
        public DateTime? PlannedEndDate { get; set; }

        public string Status { get; set; } = "Planned";

        public DateTime CreatedAt { get; set; }
        public int CreatedBy { get; set; }

        public int TotalLinesGenerated { get; set; }
    }

}
