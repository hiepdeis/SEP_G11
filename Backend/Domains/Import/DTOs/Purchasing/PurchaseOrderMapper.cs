using System.Collections.Generic;
using System.Linq;
using Backend.Entities;

namespace Backend.Domains.Import.DTOs.Purchasing
{
    public static class PurchaseOrderMapper
    {
        public static PurchaseOrderDto ToDto(PurchaseOrder order)
        {
            return ToDto(order, null);
        }

        public static PurchaseOrderDto ToDto(PurchaseOrder order, IReadOnlyDictionary<int, string>? userNames)
        {
            var rejectionReason = order.RejectionHistories
                .OrderByDescending(r => r.RejectedAt)
                .Select(r => r.RejectionReason)
                .FirstOrDefault();

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
                CreatedByName = GetUserName(userNames, order.CreatedBy),
                CreatedAt = order.CreatedAt,
                Status = order.Status,
                AccountantApprovedBy = order.AccountantApprovedBy,
                AccountantApprovedByName = GetUserName(userNames, order.AccountantApprovedBy),
                AccountantApprovedAt = order.AccountantApprovedAt,
                AdminApprovedBy = order.AdminApprovedBy,
                AdminApprovedByName = GetUserName(userNames, order.AdminApprovedBy),
                AdminApprovedAt = order.AdminApprovedAt,
                SentToSupplierAt = order.SentToSupplierAt,
                ExpectedDeliveryDate = order.ExpectedDeliveryDate,
                SupplierNote = order.SupplierNote,
                TotalAmount = order.TotalAmount,
                ParentPOId = order.ParentPOId,
                RevisionNumber = order.RevisionNumber,
                RevisionNote = order.RevisionNote,
                RejectionReason = rejectionReason,
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

        private static string? GetUserName(IReadOnlyDictionary<int, string>? userNames, int? userId)
        {
            if (!userId.HasValue || userNames == null)
                return null;

            return userNames.TryGetValue(userId.Value, out var name) ? name : null;
        }
    }
}
