namespace Backend.Domains.Import.DTOs.Staff
{
    public class GetInboundRequestListDto
    {
        public long ReceiptId { get; set; }
        public string ReceiptCode { get; set; }
        public int? WarehouseId { get; set; }
        public string WarehouseName { get; set; }
        public DateTime? ReceiptApprovalDate { get; set; }
        public decimal TotalQuantity { get; set; }
        public List<GetInboundRequestItemDto> Items { get; set; }
        public int? ConfirmedBy { get; set; }
        public string? Status { get; set; }
    }

    public class GetInboundRequestItemDto
    {
        public long DetailId { get; set; }
        public int? MaterialId { get; set; }
        public string MaterialCode { get; set; } = string.Empty;
        public string MaterialName { get; set; } = string.Empty;
        public decimal? Quantity { get; set; }
        public decimal? ActualQuantity { get; set; }
        public int? BinLocationId { get; set; }
        public string? BinCode { get; set; }
        public int? BatchId { get; set; }
        public string? BatchCode { get; set; }
        public DateTime? MfgDate { get; set; }
        public int? SupplierId { get; set; }
        public string SupplierName { get; set; } = string.Empty;
        public decimal? UnitPrice { get; set; }
        public string? Unit { get; set; }
        public decimal? LineTotal { get; set; }
    }
}
