namespace Backend.Domains.Import.DTOs.Managers
{
    public class ApproveReceiptDto
    {
        public string? ApprovalNotes { get; set; }
    }

    public class RejectReceiptDto
    {
        public string RejectionReason { get; set; } = string.Empty;
    }

    public class PendingReceiptDto
    {
        public long ReceiptId { get; set; }
        public DateTime? ReceiptDate { get; set; }
        public string? WarehouseName { get; set; }
        public string? SupplierName { get; set; }
        public decimal? TotalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? CreatedByName { get; set; }
        public DateTime? CreatedDate { get; set; }
        public List<PendingReceiptDetailDto> Details { get; set; } = new();
    }

    public class PendingReceiptDetailDto
    {
        public long DetailId { get; set; }
        public string? MaterialCode { get; set; }
        public string? MaterialName { get; set; }
        public decimal? Quantity { get; set; }
        public string? Unit { get; set; }
        public decimal? UnitPrice { get; set; }
        public decimal? SubTotal { get; set; }
    }
}