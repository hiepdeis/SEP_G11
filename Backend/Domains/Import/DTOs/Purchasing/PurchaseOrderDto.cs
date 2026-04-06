namespace Backend.Domains.Import.DTOs.Purchasing
{
    public class CreatePurchaseOrderDraftDto
    {
        public long RequestId { get; set; }
        public int? SupplierId { get; set; }
        public long? ParentPOId { get; set; }
        public string? RevisionNote { get; set; }
        public List<PurchaseOrderDraftItemDto> Items { get; set; } = new();
    }

    public class PurchaseOrderDraftItemDto
    {
        public int? SupplierId { get; set; }
        public int MaterialId { get; set; }
        public decimal OrderedQuantity { get; set; }
        public decimal? UnitPrice { get; set; }
    }

    public class PurchaseOrderDto
    {
        public long PurchaseOrderId { get; set; }
        public string PurchaseOrderCode { get; set; } = string.Empty;
        public long? RequestId { get; set; }
        public string? RequestCode { get; set; }
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public int SupplierId { get; set; }
        public string SupplierName { get; set; } = string.Empty;
        public int CreatedBy { get; set; }
        public string? CreatedByName { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? AccountantApprovedBy { get; set; }
        public string? AccountantApprovedByName { get; set; }
        public DateTime? AccountantApprovedAt { get; set; }
        public int? AdminApprovedBy { get; set; }
        public string? AdminApprovedByName { get; set; }
        public DateTime? AdminApprovedAt { get; set; }
        public DateTime? SentToSupplierAt { get; set; }
        public DateTime? ExpectedDeliveryDate { get; set; }
        public string? SupplierNote { get; set; }
        public decimal? TotalAmount { get; set; }
        public long? ParentPOId { get; set; }
        public int RevisionNumber { get; set; }
        public string? RevisionNote { get; set; }
        public string? RejectionReason { get; set; }
        public List<PurchaseOrderItemDto> Items { get; set; } = new();
    }

    public class PurchaseOrderItemDto
    {
        public long ItemId { get; set; }
        public int MaterialId { get; set; }
        public string MaterialCode { get; set; } = string.Empty;
        public string MaterialName { get; set; } = string.Empty;
        public decimal OrderedQuantity { get; set; }
        public decimal? UnitPrice { get; set; }
        public decimal? LineTotal { get; set; }
    }

    public class PurchaseOrderRejectDto
    {
        public string Reason { get; set; } = string.Empty;
    }

    public class SupplierWithMaterialDto
    {
        public int SupplierId { get; set; }
        public string Name { get; set; }
        public List<int> MaterialIds { get; set; } = new List<int>();
    }
}
