using System;
using System.Linq;
using Backend.Domains.Import.DTOs.Accountants;
using Backend.Domains.Import.DTOs.Purchasing;
using Backend.Data;
using Backend.Domains.Import.Interfaces;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Backend.Domains.Import.Services
{
    public class PurchaseOrderService : IPurchaseOrderService
    {
        private readonly MyDbContext _context;
        private readonly ILogger<PurchaseOrderService> _logger;

        public PurchaseOrderService(MyDbContext context, ILogger<PurchaseOrderService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<PurchaseOrder>> CreateDraftsAsync(long requestId, int purchasingId, CreatePurchaseOrderDraftDto dto)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            if (dto.Items == null || dto.Items.Count == 0)
                throw new ArgumentException("Items list cannot be empty", nameof(dto.Items));

            var groupedItems = dto.Items
                .Select(i => new
                {
                    SupplierId = i.SupplierId ?? dto.SupplierId,
                    Item = i
                })
                .ToList();

            if (groupedItems.Any(x => !x.SupplierId.HasValue))
                throw new ArgumentException("SupplierId is required for all items.");

            PurchaseOrder? parentPo = null;
            if (dto.ParentPOId.HasValue)
            {
                if (groupedItems.Select(i => i.SupplierId!.Value).Distinct().Count() > 1)
                    throw new InvalidOperationException("Revision PO chi cho phep 1 nha cung cap");

                var supplierId = groupedItems.First().SupplierId!.Value;
                parentPo = await LoadParentPurchaseOrderForRevisionAsync(dto.ParentPOId.Value, requestId, supplierId);
            }

            await using var transaction = await _context.Database.BeginTransactionAsync();
            var orders = new List<PurchaseOrder>();

            try
            {
                foreach (var group in groupedItems.GroupBy(x => x.SupplierId!.Value))
                {
                    var items = group.Select(i => new PurchaseOrderItem
                    {
                        MaterialId = i.Item.MaterialId,
                        OrderedQuantity = i.Item.OrderedQuantity,
                        UnitPrice = i.Item.UnitPrice
                    }).ToList();

                    var order = await CreateDraftAsync(requestId, purchasingId, group.Key, items, parentPo, dto.RevisionNote);
                    orders.Add(order);
                }

                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            return orders;
        }

        public async Task<PurchaseOrder> CreateDraftAsync(
            long requestId,
            int purchasingId,
            int supplierId,
            List<PurchaseOrderItem> items,
            PurchaseOrder? parentPo = null,
            string? revisionNote = null)
        {
            if (items == null || items.Count == 0)
                throw new ArgumentException("Items list cannot be empty", nameof(items));

            var request = await _context.PurchaseRequests
                .FirstOrDefaultAsync(r => r.RequestId == requestId);

            if (request == null)
                throw new KeyNotFoundException($"PurchaseRequest with ID {requestId} not found");

            var supplier = await _context.Suppliers
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SupplierId == supplierId);

            if (supplier == null)
                throw new KeyNotFoundException($"Supplier with ID {supplierId} not found");

            var now = DateTime.UtcNow;
            var hasValidContract = await _context.SupplierContracts.AnyAsync(c =>
                c.SupplierId == supplierId &&
                c.Status == "Active" &&
                c.EffectiveFrom <= now &&
                (c.EffectiveTo == null || c.EffectiveTo >= now));

            if (!hasValidContract)
                throw new InvalidOperationException("Supplier contract is not valid or not active");

            var materialIds = items.Select(i => i.MaterialId).Distinct().ToList();

            var materialMap = await _context.Materials
                .Where(m => materialIds.Contains(m.MaterialId))
                .ToDictionaryAsync(m => m.MaterialId, m => m.Name);

            var activeQuotationMaterialIds = await _context.SupplierQuotations
                .Where(q => q.SupplierId == supplierId)
                .Where(q => q.IsActive == true)
                .Where(q => q.ValidFrom == null || q.ValidFrom <= now)
                .Where(q => q.ValidTo == null || q.ValidTo >= now)
                .Select(q => q.MaterialId)
                .Distinct()
                .ToListAsync();

            var activeQuotationSet = activeQuotationMaterialIds.ToHashSet();

            foreach (var item in items)
            {
                if (item.OrderedQuantity <= 0)
                    throw new ArgumentException("Item quantity must be greater than 0");

                if (!item.UnitPrice.HasValue || item.UnitPrice.Value <= 0)
                    throw new ArgumentException("UnitPrice must be greater than 0");

                if (!activeQuotationSet.Contains(item.MaterialId))
                {
                    var materialName = materialMap.TryGetValue(item.MaterialId, out var name)
                        ? name
                        : $"Material {item.MaterialId}";

                    throw new InvalidOperationException(
                        $"Không tìm thấy báo giá active của {supplier.Name} cho {materialName}");
                }
            }

            // Prevent duplicate drafts for the same request and supplier.
            var hasDraft = await _context.PurchaseOrders
                .Where(o => o.RequestId == requestId)
                .Where(o => o.SupplierId == supplierId)
                .Where(o => o.Status == "Draft")
                .AnyAsync();

            if (hasDraft)
                throw new InvalidOperationException(
                    $"Draft PO already exists for request {requestId} and supplier {supplierId}");

            if (parentPo != null)
            {
                var hasChildRevision = await _context.PurchaseOrders
                    .AnyAsync(o => o.ParentPOId == parentPo.PurchaseOrderId);

                if (hasChildRevision)
                    throw new InvalidOperationException("PO da co revision moi hon");
            }

            var poCode = await GeneratePurchaseOrderCodeAsync();

            var newItems = items.Select(i => new PurchaseOrderItem
            {
                MaterialId = i.MaterialId,
                SupplierId = supplierId,
                OrderedQuantity = i.OrderedQuantity,
                UnitPrice = i.UnitPrice,
                LineTotal = i.OrderedQuantity * (i.UnitPrice ?? 0)
            }).ToList();

            var totalAmount = newItems.Sum(i => i.LineTotal ?? 0);

            var purchaseOrder = new PurchaseOrder
            {
                PurchaseOrderCode = poCode,
                RequestId = requestId,
                ProjectId = request.ProjectId,
                SupplierId = supplierId,
                CreatedBy = purchasingId,
                CreatedAt = now,
                Status = "Draft",
                TotalAmount = totalAmount,
                ParentPOId = parentPo?.PurchaseOrderId,
                RevisionNumber = parentPo == null ? 1 : parentPo.RevisionNumber + 1,
                RevisionNote = revisionNote,
                Items = newItems
            };

            _context.PurchaseOrders.Add(purchaseOrder);

            request.Status = "DraftPO";

            await _context.SaveChangesAsync();

            return purchaseOrder;
        }

        public async Task<List<PurchaseOrder>> GetOrdersAsync()
        {
            var query = ActivePOsOnly(_context.PurchaseOrders)
                .Include(o => o.RejectionHistories)
                .Include(o => o.Project)
                .Include(o => o.Supplier)
                .Include(o => o.PurchaseRequest)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Material)
                .OrderByDescending(o => o.CreatedAt)
                .AsNoTracking()
                .ToListAsync();

            return await query;
        }

        public async Task<PurchaseOrder?> GetOrderAsync(long purchaseOrderId)
        {
            return await _context.PurchaseOrders
                .Include(o => o.RejectionHistories)
                .Include(o => o.Project)
                .Include(o => o.Supplier)
                .Include(o => o.PurchaseRequest)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Material)
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.PurchaseOrderId == purchaseOrderId);
        }

        public async Task<PurchaseOrder> AccountantApproveAsync(long purchaseOrderId, int accountantId)
        {
            var purchaseOrder = await LoadPurchaseOrderForUpdateAsync(purchaseOrderId);

            await EnsureLatestRevisionAsync(purchaseOrder.PurchaseOrderId);

            if (purchaseOrder.Status != "Draft")
                throw new InvalidOperationException(
                    $"Cannot approve PO {purchaseOrderId}. Current status: {purchaseOrder.Status}");

            if (purchaseOrder.Items.Count == 0)
                throw new InvalidOperationException("Cannot approve PO without items");

            var priceReview = await ReviewPriceAsync(purchaseOrderId);

            if (priceReview.Any(r => r.PoUnitPrice > r.QuotationPrice))
            {
                throw new InvalidOperationException("One or more items exceed the reference quotation price");
            }

            purchaseOrder.TotalAmount = purchaseOrder.Items.Sum(i => i.OrderedQuantity * (i.UnitPrice ?? 0));

            await EnsureBudgetAvailableAsync(purchaseOrder.ProjectId, purchaseOrder.TotalAmount ?? 0, purchaseOrder.PurchaseOrderId);

            purchaseOrder.Status = "AccountantApproved";
            purchaseOrder.AccountantApprovedBy = accountantId;
            purchaseOrder.AccountantApprovedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return purchaseOrder;
        }

        public async Task<PurchaseOrder> AccountantRejectAsync(long purchaseOrderId, int accountantId, string reason)
        {
            if (string.IsNullOrWhiteSpace(reason))
                throw new ArgumentException("Rejection reason is required", nameof(reason));

            var purchaseOrder = await LoadPurchaseOrderForUpdateAsync(purchaseOrderId);

            await EnsureLatestRevisionAsync(purchaseOrder.PurchaseOrderId);

            if (purchaseOrder.Status != "Draft")
                throw new InvalidOperationException(
                    $"Cannot reject PO {purchaseOrderId}. Current status: {purchaseOrder.Status}");

            purchaseOrder.Status = "AccountantRejected";
            purchaseOrder.AccountantApprovedBy = accountantId;
            purchaseOrder.AccountantApprovedAt = DateTime.UtcNow;

            var rejection = new ReceiptRejectionHistory
            {
                PurchaseOrderId = purchaseOrder.PurchaseOrderId,
                RejectedBy = accountantId,
                RejectedAt = DateTime.UtcNow,
                RejectionReason = reason
            };
            _context.ReceiptRejectionHistories.Add(rejection);
            purchaseOrder.RejectionHistories.Add(rejection);

            await _context.SaveChangesAsync();

            var message = $"PO {purchaseOrder.PurchaseOrderCode} bi ke toan tu choi: {reason}";
            await CreateRoleNotificationsAsync("Purchasing", message, "PurchaseOrder", purchaseOrder.PurchaseOrderId);

            return purchaseOrder;
        }

        public async Task<PurchaseOrder> AdminApproveAsync(long purchaseOrderId, int adminId)
        {
            var purchaseOrder = await LoadPurchaseOrderForUpdateAsync(purchaseOrderId);

            await EnsureLatestRevisionAsync(purchaseOrder.PurchaseOrderId);

            if (purchaseOrder.Status != "AccountantApproved")
                throw new InvalidOperationException(
                    $"Cannot approve PO {purchaseOrderId}. Current status: {purchaseOrder.Status}");

            purchaseOrder.Status = "AdminApproved";
            purchaseOrder.AdminApprovedBy = adminId;
            purchaseOrder.AdminApprovedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return purchaseOrder;
        }

        public async Task<PurchaseOrder> AdminRejectAsync(long purchaseOrderId, int adminId, string reason)
        {
            if (string.IsNullOrWhiteSpace(reason))
                throw new ArgumentException("Rejection reason is required", nameof(reason));

            var purchaseOrder = await LoadPurchaseOrderForUpdateAsync(purchaseOrderId);

            await EnsureLatestRevisionAsync(purchaseOrder.PurchaseOrderId);

            if (purchaseOrder.Status != "AccountantApproved")
                throw new InvalidOperationException(
                    $"Cannot reject PO {purchaseOrderId}. Current status: {purchaseOrder.Status}");

            purchaseOrder.Status = "AdminRejected";
            purchaseOrder.AdminApprovedBy = adminId;
            purchaseOrder.AdminApprovedAt = DateTime.UtcNow;


            var rejection = new ReceiptRejectionHistory
            {
                PurchaseOrderId = purchaseOrder.PurchaseOrderId,
                RejectedBy = adminId,
                RejectedAt = DateTime.UtcNow,
                RejectionReason = reason
            };
            _context.ReceiptRejectionHistories.Add(rejection);
            purchaseOrder.RejectionHistories.Add(rejection);

            await _context.SaveChangesAsync();

            var message = $"PO {purchaseOrder.PurchaseOrderCode} bi admin tu choi: {reason}";
            await CreateRoleNotificationsAsync("Purchasing", message, "PurchaseOrder", purchaseOrder.PurchaseOrderId);

            return purchaseOrder;
        }

        public async Task<List<PriceReviewItemDto>> ReviewPriceAsync(long purchaseOrderId)
        {
            var purchaseOrder = await _context.PurchaseOrders
                .Include(o => o.Items)
                    .ThenInclude(i => i.Material)
                .FirstOrDefaultAsync(o => o.PurchaseOrderId == purchaseOrderId);

            if (purchaseOrder == null)
                throw new KeyNotFoundException($"PurchaseOrder with ID {purchaseOrderId} not found");

            var referencePrices = await GetReferencePricesAsync(purchaseOrder.SupplierId);
            var results = new List<PriceReviewItemDto>();

            foreach (var item in purchaseOrder.Items)
            {
                if (!item.UnitPrice.HasValue || item.UnitPrice.Value <= 0)
                    throw new InvalidOperationException("UnitPrice must be greater than 0 for all items");

                if (!referencePrices.TryGetValue(item.MaterialId, out var referencePrice))
                    throw new InvalidOperationException(
                        $"No active quotation found for material {item.MaterialId} and supplier {purchaseOrder.SupplierId}");

                var variance = item.UnitPrice.Value - referencePrice;
                var variancePercent = referencePrice == 0
                    ? (decimal?)null
                    : variance / referencePrice * 100;

                results.Add(new PriceReviewItemDto
                {
                    MaterialName = item.Material?.Name ?? string.Empty,
                    PoUnitPrice = item.UnitPrice.Value,
                    QuotationPrice = referencePrice,
                    Variance = variance,
                    VariancePercent = variancePercent
                });
            }

            return results;
        }

        public async Task<long> GetLatestRevisionIdAsync(long purchaseOrderId)
        {
            var exists = await _context.PurchaseOrders
                .AnyAsync(p => p.PurchaseOrderId == purchaseOrderId);

            if (!exists)
                throw new KeyNotFoundException($"PurchaseOrder with ID {purchaseOrderId} not found");

            var currentId = purchaseOrderId;
            while (true)
            {
                var nextId = await _context.PurchaseOrders
                    .Where(p => p.ParentPOId == currentId)
                    .OrderByDescending(p => p.RevisionNumber)
                    .Select(p => (long?)p.PurchaseOrderId)
                    .FirstOrDefaultAsync();

                if (!nextId.HasValue)
                    return currentId;

                currentId = nextId.Value;
            }
        }

        public async Task<PurchaseOrder> SendToSupplierAsync(long purchaseOrderId, int purchasingId)
        {
            var purchaseOrder = await LoadPurchaseOrderForUpdateAsync(purchaseOrderId);

            await EnsureLatestRevisionAsync(purchaseOrder.PurchaseOrderId);

            if (purchaseOrder.Status != "AdminApproved")
                throw new InvalidOperationException(
                    $"Cannot send PO {purchaseOrderId}. Current status: {purchaseOrder.Status}");

            purchaseOrder.Status = "SentToSupplier";
            purchaseOrder.SentToSupplierAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "PO {PurchaseOrderId} sent to supplier by user {PurchasingId}",
                purchaseOrderId,
                purchasingId);

            return purchaseOrder;
        }

        public async Task<PurchaseOrder> ConfirmDeliveryAsync(long purchaseOrderId, DateTime expectedDeliveryDate, string? supplierNote)
        {
            if (expectedDeliveryDate == default)
                throw new ArgumentException("ExpectedDeliveryDate is required", nameof(expectedDeliveryDate));

            var purchaseOrder = await _context.PurchaseOrders
                .Include(o => o.Supplier)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Material)
                .FirstOrDefaultAsync(o => o.PurchaseOrderId == purchaseOrderId);

            if (purchaseOrder == null)
                throw new KeyNotFoundException($"PurchaseOrder with ID {purchaseOrderId} not found");

            if (purchaseOrder.Status != "SentToSupplier")
                throw new InvalidOperationException(
                    $"Cannot confirm delivery for PO {purchaseOrderId}. Current status: {purchaseOrder.Status}");

            purchaseOrder.ExpectedDeliveryDate = expectedDeliveryDate;
            purchaseOrder.SupplierNote = supplierNote;

            await _context.SaveChangesAsync();

            var supplierName = purchaseOrder.Supplier?.Name ?? "N/A";
            var itemSummary = string.Join(
                "; ",
                purchaseOrder.Items.Select(i =>
                {
                    var materialName = i.Material?.Name ?? $"Material {i.MaterialId}";
                    var unit = i.Material?.Unit ?? string.Empty;
                    return $"{materialName} — {i.OrderedQuantity} {unit}".Trim();
                }));

            var message =
                $"PO {purchaseOrder.PurchaseOrderCode} du kien ve luc {expectedDeliveryDate:yyyy-MM-dd HH:mm}. " +
                $"NCC: {supplierName}. Mat hang: {itemSummary}";

            await CreateRoleNotificationsAsync("Staff", message, "PurchaseOrder", purchaseOrder.PurchaseOrderId);
            await CreateRoleNotificationsAsync("Manager", message, "PurchaseOrder", purchaseOrder.PurchaseOrderId);

            return purchaseOrder;
        }

        public async Task<List<PurchaseOrderRevisionHistoryItemDto>> GetRevisionHistoryAsync(long purchaseOrderId)
        {
            var chain = await LoadRevisionChainAsync(purchaseOrderId);

            return chain
                .OrderBy(o => o.RevisionNumber)
                .Select(o =>
                {
                    var latestRejection = o.RejectionHistories
                        .OrderByDescending(r => r.RejectedAt)
                        .FirstOrDefault();

                    var rejectedBy = latestRejection?.Rejector?.FullName;
                    if (string.IsNullOrWhiteSpace(rejectedBy))
                        rejectedBy = latestRejection?.Rejector?.Username ?? string.Empty;

                    return new PurchaseOrderRevisionHistoryItemDto
                    {
                        PoId = o.PurchaseOrderId,
                        RevisionNumber = o.RevisionNumber,
                        Status = o.Status,
                        RejectedBy = rejectedBy ?? string.Empty,
                        RejectedAt = latestRejection?.RejectedAt,
                        RejectionReason = latestRejection?.RejectionReason,
                        TotalAmount = o.TotalAmount
                    };
                })
                .ToList();
        }

        public async Task<PurchaseOrderHistoryResponseDto> GetPurchaseOrderHistoryAsync(long requestId)
        {
            var request = await _context.PurchaseRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.RequestId == requestId);

            if (request == null)
                throw new KeyNotFoundException($"PurchaseRequest with ID {requestId} not found");

            var orders = await _context.PurchaseOrders
                .Include(o => o.Supplier)
                .Include(o => o.RejectionHistories)
                    .ThenInclude(r => r.Rejector)
                .Where(o => o.RequestId == requestId)
                .OrderBy(o => o.RevisionNumber)
                .ThenBy(o => o.CreatedAt)
                .AsNoTracking()
                .ToListAsync();

            var chain = orders.Select(o =>
            {
                var latestRejection = o.RejectionHistories
                    .OrderByDescending(r => r.RejectedAt)
                    .FirstOrDefault();

                return new PurchaseOrderHistoryItemDto
                {
                    PoId = o.PurchaseOrderId,
                    RevisionNumber = o.RevisionNumber,
                    SupplierName = o.Supplier?.Name ?? string.Empty,
                    TotalAmount = o.TotalAmount,
                    Status = o.Status,
                    RejectionReason = latestRejection?.RejectionReason,
                    RevisionNote = o.RevisionNote,
                    CreatedAt = o.CreatedAt
                };
            }).ToList();

            return new PurchaseOrderHistoryResponseDto
            {
                RequestId = requestId,
                PrStatus = request.Status,
                PoChain = chain
            };
        }

        private async Task<string> GeneratePurchaseOrderCodeAsync()
        {
            var today = DateTime.UtcNow;
            var prefix = $"PO{today:yyyyMMdd}";

            var count = await _context.PurchaseOrders
                .CountAsync(p => p.PurchaseOrderCode.StartsWith(prefix));

            return $"{prefix}-{(count + 1):D4}";
        }

        private async Task<PurchaseOrder> LoadPurchaseOrderForUpdateAsync(long purchaseOrderId)
        {
            var purchaseOrder = await _context.PurchaseOrders
                .Include(o => o.Items)
                .Include(o => o.PurchaseRequest)
                .FirstOrDefaultAsync(o => o.PurchaseOrderId == purchaseOrderId);

            if (purchaseOrder == null)
                throw new KeyNotFoundException($"PurchaseOrder with ID {purchaseOrderId} not found");

            return purchaseOrder;
        }

        private IQueryable<PurchaseOrder> ActivePOsOnly(IQueryable<PurchaseOrder> query)
        {
            var replacedIds = _context.PurchaseOrders
                .Where(p => p.ParentPOId != null)
                .Select(p => p.ParentPOId!.Value);

            return query.Where(p => !replacedIds.Contains(p.PurchaseOrderId));
        }

        private async Task EnsureLatestRevisionAsync(long purchaseOrderId)
        {
            var hasChild = await _context.PurchaseOrders
                .AnyAsync(o => o.ParentPOId == purchaseOrderId);

            if (hasChild)
                throw new InvalidOperationException("Chi PO revision moi nhat moi duoc xu ly");
        }

        private async Task<PurchaseOrder> LoadParentPurchaseOrderForRevisionAsync(long parentPoId, long requestId, int supplierId)
        {
            var parentPo = await _context.PurchaseOrders
                .FirstOrDefaultAsync(o => o.PurchaseOrderId == parentPoId);

            if (parentPo == null)
                throw new KeyNotFoundException($"PurchaseOrder with ID {parentPoId} not found");

            if (parentPo.Status != "AccountantRejected" && parentPo.Status != "AdminRejected")
                throw new InvalidOperationException("Chi tao revision tu PO da bi reject");

            if (parentPo.RequestId != requestId)
                throw new InvalidOperationException("Parent PO khong cung PR voi requestId");

            // if (parentPo.SupplierId != supplierId)
            //     throw new InvalidOperationException("Parent PO khong cung nha cung cap");

            return parentPo;
        }

        private async Task<List<PurchaseOrder>> LoadRevisionChainAsync(long purchaseOrderId)
        {
            var chain = new List<PurchaseOrder>();

            var current = await _context.PurchaseOrders
                .Include(o => o.RejectionHistories)
                    .ThenInclude(r => r.Rejector)
                .FirstOrDefaultAsync(o => o.PurchaseOrderId == purchaseOrderId);

            if (current == null)
                throw new KeyNotFoundException($"PurchaseOrder with ID {purchaseOrderId} not found");

            while (current != null)
            {
                chain.Add(current);

                if (!current.ParentPOId.HasValue)
                    break;

                current = await _context.PurchaseOrders
                    .Include(o => o.RejectionHistories)
                        .ThenInclude(r => r.Rejector)
                    .FirstOrDefaultAsync(o => o.PurchaseOrderId == current.ParentPOId.Value);
            }

            return chain;
        }

        private async Task<Dictionary<int, decimal>> GetReferencePricesAsync(int supplierId)
        {
            var now = DateTime.UtcNow;

            return await _context.SupplierQuotations
                .Where(q => q.SupplierId == supplierId)
                .Where(q => q.IsActive == true)
                .Where(q => q.ValidFrom == null || q.ValidFrom <= now)
                .Where(q => q.ValidTo == null || q.ValidTo >= now)
                .GroupBy(q => q.MaterialId)
                .Select(g => new
                {
                    MaterialId = g.Key,
                    Price = g.OrderByDescending(q => q.ValidFrom ?? DateTime.MinValue).First().Price
                })
                .ToDictionaryAsync(x => x.MaterialId, x => x.Price);
        }

        private async Task EnsureBudgetAvailableAsync(int projectId, decimal currentPoAmount, long purchaseOrderId)
        {
            var project = await _context.Projects
                .FirstOrDefaultAsync(p => p.ProjectId == projectId);

            if (project == null)
                throw new KeyNotFoundException($"Project with ID {projectId} not found");

            if (!project.Budget.HasValue)
                throw new InvalidOperationException("Project budget is not set");

            var countedStatuses = new[]
            {
                "AccountantApproved",
                "AdminApproved",
                "SentToSupplier",
                "GoodsReceived",
                "FullyReceived",
                "PartiallyReceived",
                "OverReceived"
            };

            var approvedTotal = await _context.PurchaseOrders
                .Where(p => p.ProjectId == projectId)
                .Where(p => p.PurchaseOrderId != purchaseOrderId)
                .Where(p => countedStatuses.Contains(p.Status))
                .SumAsync(p => p.TotalAmount ?? 0);

            var remaining = project.Budget.Value - approvedTotal;
            if (currentPoAmount > remaining)
                throw new InvalidOperationException(
                    $"Project budget exceeded. Remaining: {remaining}, current PO: {currentPoAmount}");
        }

        private async Task<List<int>> GetUserIdsByRoleAsync(string roleName)
        {
            return await _context.Users
                .Where(u => u.Role.RoleName == roleName)
                .Select(u => u.UserId)
                .ToListAsync();
        }

        private async Task CreateRoleNotificationsAsync(string roleName, string message, string entityType, long? entityId)
        {
            var userIds = await GetUserIdsByRoleAsync(roleName);
            if (userIds.Count == 0)
                return;

            var now = DateTime.UtcNow;
            foreach (var userId in userIds)
            {
                _context.Notifications.Add(new Notification
                {
                    UserId = userId,
                    Message = message,
                    RelatedEntityType = entityType,
                    RelatedEntityId = entityId,
                    IsRead = false,
                    CreatedAt = now
                });
            }

            await _context.SaveChangesAsync();
        }
    }
}