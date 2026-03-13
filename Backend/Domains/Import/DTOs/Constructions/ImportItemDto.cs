namespace Backend.Domains.Import.DTOs.Construction
{
    public class ImportItemDto
    {
        public string? MaterialCode { get; set; }
        public string? MaterialName { get; set; }
        public decimal Quantity { get; set; }
        public string? Unit { get; set; }
    }
}
