namespace Backend.Domains.Import.DTOs.Internal
{
    public class BulkConfirmAlertItemDto
    {
        public long AlertId { get; set; }
        public decimal? AdjustedQuantity { get; set; }
        public string? Notes { get; set; }
    }
}
