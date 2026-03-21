using Backend.Entities;

namespace Backend.Domains.Import.DTOs.Purchasing
{
    public static class PurchaseOrderMapper
    {
        public static PurchaseOrderDto ToDto(PurchaseOrder order)
        {
            return new PurchaseOrderDto
            {
                PurchaseOrderId = order.PurchaseOrderId,
                PurchaseOrderCode = order.PurchaseOrderCode,
                RequestId = order.RequestId,
                ProjectId = order.ProjectId,
                ProjectName = order.Project?.Name ?? string.Empty,
                SupplierId = order.SupplierId,
                SupplierName = order.Supplier?.Name ?? string.Empty,
                CreatedBy = order.CreatedBy,
                CreatedAt = order.CreatedAt,
                Status = order.Status,
                AccountantApprovedBy = order.AccountantApprovedBy,
                AccountantApprovedAt = order.AccountantApprovedAt,
                AdminApprovedBy = order.AdminApprovedBy,
                AdminApprovedAt = order.AdminApprovedAt,
                SentToSupplierAt = order.SentToSupplierAt,
                TotalAmount = order.TotalAmount,
                Items = order.Items.Select(i => new PurchaseOrderItemDto
                {
                    ItemId = i.ItemId,
                    MaterialId = i.MaterialId,
                    MaterialCode = i.Material?.Code ?? string.Empty,
                    MaterialName = i.Material?.Name ?? string.Empty,
                    OrderedQuantity = i.OrderedQuantity,
                    UnitPrice = i.UnitPrice,
                    LineTotal = i.LineTotal
                }).ToList()
            };
        }
    }
}
