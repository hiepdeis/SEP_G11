namespace Backend.Domains.Import.DTOs.Accountants
{
    public class ReceiptSummaryDto
    {
        public long ReceiptId { get; set; }
        public string ReceiptCode { get; set; } = string.Empty;
        public int? WarehouseId { get; set; }
        public string? WarehouseName { get; set; }
        //public int? SupplierId { get; set; }
        //public string? SupplierName { get; set; }
        public DateTime? ReceiptDate { get; set; }
        public string? Status { get; set; }
        public string? RejectionReason { get; set; }
        public int ItemCount { get; set; }
        public string CreatedByName { get; set; } = string.Empty;
    }
}