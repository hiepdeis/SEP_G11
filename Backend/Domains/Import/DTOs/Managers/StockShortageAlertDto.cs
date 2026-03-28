namespace Backend.Domains.Import.DTOs.Managers
{
    public class StockShortageAlertDto
    {
        public long AlertId { get; set; }
        public int MaterialId { get; set; }
        public string MaterialCode { get; set; } = string.Empty;
        public string MaterialName { get; set; } = string.Empty;
        public int? WarehouseId { get; set; }
        public string WarehouseName { get; set; } = string.Empty;
        public decimal CurrentQuantity { get; set; }
        public int? MinStockLevel { get; set; }
        public decimal? SuggestedQuantity { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Priority { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ConfirmedAt { get; set; }
        public int? ConfirmedBy { get; set; }
        public string? Notes { get; set; }
    }

    public class ConfirmStockShortageAlertDto
    {
        public decimal? AdjustedQuantity { get; set; }
        public string? Notes { get; set; }
    }
}
