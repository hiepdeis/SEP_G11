namespace Backend.Domains.Import.DTOs.Accountants
{
    public class CreateDraftDto
    {
        //public int SupplierId { get; set; }
        public List<DraftItemDto> Items { get; set; } = new();
        public string? Notes { get; set; }
    }

    public class DraftItemDto
    {
        public int SupplierId { get; set; }
        public int MaterialId { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
    }
}
