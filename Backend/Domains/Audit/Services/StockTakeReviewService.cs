using Backend.Data;
using Backend.Domains.Audit.DTOs.Managers;
using Backend.Domains.Audit.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Audit.Services
{
    public class StockTakeReviewService : IStockTakeReviewService
    {
        private readonly MyDbContext _db;
        private readonly IAuditNotificationService _notificationService;

        public StockTakeReviewService(
            MyDbContext db,
            IAuditNotificationService notificationService)
        {
            _db = db;
            _notificationService = notificationService;
        }

        private static string? NormalizeResolutionAction(string? action)
        {
            if (string.IsNullOrWhiteSpace(action)) return null;

            var value = action.Trim();
            if (value.Equals("Accept", StringComparison.OrdinalIgnoreCase))
                return "Accept";

            if (value.Equals("AdjustSystem", StringComparison.OrdinalIgnoreCase) ||
                value.Equals("Adjust", StringComparison.OrdinalIgnoreCase) ||
                value.Equals("Adjust_System", StringComparison.OrdinalIgnoreCase) ||
                value.Equals("Adjust-System", StringComparison.OrdinalIgnoreCase))
                return "AdjustSystem";

            if (value.Equals("Investigate", StringComparison.OrdinalIgnoreCase))
                return "Investigate";

            return null;
        }

        private static string DescribeResolutionAction(string? action)
        {
            return action switch
            {
                "Accept" => "chấp nhận chênh lệch",
                "AdjustSystem" => "điều chỉnh hệ thống",
                "Investigate" => "điều tra thêm",
                _ => "cập nhật xử lý"
            };
        }

        private IQueryable<Backend.Entities.InventoryCurrent> BuildScopedInventoryQuery(int stockTakeId, int warehouseId)
        {
            var scopedBinIds = _db.StockTakeBinLocations
                .AsNoTracking()
                .Where(x => x.StockTakeId == stockTakeId)
                .Select(x => x.BinId);

            return _db.InventoryCurrents
                .AsNoTracking()
                .Where(x => x.WarehouseId == warehouseId &&
                           (!scopedBinIds.Any() || scopedBinIds.Contains(x.BinId)));
        }

        private IQueryable<Backend.Entities.StockTakeDetail> BuildUnresolvedVarianceQuery(int stockTakeId)
        {
            return _db.StockTakeDetails
                .AsNoTracking()
                .Where(x =>
                    x.StockTakeId == stockTakeId &&
                    (
                        x.DiscrepancyStatus == "Discrepancy" ||
                        x.DiscrepancyStatus == "RecountRequested" ||
                        x.DiscrepancyStatus == "Recounted"
                    ));
        }

        private IQueryable<Backend.Entities.StockTakeDetail> BuildResolvedVarianceQuery(int stockTakeId)
        {
            return _db.StockTakeDetails
                .AsNoTracking()
                .Where(x =>
                    x.StockTakeId == stockTakeId &&
                    (
                        (
                            x.ResolutionAction != null &&
                            x.ResolutionAction != ""
                        ) ||
                        (
                            x.DiscrepancyStatus == "Matched" &&
                            x.CountRound > 1
                        )
                    ));
        }

        private IQueryable<Backend.Entities.StockTakeDetail> BuildVarianceQuery(int stockTakeId, bool? resolved)
        {
            if (resolved == true)
                return BuildResolvedVarianceQuery(stockTakeId);

            if (resolved == false)
                return BuildUnresolvedVarianceQuery(stockTakeId);

            return _db.StockTakeDetails
                .AsNoTracking()
                .Where(x =>
                    x.StockTakeId == stockTakeId &&
                    (
                        x.DiscrepancyStatus == "Discrepancy" ||
                        x.DiscrepancyStatus == "RecountRequested" ||
                        x.DiscrepancyStatus == "Recounted" ||
                        (
                            x.ResolutionAction != null &&
                            x.ResolutionAction != ""
                        ) ||
                        (
                            x.DiscrepancyStatus == "Matched" &&
                            x.CountRound > 1
                        )
                    ));
        }
        private async Task<int> UnlockActiveLocksAsync(
    int stockTakeId,
    int userId,
    CancellationToken ct)
        {
            var activeLocks = await _db.StockTakeLocks
                .Where(x => x.StockTakeId == stockTakeId && x.IsActive)
                .ToListAsync(ct);

            if (activeLocks.Count == 0)
                return 0;

            var now = DateTime.UtcNow;

            foreach (var item in activeLocks)
            {
                item.IsActive = false;
                item.UnlockedAt = now;
                item.UnlockedBy = userId;
            }

            return activeLocks.Count;
        }
        public async Task<(List<AuditListItemDto> items, int total)> GetAllAuditsAsync(
            int skip,
            int take,
            int? stockTakeId,
            string? status,
            int? warehouseId,
            DateTime? fromDate,
            DateTime? toDate,
            CancellationToken ct)
        {
            if (take <= 0) take = 50;
            if (take > 200) take = 200;
            if (skip < 0) skip = 0;

            var query = _db.StockTakes.AsNoTracking();

            if (stockTakeId.HasValue && stockTakeId > 0)
            {
                query = query.Where(x => x.StockTakeId == stockTakeId.Value);
            }

            // Filter by status
            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(x => x.Status == status);
            }

            // Filter by warehouse
            if (warehouseId.HasValue && warehouseId > 0)
            {
                query = query.Where(x => x.WarehouseId == warehouseId);
            }

            // Filter by date range (CreatedAt)
            if (fromDate.HasValue)
            {
                query = query.Where(x => x.CreatedAt >= fromDate);
            }

            if (toDate.HasValue)
            {
                var endOfDay = toDate.Value.AddDays(1);
                query = query.Where(x => x.CreatedAt < endOfDay);
            }

            var totalCount = await query.CountAsync(ct);

            var audits = await query
                .Include(x => x.CreatedByNavigation)
                .Include(x => x.Warehouse)
                .OrderByDescending(x => x.CreatedAt)
                .Skip(skip)
                .Take(take)
                .ToListAsync(ct);

            var items = new List<AuditListItemDto>();

            foreach (var st in audits)
            {
                // Get item counts in audit scope (bin-level or whole warehouse).
                var totalItems = await BuildScopedInventoryQuery(st.StockTakeId, st.WarehouseId)
                    .CountAsync(ct);

                var countedItems = await _db.StockTakeDetails
                    .AsNoTracking()
                    .CountAsync(x => x.StockTakeId == st.StockTakeId && x.CountQty != null, ct);

                var discrepancyItems = await _db.StockTakeDetails
                    .AsNoTracking()
                    .CountAsync(x =>
                        x.StockTakeId == st.StockTakeId &&
                        x.DiscrepancyStatus == "Discrepancy", ct);

                var unresolvedVarianceCount = await BuildUnresolvedVarianceQuery(st.StockTakeId)
                    .CountAsync(ct);

                var matchedItems = await _db.StockTakeDetails
                    .AsNoTracking()
                    .CountAsync(x =>
                        x.StockTakeId == st.StockTakeId &&
                        x.DiscrepancyStatus == "Matched", ct);

                var countingProgress = totalItems > 0 ? (countedItems * 100m / totalItems) : 0m;
                var matchRate = countedItems > 0 ? (matchedItems * 100m / countedItems) : 0m;

                var item = new AuditListItemDto
                {
                    StockTakeId = st.StockTakeId,
                    Title = st.Title,
                    Status = st.Status,
                    WarehouseId = st.WarehouseId,
                    WarehouseName = st.Warehouse?.Name,
                    CreatedAt = st.CreatedAt,
                    CreatedByName = st.CreatedByNavigation?.FullName,
                    PlannedStartDate = st.PlannedStartDate,
                    PlannedEndDate = st.PlannedEndDate,
                    CompletedAt = st.CompletedAt,
                    TotalItems = totalItems,
                    CountedItems = countedItems,
                    CountingProgress = Math.Round(countingProgress, 2),
                    DiscrepancyItems = discrepancyItems,
                    UnresolvedVariances = unresolvedVarianceCount,
                    MatchRate = Math.Round(matchRate, 2)
                };

                items.Add(item);
            }

            return (items, totalCount);
        }

        public async Task<AuditMetricsDto> GetMetricsAsync(int stockTakeId, CancellationToken ct)
        {
            var st = await _db.StockTakes
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                throw new ArgumentException("Audit not found.");

            // === Loại vật liệu (distinct MaterialId) ===
            var scopedInventoryQuery = BuildScopedInventoryQuery(stockTakeId, st.WarehouseId);

            var totalMaterials = await scopedInventoryQuery
                .Select(x => x.MaterialId)
                .Distinct()
                .CountAsync(ct);

            var countedMaterials = await _db.StockTakeDetails
                .AsNoTracking()
                .Where(x => x.StockTakeId == stockTakeId && x.CountQty != null)
                .Select(x => x.MaterialId)
                .Distinct()
                .CountAsync(ct);

            var uncountedMaterials = totalMaterials - countedMaterials;

            // === Số lượng items ===
            var totalItems = await scopedInventoryQuery.CountAsync(ct);

            var countedItems = await _db.StockTakeDetails
                .AsNoTracking()
                .CountAsync(x => x.StockTakeId == stockTakeId && x.CountQty != null, ct);

            var uncountedItems = totalItems - countedItems;

            // === Matched và Discrepancies ===
            var matchedItems = await _db.StockTakeDetails
                .AsNoTracking()
                .CountAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.DiscrepancyStatus == "Matched", ct);

            var discrepancyItems = await _db.StockTakeDetails
                .AsNoTracking()
                .CountAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.DiscrepancyStatus == "Discrepancy", ct);

            // === Tính Variance (chênh lệch) ===
            var varianceData = await _db.StockTakeDetails
                .AsNoTracking()
                .Where(x => x.StockTakeId == stockTakeId)
                .Select(x => new { x.SystemQty, x.CountQty })
                .ToListAsync(ct);

            decimal totalSystemQty = varianceData.Sum(x => x.SystemQty ?? 0m);
            decimal totalCountedQty = varianceData.Sum(x => x.CountQty ?? 0m);
            decimal totalVarianceQty = varianceData.Sum(x => Math.Abs((x.SystemQty ?? 0m) - (x.CountQty ?? 0m)));
            decimal variancePercentage = totalSystemQty > 0 ? (totalVarianceQty / totalSystemQty * 100m) : 0m;

            var matchRate = countedItems > 0 ? (matchedItems * 100m / countedItems) : 0m;
            var materialCountRate = totalMaterials > 0 ? (countedMaterials * 100m / totalMaterials) : 0m;

            return new AuditMetricsDto
            {
                StockTakeId = stockTakeId,
                Title = st.Title,
                Status = st.Status,

                // Loại vật liệu
                TotalMaterials = totalMaterials,
                CountedMaterials = countedMaterials,
                UncountedMaterials = uncountedMaterials,
                MaterialCountRate = Math.Round(materialCountRate, 2),

                // Số items
                TotalItems = totalItems,
                CountedItems = countedItems,
                UncountedItems = uncountedItems,
                MatchedItems = matchedItems,
                DiscrepancyItems = discrepancyItems,

                // Variance
                TotalSystemQty = Math.Round(totalSystemQty, 2),
                TotalCountedQty = Math.Round(totalCountedQty, 2),
                TotalVarianceQty = Math.Round(totalVarianceQty, 2),
                VariancePercentage = Math.Round(variancePercentage, 2),

                MatchRate = Math.Round(matchRate, 2)
            };
        }

        public async Task<(List<VarianceItemDto> items, int total, int unresolved)> GetVariancesAsync(
            int stockTakeId,
            int skip,
            int take,
            bool? resolved,
            CancellationToken ct)
        {
            var st = await _db.StockTakes
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                throw new ArgumentException("Audit not found.");

            if (take <= 0) take = 50;
            if (take > 200) take = 200;
            if (skip < 0) skip = 0;

            var query = BuildVarianceQuery(stockTakeId, resolved);
            var variances = await query
                .Include(x => x.Material)
                .Include(x => x.Bin)
                .Include(x => x.Batch)
                .Include(x => x.CountedByNavigation)
                .Include(x => x.ResolvedByNavigation)
                .Include(x => x.AdjustmentReason)
                .OrderByDescending(x => x.Id)
                .Skip(skip)
                .Take(take)
                .Select(d => new VarianceItemDto
                {
                    Id = d.Id,
                    MaterialId = d.MaterialId,
                    MaterialName = d.Material.Name,
                    BinId = d.BinId ?? 0,
                    BinCode = d.Bin != null ? d.Bin.Code : null,
                    BatchId = d.BatchId,
                    BatchCode = d.Batch != null ? d.Batch.BatchCode : null,
                    SystemQty = d.SystemQty,
                    CountQty = d.CountQty,
                    Variance = d.Variance,
                    DiscrepancyStatus = d.DiscrepancyStatus,
                    CountedBy = d.CountedBy,
                    CountedByName = d.CountedByNavigation != null ? d.CountedByNavigation.FullName : null,
                    CountedAt = d.CountedAt,
                    Reason = d.Reason,
                    ResolutionAction = d.ResolutionAction,
                    AdjustmentReasonId = d.AdjustmentReasonId,
                    AdjustmentReasonName = d.AdjustmentReason != null ? d.AdjustmentReason.Name : null,
                    ResolvedBy = d.ResolvedBy,
                    ResolvedByName = d.ResolvedByNavigation != null ? d.ResolvedByNavigation.FullName : null,
                    ResolvedAt = d.ResolvedAt
                })
                .ToListAsync(ct);

            var unresolvedCount = await BuildUnresolvedVarianceQuery(stockTakeId).CountAsync(ct);
            var totalCount = await query.CountAsync(ct);

            return (variances, totalCount, unresolvedCount);
        }

        public async Task<(List<VarianceItemDto> items, int total, int unresolved)> GetVarianceDetailsAsync(
            int stockTakeId,
            bool? resolved,
            CancellationToken ct)
        {
            var st = await _db.StockTakes
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                throw new ArgumentException("Audit not found.");

            var query = BuildVarianceQuery(stockTakeId, resolved);

            var variances = await query
                .Include(x => x.Material)
                .Include(x => x.Bin)
                .Include(x => x.Batch)
                .Include(x => x.CountedByNavigation)
                .Include(x => x.ResolvedByNavigation)
                .Include(x => x.AdjustmentReason)
                .OrderByDescending(x => x.Id)
                .Select(d => new VarianceItemDto
                {
                    Id = d.Id,
                    MaterialId = d.MaterialId,
                    MaterialName = d.Material.Name,
                    BinId = d.BinId ?? 0,
                    BinCode = d.Bin != null ? d.Bin.Code : null,
                    BatchId = d.BatchId,
                    BatchCode = d.Batch != null ? d.Batch.BatchCode : null,
                    SystemQty = d.SystemQty,
                    CountQty = d.CountQty,
                    Variance = d.Variance,
                    DiscrepancyStatus = d.DiscrepancyStatus,
                    CountedBy = d.CountedBy,
                    CountedByName = d.CountedByNavigation != null ? d.CountedByNavigation.FullName : null,
                    CountedAt = d.CountedAt,
                    Reason = d.Reason,
                    ResolutionAction = d.ResolutionAction,
                    AdjustmentReasonId = d.AdjustmentReasonId,
                    AdjustmentReasonName = d.AdjustmentReason != null ? d.AdjustmentReason.Name : null,
                    ResolvedBy = d.ResolvedBy,
                    ResolvedByName = d.ResolvedByNavigation != null ? d.ResolvedByNavigation.FullName : null,
                    ResolvedAt = d.ResolvedAt
                })
                .ToListAsync(ct);

            var unresolvedCount = await BuildUnresolvedVarianceQuery(stockTakeId).CountAsync(ct);
            var totalCount = await query.CountAsync(ct);

            return (variances, totalCount, unresolvedCount);
        }

        public async Task<VarianceItemDto?> GetVarianceDetailAsync(
            int stockTakeId,
            long detailId,
            CancellationToken ct)
        {
            var st = await _db.StockTakes
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                throw new ArgumentException("Audit not found.");

            var detail = await _db.StockTakeDetails
                .AsNoTracking()
                .Where(x => x.Id == detailId && x.StockTakeId == stockTakeId)
                .Include(x => x.Material)
                .Include(x => x.Bin)
                .Include(x => x.Batch)
                .Include(x => x.CountedByNavigation)
                .Include(x => x.ResolvedByNavigation)
                .Include(x => x.AdjustmentReason)
                .FirstOrDefaultAsync(ct);

            if (detail == null)
                return null;

            return new VarianceItemDto
            {
                Id = detail.Id,
                MaterialId = detail.MaterialId,
                MaterialName = detail.Material.Name,
                BinId = detail.BinId ?? 0,
                BinCode = detail.Bin != null ? detail.Bin.Code : null,
                BatchId = detail.BatchId,
                BatchCode = detail.Batch != null ? detail.Batch.BatchCode : null,
                SystemQty = detail.SystemQty,
                CountQty = detail.CountQty,
                Variance = detail.Variance,
                DiscrepancyStatus = detail.DiscrepancyStatus,
                CountedBy = detail.CountedBy,
                CountedByName = detail.CountedByNavigation != null ? detail.CountedByNavigation.FullName : null,
                CountedAt = detail.CountedAt,
                Reason = detail.Reason,
                ResolutionAction = detail.ResolutionAction,
                AdjustmentReasonId = detail.AdjustmentReasonId,
                AdjustmentReasonName = detail.AdjustmentReason != null ? detail.AdjustmentReason.Name : null,
                ResolvedBy = detail.ResolvedBy,
                ResolvedByName = detail.ResolvedByNavigation != null ? detail.ResolvedByNavigation.FullName : null,
                ResolvedAt = detail.ResolvedAt
            };
        }

        public async Task<(bool success, string message)> ResolveVarianceAsync(
            int stockTakeId,
            long detailId,
            ResolveVarianceRequest request,
            int resolvedByUserId,
            CancellationToken ct)
        {
            var detail = await _db.StockTakeDetails
                .FirstOrDefaultAsync(x =>
                    x.Id == detailId &&
                    x.StockTakeId == stockTakeId, ct);

            if (detail == null)
                return (false, "Variance detail not found.");

            // Verify audit is in a resolvable state
            var st = await _db.StockTakes
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                return (false, "Audit not found.");

            if (st.CompletedAt != null || string.Equals(st.Status, "Completed", StringComparison.OrdinalIgnoreCase))
                return (false, "Audit is already completed.");

            // Only allow resolution if status is InProgress or ReadyForReview
            if (!string.Equals(st.Status, "InProgress", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(st.Status, "ReadyForReview", StringComparison.OrdinalIgnoreCase))
                return (false, $"Audit cannot be modified in status '{st.Status}'.");

            var normalizedAction = NormalizeResolutionAction(request.ResolutionAction);
            if (normalizedAction == null)
                return (false, "ResolutionAction must be one of: Accept, AdjustSystem, Investigate.");

            if (normalizedAction == "AdjustSystem" && !request.AdjustmentReasonId.HasValue)
                return (false, "AdjustmentReasonId is required when ResolutionAction is AdjustSystem.");

            // Update resolution fields
            detail.ResolutionAction = normalizedAction;
            detail.AdjustmentReasonId = normalizedAction == "AdjustSystem"
                ? request.AdjustmentReasonId
                : null;
            detail.ResolvedBy = resolvedByUserId;
            detail.ResolvedAt = DateTime.UtcNow;

            await _notificationService.QueueAuditNotificationAsync(
                stockTakeId,
                $"Chênh lệch cho vật tư #{detail.MaterialId} trong Audit #{st.StockTakeId} ({st.Title}) đã được xử lý với phương án {DescribeResolutionAction(normalizedAction)}.",
                includeCreator: true,
                includeTeamMembers: false,
                roleNames: new[] { "Manager" },
                extraUserIds: detail.CountedBy.HasValue ? new[] { detail.CountedBy.Value } : null,
                excludeUserIds: new[] { resolvedByUserId },
                ct);

            await _db.SaveChangesAsync(ct);

            return (true, "Variance resolved successfully.");
        }

        public async Task<(bool success, string message)> UpdateVarianceReasonAsync(
            int stockTakeId,
            long detailId,
            UpdateVarianceReasonRequest request,
            CancellationToken ct)
        {
            var detail = await _db.StockTakeDetails
                .FirstOrDefaultAsync(x =>
                    x.Id == detailId &&
                    x.StockTakeId == stockTakeId, ct);

            if (detail == null)
                return (false, "Variance detail not found.");

            // Verify audit is in a modifiable state
            var st = await _db.StockTakes
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                return (false, "Audit not found.");

            if (st.CompletedAt != null || string.Equals(st.Status, "Completed", StringComparison.OrdinalIgnoreCase))
                return (false, "Audit is already completed.");

            // Allow reason update only if it's a discrepancy
            if (detail.DiscrepancyStatus != "Discrepancy")
                return (false, "Can only update reason for items with discrepancies.");

            // Update reason
            detail.Reason = request.Reason?.Trim();

            await _notificationService.QueueAuditNotificationAsync(
                stockTakeId,
                $"Lý do chênh lệch cho vật tư #{detail.MaterialId} trong Audit #{st.StockTakeId} ({st.Title}) đã được cập nhật.",
                includeCreator: true,
                includeTeamMembers: false,
                roleNames: new[] { "Manager" },
                extraUserIds: detail.CountedBy.HasValue ? new[] { detail.CountedBy.Value } : null,
                excludeUserIds: null,
                ct);

            await _db.SaveChangesAsync(ct);

            return (true, "Variance reason updated successfully.");
        }
        public async Task<(bool success, string message)> RequestRecountAsync(
     int stockTakeId,
     long detailId,
     RequestRecountRequest request,
     int managerUserId,
     CancellationToken ct)
        {
            var st = await _db.StockTakes
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                return (false, "Audit not found.");

            if (st.CompletedAt != null || string.Equals(st.Status, "Completed", StringComparison.OrdinalIgnoreCase))
                return (false, "Audit is already completed.");

            // Chỉ cho request recount khi audit vẫn đang lock và đang kiểm kê
            if (!string.Equals(st.Status, "InProgress", StringComparison.OrdinalIgnoreCase))
                return (false, $"Only audits in 'InProgress' status can request recount. Current status: '{st.Status}'.");

            var detail = await _db.StockTakeDetails
                .FirstOrDefaultAsync(x => x.Id == detailId && x.StockTakeId == stockTakeId, ct);

            if (detail == null)
                return (false, "Variance detail not found.");

            if (detail.CountQty == null)
                return (false, "This item has not been counted yet.");

            if ((detail.Variance ?? 0m) == 0m)
                return (false, "Only discrepancy items can be requested for recount.");

            if (string.Equals(detail.DiscrepancyStatus, "RecountRequested", StringComparison.OrdinalIgnoreCase))
                return (false, "This item has already been requested for recount.");

            if (!string.Equals(detail.DiscrepancyStatus, "Discrepancy", StringComparison.OrdinalIgnoreCase))
                return (false, "Only items with discrepancy status can be requested for recount.");

            var reason = await _db.AdjustmentReasons
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ReasonId == request.ReasonId && x.IsActive, ct);

            if (reason == null)
                return (false, "Invalid reason.");

            detail.DiscrepancyStatus = "RecountRequested";

            // KHÔNG set thành Recount nữa, vì query unresolved của ông đang coi
            // ResolutionAction != null là đã resolve
            detail.ResolutionAction = null;

            detail.AdjustmentReasonId = request.ReasonId;
            detail.Reason = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
            detail.ResolvedBy = managerUserId;
            detail.ResolvedAt = DateTime.UtcNow;

            await _notificationService.QueueAuditNotificationAsync(
                stockTakeId,
                $"Audit #{st.StockTakeId} ({st.Title}) có yêu cầu kiểm kê lại cho vật tư #{detail.MaterialId} tại bin #{detail.BinId ?? 0}.",
                includeCreator: true,
                includeTeamMembers: true,
                roleNames: new[] { "Manager" },
                extraUserIds: detail.CountedBy.HasValue ? new[] { detail.CountedBy.Value } : null,
                excludeUserIds: new[] { managerUserId },
                ct);

            await _db.SaveChangesAsync(ct);

            return (true, "Recount requested successfully.");
        }
        public async Task<StockTakeReviewDetailDto> GetReviewDetailAsync(int stockTakeId, CancellationToken ct)
        {
            var st = await _db.StockTakes
                .AsNoTracking()
                .Include(x => x.CreatedByNavigation)
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                throw new ArgumentException("Audit not found.");

            // Get warehouse info
            var warehouse = await _db.Warehouses
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.WarehouseId == st.WarehouseId, ct);

            // Get signatures
            var signatures = await _db.StockTakeSignatures
                .AsNoTracking()
                .Where(x => x.StockTakeId == stockTakeId)
                .Include(x => x.User)
                .Select(s => new SignatureInfoDto
                {
                    UserId = s.UserId,
                    FullName = s.User.FullName,
                    Role = s.Role,
                    SignedAt = s.SignedAt,
                    Notes = s.SignatureData
                })
                .ToListAsync(ct);

            // Get team members
            var teamMembers = await _db.StockTakeTeamMembers
                .AsNoTracking()
                .Where(x => x.StockTakeId == stockTakeId && x.IsActive)
                .Include(x => x.User)
                .Select(tm => new TeamMemberDto
                {
                    UserId = tm.UserId,
                    FullName = tm.User.FullName,
                    Email = tm.User.Email,
                    AssignedAt = tm.AssignedAt,
                    CompletedAt = tm.MemberCompletedAt,
                    IsActive = tm.IsActive
                })
                .OrderBy(x => x.FullName)
                .ToListAsync(ct);

            // Get metrics
            var scopedInventoryQuery = BuildScopedInventoryQuery(stockTakeId, st.WarehouseId);
            var totalItems = await scopedInventoryQuery.CountAsync(ct);

            var countedItems = await _db.StockTakeDetails
                .AsNoTracking()
                .CountAsync(x => x.StockTakeId == stockTakeId && x.CountQty != null, ct);

            var uncountedItems = totalItems - countedItems;

            var matchedItems = await _db.StockTakeDetails
                .AsNoTracking()
                .CountAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.DiscrepancyStatus == "Matched", ct);

            var discrepancyItems = await _db.StockTakeDetails
                .AsNoTracking()
                .CountAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.DiscrepancyStatus == "Discrepancy", ct);

            // Get materials
            var totalMaterials = await scopedInventoryQuery
                .Select(x => x.MaterialId)
                .Distinct()
                .CountAsync(ct);

            var countedMaterials = await _db.StockTakeDetails
                .AsNoTracking()
                .Where(x => x.StockTakeId == stockTakeId && x.CountQty != null)
                .Select(x => x.MaterialId)
                .Distinct()
                .CountAsync(ct);

            var uncountedMaterials = totalMaterials - countedMaterials;

            // Calculate variance
            var varianceData = await _db.StockTakeDetails
                .AsNoTracking()
                .Where(x => x.StockTakeId == stockTakeId)
                .Select(x => new { x.SystemQty, x.CountQty })
                .ToListAsync(ct);

            decimal totalSystemQty = varianceData.Sum(x => x.SystemQty ?? 0m);
            decimal totalCountedQty = varianceData.Sum(x => x.CountQty ?? 0m);
            decimal totalVarianceQty = varianceData.Sum(x => Math.Abs((x.SystemQty ?? 0m) - (x.CountQty ?? 0m)));
            decimal variancePercentage = totalSystemQty > 0 ? (totalVarianceQty / totalSystemQty * 100m) : 0m;

            var matchRate = countedItems > 0 ? (matchedItems * 100m / countedItems) : 0m;
            var materialCountRate = totalMaterials > 0 ? (countedMaterials * 100m / totalMaterials) : 0m;

            var metrics = new AuditMetricsDto
            {
                StockTakeId = stockTakeId,
                Title = st.Title,
                Status = st.Status,

                // Materials
                TotalMaterials = totalMaterials,
                CountedMaterials = countedMaterials,
                UncountedMaterials = uncountedMaterials,
                MaterialCountRate = Math.Round(materialCountRate, 2),

                // Items
                TotalItems = totalItems,
                CountedItems = countedItems,
                UncountedItems = uncountedItems,
                MatchedItems = matchedItems,
                DiscrepancyItems = discrepancyItems,

                // Variance
                TotalSystemQty = Math.Round(totalSystemQty, 2),
                TotalCountedQty = Math.Round(totalCountedQty, 2),
                TotalVarianceQty = Math.Round(totalVarianceQty, 2),
                VariancePercentage = Math.Round(variancePercentage, 2),

                MatchRate = Math.Round(matchRate, 2)
            };

            // Get variance summary
            var totalVariances = await BuildVarianceQuery(stockTakeId, null).CountAsync(ct);
            var resolvedVariances = await BuildResolvedVarianceQuery(stockTakeId).CountAsync(ct);
            var unresolvedVariances = await BuildUnresolvedVarianceQuery(stockTakeId).CountAsync(ct);
            var resolutionRate = totalVariances > 0 ? (resolvedVariances * 100m / totalVariances) : 0m;

            var varianceSummary = new VarianceSummaryDto
            {
                TotalVariances = totalVariances,
                ResolvedVariances = resolvedVariances,
                UnresolvedVariances = unresolvedVariances,
                ResolutionRate = Math.Round(resolutionRate, 2)
            };

            // Get locked by name if exists
            var latestLock = await _db.StockTakeLocks
    .AsNoTracking()
    .Where(x => x.StockTakeId == stockTakeId)
    .Include(x => x.LockedByNavigation)
    .OrderByDescending(x => x.LockedAt)
    .FirstOrDefaultAsync(ct);

            string? lockedByName = latestLock?.LockedByNavigation?.FullName;

            // Get completed by name if exists
            string? completedByName = null;
            if (st.CompletedBy.HasValue)
            {
                var completedByUser = await _db.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.UserId == st.CompletedBy, ct);
                completedByName = completedByUser?.FullName;
            }

            // Build timeline
            var timeline = new AuditTimelineDto
            {
                CreatedAt = st.CreatedAt,
                CreatedByName = st.CreatedByNavigation?.FullName,
                CheckDate = st.CheckDate,
                LockedAt = latestLock?.LockedAt,
                LockedByName = lockedByName,
                CompletedAt = st.CompletedAt,
                CompletedByName = completedByName
            };

            return new StockTakeReviewDetailDto
            {
                StockTakeId = st.StockTakeId,
                Title = st.Title,
                Status = st.Status,
                WarehouseId = st.WarehouseId,
                WarehouseName = warehouse?.Name,
                PlannedStartDate = st.PlannedStartDate,
                PlannedEndDate = st.PlannedEndDate,
                Notes = st.Notes,

                // Comprehensive data
                Metrics = metrics,
                VarianceSummary = varianceSummary,
                Timeline = timeline,
                TeamMembers = teamMembers,
                Signatures = signatures
            };
        }

        public async Task<(bool success, string message, SignatureInfoDto? signature)> SignOffAsync(
            int stockTakeId,
            int userId,
            SignOffRequest request,
            CancellationToken ct)
        {
            var st = await _db.StockTakes
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                return (false, "Audit not found.", null);

            if (st.CompletedAt != null || string.Equals(st.Status, "Completed", StringComparison.OrdinalIgnoreCase))
                return (false, "Audit is already completed.", null);

            if (!string.Equals(st.Status, "InProgress", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(st.Status, "ReadyForReview", StringComparison.OrdinalIgnoreCase))
            {
                return (false, $"Audit cannot be signed off in status '{st.Status}'.", null);
            }

            var existingSignature = await _db.StockTakeSignatures
                .FirstOrDefaultAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.UserId == userId, ct);

            if (existingSignature != null)
                return (false, "You have already signed off on this audit.", null);

            var user = await _db.Users
                .AsNoTracking()
                .Include(x => x.Role)
                .FirstOrDefaultAsync(x => x.UserId == userId, ct);

            if (user == null)
                return (false, "User not found.", null);

            var isAssignedStaff = await _db.StockTakeTeamMembers
                .AsNoTracking()
                .AnyAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.UserId == userId &&
                    (x.IsActive || x.MemberCompletedAt != null), ct);

            var isManager = string.Equals(user.Role.RoleName, "Manager", StringComparison.OrdinalIgnoreCase);
            var isStaff = string.Equals(user.Role.RoleName, "Staff", StringComparison.OrdinalIgnoreCase) && isAssignedStaff;

            if (!isManager && !isStaff)
                return (false, "Only assigned staff or managers can sign off this audit.", null);

            var role = isManager ? "Manager" : "Staff";

            var existingRoleSignature = await _db.StockTakeSignatures
                .AsNoTracking()
                .AnyAsync(x => x.StockTakeId == stockTakeId && x.Role == role, ct);

            if (existingRoleSignature)
                return (false, $"{role} has already signed off on this audit.", null);

            var pendingMembers = await _db.StockTakeTeamMembers
                .AsNoTracking()
                .CountAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.IsActive &&
                    x.MemberCompletedAt == null, ct);

            if (pendingMembers > 0)
                return (false, "All active audit members must finish their work before sign-off.", null);

            var totalItems = await BuildScopedInventoryQuery(stockTakeId, st.WarehouseId).CountAsync(ct);
            var countedItems = await _db.StockTakeDetails
                .AsNoTracking()
                .CountAsync(x => x.StockTakeId == stockTakeId && x.CountQty != null, ct);

            if (countedItems < totalItems)
                return (false, "All scoped inventory items must be counted before sign-off.", null);

            var hasPendingRecount = await _db.StockTakeDetails
                .AsNoTracking()
                .AnyAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.DiscrepancyStatus == "RecountRequested", ct);

            if (hasPendingRecount)
                return (false, "Cannot sign off while there are items waiting for recount.", null);

            var signature = new Backend.Entities.StockTakeSignature
            {
                StockTakeId = stockTakeId,
                UserId = userId,
                Role = role,
                SignedAt = DateTime.UtcNow,
                SignatureData = request.Notes?.Trim()
            };

            _db.StockTakeSignatures.Add(signature);

            var existingRoles = await _db.StockTakeSignatures
                .AsNoTracking()
                .Where(x => x.StockTakeId == stockTakeId)
                .Select(x => x.Role)
                .ToListAsync(ct);

            var hasStaffSignature = existingRoles.Contains("Staff") || role == "Staff";
            var hasManagerSignature = existingRoles.Contains("Manager") || role == "Manager";
            var movedToReadyForReview = false;

            if (hasStaffSignature && hasManagerSignature)
            {
                st.Status = "ReadyForReview";
                await UnlockActiveLocksAsync(stockTakeId, userId, ct);
                movedToReadyForReview = true;
            }

            var signerName = !string.IsNullOrWhiteSpace(user.FullName)
                ? user.FullName
                : user.Username;

            await _notificationService.QueueAuditNotificationAsync(
                stockTakeId,
                $"{signerName} ({role}) đã ký xác nhận Audit #{st.StockTakeId} ({st.Title}).",
                includeCreator: true,
                includeTeamMembers: true,
                roleNames: new[] { "Manager" },
                extraUserIds: null,
                excludeUserIds: new[] { userId },
                ct);

            if (movedToReadyForReview)
            {
                await _notificationService.QueueAuditNotificationAsync(
                    stockTakeId,
                    $"Audit #{st.StockTakeId} ({st.Title}) đã đủ chữ ký Staff và Manager, sẵn sàng hoàn tất.",
                    includeCreator: true,
                    includeTeamMembers: true,
                    roleNames: new[] { "Manager" },
                    extraUserIds: null,
                    excludeUserIds: null,
                    ct);
            }

            await _db.SaveChangesAsync(ct);

            var signatureDto = new SignatureInfoDto
            {
                UserId = signature.UserId,
                FullName = user.FullName,
                Role = role,
                SignedAt = signature.SignedAt,
                Notes = signature.SignatureData
            };

            return (true, "Signed off successfully", signatureDto);
        }

        public async Task<(bool success, string message)> CompleteAuditAsync(
      int stockTakeId,
      int managerId,
      CompleteAuditRequest request,
      CancellationToken ct)
        {
            var st = await _db.StockTakes
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                return (false, "Audit not found.");

            if (st.CompletedAt != null || string.Equals(st.Status, "Completed", StringComparison.OrdinalIgnoreCase))
                return (false, "Audit is already completed.");

            if (!string.Equals(st.Status, "ReadyForReview", StringComparison.OrdinalIgnoreCase))
                return (false, $"Audit must be in 'ReadyForReview' before completion. Current status: '{st.Status}'.");

            var managerUser = await _db.Users
                .AsNoTracking()
                .Include(x => x.Role)
                .FirstOrDefaultAsync(x => x.UserId == managerId, ct);

            if (managerUser == null || !string.Equals(managerUser.Role.RoleName, "Manager", StringComparison.OrdinalIgnoreCase))
                return (false, "Only managers can complete the audit.");

            var managerSignature = await _db.StockTakeSignatures
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.UserId == managerId &&
                    x.Role == "Manager", ct);

            if (managerSignature == null)
                return (false, "Manager must sign off before completing audit.");

            var hasStaffSignature = await _db.StockTakeSignatures
                .AsNoTracking()
                .AnyAsync(x => x.StockTakeId == stockTakeId && x.Role == "Staff", ct);

            if (!hasStaffSignature)
                return (false, "Staff must sign off before completing audit.");

            var unresolvedVariances = await _db.StockTakeDetails
                .AsNoTracking()
                .CountAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    (x.SystemQty ?? 0m) != (x.CountQty ?? 0m) &&
                    (
                        x.ResolutionAction == null ||
                        x.ResolvedBy == null ||
                        x.ResolvedAt == null
                    ), ct);

            if (unresolvedVariances > 0)
                return (false, $"{unresolvedVariances} variance(s) still need resolution.");

            var resolvedVariances = await _db.StockTakeDetails
                .Where(x =>
                    x.StockTakeId == stockTakeId &&
                    (x.SystemQty ?? 0m) != (x.CountQty ?? 0m) &&
                    x.ResolutionAction != null &&
                    x.ResolvedBy != null &&
                    x.ResolvedAt != null)
                .ToListAsync(ct);

            var postedAt = DateTime.UtcNow;
            var postedCount = 0;
            var skippedAlreadyPostedCount = 0;
            var skippedZeroDeltaCount = 0;

            foreach (var detail in resolvedVariances)
            {
                if (!detail.BinId.HasValue || !detail.BatchId.HasValue)
                    return (false, $"Invalid bin/batch data for variance detail {detail.Id}.");

                var alreadyPosted = await _db.InventoryAdjustmentEntries
                    .AsNoTracking()
                    .AnyAsync(x =>
                        x.StockTakeId == stockTakeId &&
                        x.StockTakeDetailId == detail.Id &&
                        x.Status == "Posted", ct);

                if (alreadyPosted)
                {
                    skippedAlreadyPostedCount++;
                    continue;
                }

                var inventory = await _db.InventoryCurrents
                    .FirstOrDefaultAsync(x =>
                        x.WarehouseId == st.WarehouseId &&
                        x.MaterialId == detail.MaterialId &&
                        x.BinId == detail.BinId.Value &&
                        x.BatchId == detail.BatchId.Value, ct);

                if (inventory == null)
                    return (false, $"Inventory row not found for variance detail {detail.Id}.");

                var currentQty = inventory.QuantityOnHand ?? 0m;
                var targetQty = detail.CountQty ?? 0m;
                var delta = targetQty - currentQty;
                if (delta == 0m)
                {
                    skippedZeroDeltaCount++;
                    continue;
                }

                inventory.QuantityOnHand = targetQty;
                inventory.LastUpdated = postedAt;

                var entry = new Backend.Entities.InventoryAdjustmentEntry
                {
                    StockTakeId = stockTakeId,
                    StockTakeDetailId = detail.Id,
                    WarehouseId = st.WarehouseId,
                    BinId = detail.BinId,
                    MaterialId = detail.MaterialId,
                    BatchId = detail.BatchId,
                    QtyDelta = delta,
                    ReasonId = detail.AdjustmentReasonId,
                    Status = "Posted",
                    CreatedAt = postedAt,
                    CreatedBy = detail.ResolvedBy ?? managerId,
                    ApprovedAt = postedAt,
                    ApprovedBy = managerId,
                    PostedAt = postedAt
                };

                _db.InventoryAdjustmentEntries.Add(entry);
                postedCount++;
            }

            st.Status = "Completed";
            st.CompletedAt = postedAt;
            st.CompletedBy = managerId;
            st.Notes = request.Notes?.Trim();

            await UnlockActiveLocksAsync(stockTakeId, managerId, ct);

            await _notificationService.QueueAuditNotificationAsync(
                stockTakeId,
                $"Audit #{st.StockTakeId} ({st.Title}) đã được hoàn tất. Số bút toán điều chỉnh đã ghi nhận: {postedCount}.",
                includeCreator: true,
                includeTeamMembers: true,
                roleNames: new[] { "Manager" },
                extraUserIds: null,
                excludeUserIds: new[] { managerId },
                ct);

            await _db.SaveChangesAsync(ct);

            return (true, $"Audit completed successfully. Resolved variance candidates: {resolvedVariances.Count}, posted: {postedCount}, already posted: {skippedAlreadyPostedCount}, zero-delta: {skippedZeroDeltaCount}.");
        }
    }
}
