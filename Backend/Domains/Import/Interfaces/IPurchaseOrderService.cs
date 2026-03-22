using Backend.Domains.Import.DTOs.Accountants;
using Backend.Domains.Import.DTOs.Purchasing;
using Backend.Entities;

namespace Backend.Domains.Import.Interfaces
{
    public interface IPurchaseOrderService
    {
        Task<List<PurchaseOrder>> CreateDraftsAsync(long requestId, int purchasingId, CreatePurchaseOrderDraftDto dto);
        Task<PurchaseOrder> CreateDraftAsync(long requestId, int purchasingId, int supplierId, List<PurchaseOrderItem> items);
        Task<List<PriceReviewItemDto>> ReviewPriceAsync(long purchaseOrderId);
        Task<PurchaseOrder> AccountantApproveAsync(long purchaseOrderId, int accountantId);
        Task<PurchaseOrder> AccountantRejectAsync(long purchaseOrderId, int accountantId, string reason);
        Task<PurchaseOrder> AdminApproveAsync(long purchaseOrderId, int adminId);
        Task<PurchaseOrder> AdminRejectAsync(long purchaseOrderId, int adminId, string reason);
        Task<PurchaseOrder> SendToSupplierAsync(long purchaseOrderId, int purchasingId);
        Task<PurchaseOrder> ConfirmDeliveryAsync(long purchaseOrderId, DateTime expectedDeliveryDate, string? supplierNote);
        Task<List<PurchaseOrder>> GetOrdersAsync();
        Task<PurchaseOrder?> GetOrderAsync(long purchaseOrderId);
    }
}