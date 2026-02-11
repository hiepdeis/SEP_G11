namespace Backend.Domains.Import.DTOs.Accountants
{
    public class ReceiptDetailDto
    {
        public long ReceiptId { get; set; }
        public string ReceiptCode { get; set; } = string.Empty;
        public int? WarehouseId { get; set; }
        public string? WarehouseName { get; set; }
        public DateTime? ReceiptDate { get; set; }
        public string? Status { get; set; }
        public decimal? TotalAmount { get; set; }
        public List<ReceiptItemDto> Items { get; set; } = new();
    }

    public class ReceiptItemDto
    {
        public long DetailId { get; set; }
        public int? MaterialId { get; set; }
        public string MaterialCode { get; set; } = string.Empty;
        public string MaterialName { get; set; } = string.Empty;
        public decimal? Quantity { get; set; }
        public int? SupplierId { get; set; }
        public string SupplierName { get; set; } = string.Empty;
        public decimal? UnitPrice { get; set; }
        public decimal? LineTotal { get; set; }
    }
}
