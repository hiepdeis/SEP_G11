namespace Backend.Domains.Import.DTOs.Admins
{
    public class CreatePurchaseRequestFromAlertDto
    {
        // public int ProjectId { get; set; }
        public List<PurchaseRequestItemInputDto> Items { get; set; } = new();
    }

    public class PurchaseRequestItemInputDto
    {
        public int MaterialId { get; set; }
        public decimal Quantity { get; set; }
        public string? Notes { get; set; }
    }

    public class PurchaseRequestDto
    {
        public long RequestId { get; set; }
        public string RequestCode { get; set; } = string.Empty;
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public long? AlertId { get; set; }
        public int CreatedBy { get; set; }
        public string? CreatedByName { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public List<PurchaseRequestItemDto> Items { get; set; } = new();
    }

    public class PurchaseRequestItemDto
    {
        public long ItemId { get; set; }
        public int MaterialId { get; set; }
        public string MaterialCode { get; set; } = string.Empty;
        public string MaterialName { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public string? Notes { get; set; }
    }
}
