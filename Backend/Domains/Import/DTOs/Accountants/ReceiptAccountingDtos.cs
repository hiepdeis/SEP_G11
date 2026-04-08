using Backend.Domains.Import.DTOs.Purchasing;
using Backend.Domains.Import.DTOs.Staff;

namespace Backend.Domains.Import.DTOs.Accountants
{
    public class AccountantReceiptSummaryDto
    {
        public long ReceiptId { get; set; }
        public string ReceiptCode { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? PurchaseOrderCode { get; set; }
        public string? SupplierName { get; set; }
        public decimal TotalValue { get; set; }
        public DateTime? StampedAt { get; set; }
    }

    public class AccountantReceiptDetailDto
    {
        public long ReceiptId { get; set; }
        public string ReceiptCode { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime? ReceiptDate { get; set; }
        public PurchaseOrderDto? PurchaseOrder { get; set; }
        public QCCheckDto? QCCheck { get; set; }
        public List<AccountantInventoryCurrentDto> InventoryCurrents { get; set; } = new();
        public List<WarehouseCardDto> WarehouseCards { get; set; } = new();
    }

    public class AccountantInventoryCurrentDto
    {
        public int WarehouseId { get; set; }
        public int MaterialId { get; set; }
        public string? MaterialName { get; set; }
        public int BinId { get; set; }
        public string? BinCode { get; set; }
        public int BatchId { get; set; }
        public string? BatchCode { get; set; }
        public decimal QuantityOnHand { get; set; }
        public DateTime? LastUpdated { get; set; }
    }

    public class AccountantReceiptCloseDto
    {
        public string? AccountingNote { get; set; }
    }

    public class AccountantReceiptCloseResultDto
    {
        public long ReceiptId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ClosedBy { get; set; }
        public DateTime? ClosedAt { get; set; }
        public AccountantReceiptCloseSummaryDto Summary { get; set; } = new();
    }

    public class AccountantReceiptCloseSummaryDto
    {
        public string? PurchaseOrderCode { get; set; }
        public string? SupplierName { get; set; }
        public int TotalItems { get; set; }
        public decimal TotalQuantity { get; set; }
        public List<string> BatchCodes { get; set; } = new();
        public decimal TotalValue { get; set; }
    }
}
