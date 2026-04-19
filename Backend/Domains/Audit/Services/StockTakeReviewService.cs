using Backend.Data;
using Backend.Domains.Audit.DTOs.Managers;
using Backend.Domains.Audit.Interfaces;
using Backend.Entities;
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
        private static DateTime? ToUtc(DateTime? dt) => dt.HasValue ? DateTime.SpecifyKind(dt.Value, DateTimeKind.Utc) : null;
        private static DateTime ToUtc(DateTime dt) => DateTime.SpecifyKind(dt, DateTimeKind.Utc);

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
                        (x.DiscrepancyStatus == "Discrepancy" || x.DiscrepancyStatus == "Recounted"), ct);

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
                    CreatedAt = ToUtc(st.CreatedAt),
                    CreatedByName = st.CreatedByNavigation?.FullName,
                    PlannedStartDate = ToUtc(st.PlannedStartDate),
                    PlannedEndDate = ToUtc(st.PlannedEndDate),
                    CompletedAt = ToUtc(st.CompletedAt),
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
            var data = await query
                .Include(x => x.Material)
                .Include(x => x.Bin)
                .Include(x => x.Batch)
                .Include(x => x.CountedByNavigation)
                .Include(x => x.ResolvedByNavigation)
                .Include(x => x.AdjustmentReason)
                .OrderByDescending(x => x.Id)
                .Skip(skip)
                .Take(take)
                .ToListAsync(ct);

            var variances = data.Select(d => new VarianceItemDto
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
                CountRound = d.CountRound,
                CountedBy = d.CountedBy,
                CountedByName = d.CountedByNavigation != null ? d.CountedByNavigation.FullName : null,
                CountedAt = ToUtc(d.CountedAt),
                Reason = d.Reason,
                ResolutionAction = d.ResolutionAction,
                AdjustmentReasonId = d.AdjustmentReasonId,
                AdjustmentReasonName = d.AdjustmentReason != null ? d.AdjustmentReason.Name : null,
                ResolvedBy = d.ResolvedBy,
                ResolvedByName = d.ResolvedByNavigation != null ? d.ResolvedByNavigation.FullName : null,
                ResolvedAt = ToUtc(d.ResolvedAt),
                UnitPrice = d.Material.UnitPrice ?? 0m
            }).ToList();

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

            var data = await query
                .Include(x => x.Material)
                .Include(x => x.Bin)
                .Include(x => x.Batch)
                .Include(x => x.CountedByNavigation)
                .Include(x => x.ResolvedByNavigation)
                .Include(x => x.AdjustmentReason)
                .OrderByDescending(x => x.Id)
                .ToListAsync(ct);

            var variances = data.Select(d => new VarianceItemDto
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
                CountedAt = ToUtc(d.CountedAt),
                Reason = d.Reason,
                ResolutionAction = d.ResolutionAction,
                AdjustmentReasonId = d.AdjustmentReasonId,
                AdjustmentReasonName = d.AdjustmentReason != null ? d.AdjustmentReason.Name : null,
                ResolvedBy = d.ResolvedBy,
                ResolvedByName = d.ResolvedByNavigation != null ? d.ResolvedByNavigation.FullName : null,
                ResolvedAt = ToUtc(d.ResolvedAt),
                UnitPrice = d.Material.UnitPrice ?? 0m
            }).ToList();

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
                CountRound = detail.CountRound,
                CountedBy = detail.CountedBy,
                CountedByName = detail.CountedByNavigation != null ? detail.CountedByNavigation.FullName : null,
                CountedAt = ToUtc(detail.CountedAt),
                Reason = detail.Reason,
                ResolutionAction = detail.ResolutionAction,
                AdjustmentReasonId = detail.AdjustmentReasonId,
                AdjustmentReasonName = detail.AdjustmentReason != null ? detail.AdjustmentReason.Name : null,
                ResolvedBy = detail.ResolvedBy,
                ResolvedByName = detail.ResolvedByNavigation != null ? detail.ResolvedByNavigation.FullName : null,
                ResolvedAt = ToUtc(detail.ResolvedAt),
                UnitPrice = detail.Material.UnitPrice ?? 0m
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

            // Only allow resolution if status is PendingManagerReview (new flow)
            if (!string.Equals(st.Status, "PendingManagerReview", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(st.Status, "InProgress", StringComparison.OrdinalIgnoreCase))
                return (false, $"Audit cannot be modified in status '{st.Status}'. Must be PendingManagerReview.");

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

            // Save manager notes
            if (!string.IsNullOrWhiteSpace(request.Notes))
                detail.Reason = request.Notes.Trim();

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

        public async Task<(bool success, string message)> ManagerConfirmResolutionAsync(
            int stockTakeId,
            int managerUserId,
            string? signatureData,
            CancellationToken ct)
        {
            var st = await _db.StockTakes
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                return (false, "Audit not found.");

            if (!string.Equals(st.Status, "PendingManagerReview", StringComparison.OrdinalIgnoreCase))
                return (false, $"Audit must be in 'PendingManagerReview' status. Current: '{st.Status}'.");

            // Check all discrepancy items are resolved
            var remainingUnresolved = await _db.StockTakeDetails
                .AsNoTracking()
                .CountAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    (x.SystemQty ?? 0m) != (x.CountQty ?? 0m) &&
                    (
                        x.ResolutionAction == null ||
                        x.ResolvedBy == null ||
                        x.ResolvedAt == null
                    ), ct);

            if (remainingUnresolved > 0)
                return (false, $"There are still {remainingUnresolved} unresolved discrepancy items.");

            if (string.IsNullOrWhiteSpace(signatureData))
                return (false, "Manager signature is required.");

            // Save Manager signature
            await AddSignatureIfNotExistsAsync(stockTakeId, managerUserId, "Manager", signatureData, ct);

            // Transition to PendingAccountantApproval
            st.Status = "PendingAccountantApproval";

            await _notificationService.QueueAuditNotificationAsync(
                stockTakeId,
                $"Manager đã xử lý xong tất cả chênh lệch cho Audit #{st.StockTakeId} ({st.Title}). Chờ Kế toán duyệt.",
                includeCreator: true,
                includeTeamMembers: false,
                roleNames: new[] { "Accountant" },
                extraUserIds: null,
                excludeUserIds: new[] { managerUserId },
                ct);

            await _db.SaveChangesAsync(ct);

            return (true, "All resolutions confirmed. Awaiting accountant approval.");
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

            // Only allow recount when in PendingManagerReview
            if (!string.Equals(st.Status, "PendingManagerReview", StringComparison.OrdinalIgnoreCase))
                return (false, $"Only audits in 'PendingManagerReview' status can request recount. Current status: '{st.Status}'.");

            var detail = await _db.StockTakeDetails
                .FirstOrDefaultAsync(x => x.Id == detailId && x.StockTakeId == stockTakeId, ct);

            if (detail == null)
                return (false, "Variance detail not found.");

            if (detail.CountQty == null)
                return (false, "This item has not been counted yet.");

            if ((detail.Variance ?? 0m) == 0m)
                return (false, "Only discrepancy items can be requested for recount.");

            // Only allow recount on Round 1 (first count)
            if (detail.CountRound > 1)
                return (false, "Recount is only allowed for the first count round. For round 2+, please resolve the variance instead.");

            if (string.Equals(detail.DiscrepancyStatus, "RecountRequested", StringComparison.OrdinalIgnoreCase))
                return (false, "This item has already been requested for recount.");

            if (!string.Equals(detail.DiscrepancyStatus, "Discrepancy", StringComparison.OrdinalIgnoreCase))
                return (false, "Only items with discrepancy status can be requested for recount.");

            if (request.ReasonId > 0)
            {
                var reason = await _db.AdjustmentReasons
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.ReasonId == request.ReasonId && x.IsActive, ct);

                if (reason == null)
                    return (false, "Invalid reason.");
            }

            // 1. Identify all materials in the audit scope (InventoryCurrent matching warehouse and assigned bins)
            var assignedBinIds = await _db.StockTakeBinLocations
                .Where(x => x.StockTakeId == stockTakeId)
                .Select(x => x.BinId)
                .ToListAsync(ct);

            var query = _db.InventoryCurrents.Where(x => x.WarehouseId == st.WarehouseId);
            if (assignedBinIds.Any())
            {
                query = query.Where(x => assignedBinIds.Contains(x.BinId));
            }

            var scopedInventory = await query.ToListAsync(ct);

            // 2. Load all existing details
            var existingDetails = await _db.StockTakeDetails
                .Where(x => x.StockTakeId == stockTakeId)
                .ToListAsync(ct);

            // 3. Ensure every inventory item has a StockTakeDetail and reset it
            foreach (var inv in scopedInventory)
            {
                var d = existingDetails.FirstOrDefault(x => 
                    x.MaterialId == inv.MaterialId && 
                    x.BinId == inv.BinId && 
                    x.BatchId == inv.BatchId);

                if (d == null)
                {
                    d = new StockTakeDetail
                    {
                        StockTakeId = stockTakeId,
                        MaterialId = inv.MaterialId,
                        BinId = inv.BinId,
                        BatchId = inv.BatchId,
                        SystemQty = inv.QuantityOnHand ?? 0m,
                        CountQty = null,
                        CountRound = 1,
                        DiscrepancyStatus = "RecountRequested",
                        Reason = "Missing from Round 1 count",
                        AdjustmentReasonId = request.ReasonId > 0 ? request.ReasonId : null,
                        ResolvedBy = managerUserId,
                        ResolvedAt = DateTime.UtcNow
                    };
                    _db.StockTakeDetails.Add(d);
                }
                else
                {
                    d.DiscrepancyStatus = "RecountRequested";
                    d.CountQty = null;
                    d.CountedBy = null;
                    d.CountedAt = null;
                    d.ResolutionAction = null;
                    d.AdjustmentReasonId = request.ReasonId > 0 ? request.ReasonId : null;
                    d.Reason = d.Id == detailId ? request.Note : "Required full scope recount";
                    d.ResolvedBy = managerUserId;
                    d.ResolvedAt = DateTime.UtcNow;
                }
            }

            foreach (var d in existingDetails)
            {
                if (d.DiscrepancyStatus != "RecountRequested")
                {
                    d.DiscrepancyStatus = "RecountRequested";
                    d.CountQty = null;
                    d.CountedBy = null;
                    d.CountedAt = null;
                    d.ResolutionAction = null;
                    d.AdjustmentReasonId = request.ReasonId > 0 ? request.ReasonId : null;
                    d.Reason = d.Id == detailId ? request.Note : "Required full scope recount";
                    d.ResolvedBy = managerUserId;
                    d.ResolvedAt = DateTime.UtcNow;
                }
            }

            // Reset audit status to "InProgress" to allow staff to work again
            st.Status = "InProgress";
            st.CompletedAt = null;

            // Unlock any existing locks to clean up the state
            await UnlockActiveLocksAsync(stockTakeId, managerUserId, ct);

            // Reset MemberCompletedAt for ALL active members (round 2 starts)
            var mems = await _db.StockTakeTeamMembers
                .Where(x => x.StockTakeId == stockTakeId)
                .ToListAsync(ct);

            foreach (var m in mems)
            {
                m.MemberCompletedAt = null;
            }

            // Remove previous staff signatures (per user request to redo verification)
            var oldSignatures = await _db.StockTakeSignatures
                .Where(x => x.StockTakeId == stockTakeId)
                .ToListAsync(ct);
            _db.StockTakeSignatures.RemoveRange(oldSignatures);

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

            // Transition status back to InProgress so staff can do the recount
            st.Status = "InProgress";
            await _db.SaveChangesAsync(ct);

            return (true, "Recount requested successfully. Audit is back to InProgress.");
        }

        public async Task<(bool success, string message)> RequestRecountAllAsync(
            int stockTakeId,
            RequestRecountRequest request,
            int managerUserId,
            CancellationToken ct)
        {
            var st = await _db.StockTakes
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                return (false, "Audit not found.");

            if (!string.Equals(st.Status, "PendingManagerReview", StringComparison.OrdinalIgnoreCase))
                return (false, $"Only audits in 'PendingManagerReview' status can request recount. Current status: '{st.Status}'.");

            // Find the first eligible item: Discrepancy status, round 1, has been counted
            var firstEligible = await _db.StockTakeDetails
                .FirstOrDefaultAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.DiscrepancyStatus == "Discrepancy" &&
                    x.CountRound <= 1 &&
                    x.CountQty != null &&
                    (x.Variance ?? 0m) != 0m, ct);

            if (firstEligible == null)
                return (false, "No eligible pending discrepancy items found for recount.");

            // Delegate to existing full-scope recount logic
            return await RequestRecountAsync(stockTakeId, firstEligible.Id, request, managerUserId, ct);
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
                    SignedAt = ToUtc(s.SignedAt),
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
                    AssignedAt = ToUtc(tm.AssignedAt),
                    CompletedAt = ToUtc(tm.MemberCompletedAt),
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
                    (x.DiscrepancyStatus == "Discrepancy" || x.DiscrepancyStatus == "Recounted"), ct);

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
                CreatedAt = ToUtc(st.CreatedAt),
                CreatedByName = st.CreatedByNavigation?.FullName,
                CheckDate = ToUtc(st.CheckDate),
                LockedAt = ToUtc(latestLock?.LockedAt),
                LockedByName = lockedByName,
                CompletedAt = ToUtc(st.CompletedAt),
                CompletedByName = completedByName
            };

            // Get penalty info if exists
            var penaltyEntity = await _db.AuditPenalties
                .AsNoTracking()
                .Where(x => x.StockTakeId == stockTakeId)
                .Include(x => x.IssuedByUser)
                .Include(x => x.TargetUser)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync(ct);

            PenaltyInfoDto? penalty = null;
            if (penaltyEntity != null)
            {
                penalty = new PenaltyInfoDto
                {
                    PenaltyId = penaltyEntity.PenaltyId,
                    Reason = penaltyEntity.Reason,
                    Amount = penaltyEntity.Amount,
                    Notes = penaltyEntity.Notes,
                    IssuedByUserId = penaltyEntity.IssuedByUserId,
                    IssuedByName = penaltyEntity.IssuedByUser?.FullName,
                    TargetUserId = penaltyEntity.TargetUserId,
                    TargetUserName = penaltyEntity.TargetUser?.FullName,
                    CreatedAt = ToUtc(penaltyEntity.CreatedAt)
                };
            }

            return new StockTakeReviewDetailDto
            {
                StockTakeId = st.StockTakeId,
                Title = st.Title,
                Status = st.Status,
                WarehouseId = st.WarehouseId,
                WarehouseName = warehouse?.Name,
                PlannedStartDate = ToUtc(st.PlannedStartDate),
                PlannedEndDate = ToUtc(st.PlannedEndDate),
                Notes = st.Notes,

                // Comprehensive data
                Metrics = metrics,
                VarianceSummary = varianceSummary,
                Timeline = timeline,
                TeamMembers = teamMembers,
                Signatures = signatures,
                Penalty = penalty
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

            var user = await _db.Users
                .AsNoTracking()
                .Include(x => x.Role)
                .FirstOrDefaultAsync(x => x.UserId == userId, ct);

            if (user == null)
                return (false, "User not found.", null);

            var isStaff = string.Equals(user.Role.RoleName, "Staff", StringComparison.OrdinalIgnoreCase);

            if (!isStaff)
                return (false, "Only staff can use the sign-off flow. Use the dedicated workflow actions instead.", null);

            // Staff sign-off: check they are assigned
            var currentMember = await _db.StockTakeTeamMembers
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId && x.UserId == userId, ct);

            if (currentMember == null || (!currentMember.IsActive && currentMember.MemberCompletedAt == null))
                return (false, "You are not assigned to this audit.", null);

            // Auto-mark as finished if not already done (convenience for integrated flow)
            if (currentMember.MemberCompletedAt == null)
            {
                currentMember.MemberCompletedAt = DateTime.UtcNow;
            }

            var existingSignature = await _db.StockTakeSignatures
                .FirstOrDefaultAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.UserId == userId, ct);

            if (existingSignature != null)
                return (false, "You have already signed off on this audit.", null);

            // Verification: All items must be counted before ANYONE can sign off
            // (Standard procedure to ensure the record being signed is complete)
            var totalItems = await BuildScopedInventoryQuery(stockTakeId, st.WarehouseId).CountAsync(ct);
            var countedItems = await _db.StockTakeDetails
                .AsNoTracking()
                .CountAsync(x => x.StockTakeId == stockTakeId && x.CountQty != null, ct);

            if (countedItems < totalItems)
                return (false, "All items must be counted before signing off.", null);

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
                Role = "Staff",
                SignedAt = DateTime.UtcNow,
                SignatureData = request.Notes?.Trim()
            };

            _db.StockTakeSignatures.Add(signature);

            // One representative staff signature is enough → transition immediately
            st.Status = "PendingAccountantReview";
            await UnlockActiveLocksAsync(stockTakeId, userId, ct);

            await _notificationService.QueueAuditNotificationAsync(
                stockTakeId,
                $"Đội ngũ kiểm kê đã ký xác nhận hoàn tất Audit #{st.StockTakeId} ({st.Title}). Chờ Kế toán kiểm tra.",
                includeCreator: true,
                includeTeamMembers: false,
                roleNames: new[] { "Accountant" },
                extraUserIds: null,
                excludeUserIds: null,
                ct: ct);

            await _db.SaveChangesAsync(ct);

            var signerName = !string.IsNullOrWhiteSpace(user.FullName) ? user.FullName : user.Username;

            await _notificationService.QueueAuditNotificationAsync(
                stockTakeId,
                $"{signerName} (Staff) đã ký xác nhận Audit #{st.StockTakeId} ({st.Title}). Chờ Kế toán kiểm tra.",
                includeCreator: true,
                includeTeamMembers: true,
                roleNames: new[] { "Accountant" },
                extraUserIds: null,
                excludeUserIds: new[] { userId },
                ct);

            await _db.SaveChangesAsync(ct);

            var signatureDto = new SignatureInfoDto
            {
                UserId = signature.UserId,
                FullName = user.FullName,
                Role = "Staff",
                SignedAt = signature.SignedAt,
                Notes = signature.SignatureData
            };

            return (true, "Signed off successfully. Audit is now pending Accountant review.", signatureDto);
        }

        // ===== NEW WORKFLOW METHODS =====

        public async Task<(bool success, string message)> AccountantReviewAsync(
            int stockTakeId,
            int userId,
            string action,
            string? signatureData,
            CancellationToken ct)
        {
            var st = await _db.StockTakes.FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);
            if (st == null) return (false, "Audit not found.");

            if (!string.Equals(st.Status, "PendingAccountantReview", StringComparison.OrdinalIgnoreCase))
                return (false, $"Audit must be in 'PendingAccountantReview' status. Current: '{st.Status}'.");

            var user = await _db.Users.AsNoTracking().Include(x => x.Role)
                .FirstOrDefaultAsync(x => x.UserId == userId, ct);
            if (user == null || !string.Equals(user.Role.RoleName, "Accountant", StringComparison.OrdinalIgnoreCase))
                return (false, "Only Accountants can perform this action.");

            if (string.Equals(action, "Approve", StringComparison.OrdinalIgnoreCase))
            {
                // All matched → sign + complete + unlock
                await AddSignatureIfNotExistsAsync(stockTakeId, userId, "Accountant", signatureData, ct);
                return await CompleteAndUpdateInventoryAsync(st, userId, "Audit completed: all items matched.", ct);
            }
            else if (string.Equals(action, "ForwardToManager", StringComparison.OrdinalIgnoreCase))
            {
                st.Status = "PendingManagerReview";

                await _notificationService.QueueAuditNotificationAsync(
                    stockTakeId,
                    $"Audit #{st.StockTakeId} ({st.Title}) có chênh lệch. Kế toán đã chuyển xuống Manager để xem xét.",
                    includeCreator: true,
                    includeTeamMembers: false,
                    roleNames: new[] { "Manager" },
                    extraUserIds: null,
                    excludeUserIds: new[] { userId },
                    ct);

                await _db.SaveChangesAsync(ct);
                return (true, "Audit forwarded to Manager for discrepancy review.");
            }

            return (false, "Action must be 'Approve' or 'ForwardToManager'.");
        }

        public async Task<(bool success, string message)> AccountantApproveResolveAsync(
            int stockTakeId,
            int userId,
            string? signatureData,
            CancellationToken ct)
        {
            var st = await _db.StockTakes.FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);
            if (st == null) return (false, "Audit not found.");

            if (!string.Equals(st.Status, "PendingAccountantApproval", StringComparison.OrdinalIgnoreCase))
                return (false, $"Audit must be in 'PendingAccountantApproval' status. Current: '{st.Status}'.");

            var user = await _db.Users.AsNoTracking().Include(x => x.Role)
                .FirstOrDefaultAsync(x => x.UserId == userId, ct);
            if (user == null || !string.Equals(user.Role.RoleName, "Accountant", StringComparison.OrdinalIgnoreCase))
                return (false, "Only Accountants can perform this action.");

            await AddSignatureIfNotExistsAsync(stockTakeId, userId, "Accountant", signatureData, ct);
            return await CompleteAndUpdateInventoryAsync(st, userId, "Audit completed: Accountant approved resolution.", ct);
        }

        public async Task<(bool success, string message)> AccountantRejectResolveAsync(
            int stockTakeId,
            int userId,
            string? notes,
            string? signatureData,
            CancellationToken ct)
        {
            var st = await _db.StockTakes.FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);
            if (st == null) return (false, "Audit not found.");

            if (!string.Equals(st.Status, "PendingAccountantApproval", StringComparison.OrdinalIgnoreCase))
                return (false, $"Audit must be in 'PendingAccountantApproval' status. Current: '{st.Status}'.");

            var user = await _db.Users.AsNoTracking().Include(x => x.Role)
                .FirstOrDefaultAsync(x => x.UserId == userId, ct);
            if (user == null || !string.Equals(user.Role.RoleName, "Accountant", StringComparison.OrdinalIgnoreCase))
                return (false, "Only Accountants can perform this action.");

            if (string.IsNullOrWhiteSpace(signatureData))
                return (false, "Accountant signature is required.");

            await AddSignatureIfNotExistsAsync(stockTakeId, userId, "Accountant", signatureData, ct);

            st.Status = "PendingAdminReview";

            await _notificationService.QueueAuditNotificationAsync(
                stockTakeId,
                $"Audit #{st.StockTakeId} ({st.Title}): Kế toán từ chối lý do xử lý của Manager. Chuyển lên Admin xem xét.",
                includeCreator: true,
                includeTeamMembers: false,
                roleNames: new[] { "Admin" },
                extraUserIds: null,
                excludeUserIds: new[] { userId },
                ct);

            await _db.SaveChangesAsync(ct);
            return (true, "Resolution rejected. Escalated to Admin.");
        }

        public async Task<(bool success, string message)> AdminFinalizeAsync(
            int stockTakeId,
            int userId,
            AdminFinalizeRequest request,
            CancellationToken ct)
        {
            var st = await _db.StockTakes.FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);
            if (st == null) return (false, "Audit not found.");

            if (!string.Equals(st.Status, "PendingAdminReview", StringComparison.OrdinalIgnoreCase))
                return (false, $"Audit must be in 'PendingAdminReview' status. Current: '{st.Status}'.");

            var user = await _db.Users.AsNoTracking().Include(x => x.Role)
                .FirstOrDefaultAsync(x => x.UserId == userId, ct);
            if (user == null || !string.Equals(user.Role.RoleName, "Admin", StringComparison.OrdinalIgnoreCase))
                return (false, "Only Admins can perform this action.");

            // Create penalty record
            var penalty = new Backend.Entities.AuditPenalty
            {
                StockTakeId = stockTakeId,
                IssuedByUserId = userId,
                TargetUserId = request.TargetManagerUserId,
                Reason = request.PenaltyReason,
                Amount = request.PenaltyAmount,
                Notes = request.PenaltyNotes?.Trim(),
                CreatedAt = DateTime.UtcNow
            };
            _db.AuditPenalties.Add(penalty);

            await AddSignatureIfNotExistsAsync(stockTakeId, userId, "Admin", request.SignatureData, ct);

            // Notify the manager about the penalty
            _db.Notifications.Add(new Backend.Entities.Notification
            {
                UserId = request.TargetManagerUserId,
                Message = $"Bạn đã bị phạt {request.PenaltyAmount:N0} VNĐ cho Audit #{st.StockTakeId} ({st.Title}). Lý do: {request.PenaltyReason}",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            return await CompleteAndUpdateInventoryAsync(st, userId, request.AuditNotes, ct);
        }

        // ===== Helper: Complete audit + update inventory =====
        private async Task<(bool success, string message)> CompleteAndUpdateInventoryAsync(
            StockTake st, int userId, string? notes, CancellationToken ct)
        {
            // Select all items in the audit where system qty differs from counted qty
            var itemsToAdjust = await _db.StockTakeDetails
                .Where(x =>
                    x.StockTakeId == st.StockTakeId &&
                    (x.SystemQty ?? 0m) != (x.CountQty ?? 0m))
                .ToListAsync(ct);

            var postedAt = DateTime.UtcNow;
            var postedCount = 0;
            var skippedAlreadyPostedCount = 0;
            var skippedZeroDeltaCount = 0;

            foreach (var detail in itemsToAdjust)
            {
                if (!detail.BinId.HasValue || !detail.BatchId.HasValue)
                    return (false, $"Invalid bin/batch data for variance detail {detail.Id}.");

                var alreadyPosted = await _db.InventoryAdjustmentEntries
                    .AsNoTracking()
                    .AnyAsync(x =>
                        x.StockTakeId == st.StockTakeId &&
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
                    StockTakeId = st.StockTakeId,
                    StockTakeDetailId = detail.Id,
                    WarehouseId = st.WarehouseId,
                    BinId = detail.BinId,
                    MaterialId = detail.MaterialId,
                    BatchId = detail.BatchId,
                    QtyDelta = delta,
                    ReasonId = detail.AdjustmentReasonId,
                    Status = "Posted",
                    CreatedAt = postedAt,
                    CreatedBy = detail.ResolvedBy ?? userId,
                    ApprovedAt = postedAt,
                    ApprovedBy = userId,
                    PostedAt = postedAt
                };

                _db.InventoryAdjustmentEntries.Add(entry);
                postedCount++;
            }

            st.Status = "Completed";
            st.CompletedAt = postedAt;
            st.CompletedBy = userId;
            st.Notes = notes?.Trim();

            await UnlockActiveLocksAsync(st.StockTakeId, userId, ct);
            await _db.SaveChangesAsync(ct);

            return (true, $"Audit completed successfully. Posted: {postedCount}, already posted: {skippedAlreadyPostedCount}, zero-delta: {skippedZeroDeltaCount}.");
        }

        private async Task AddSignatureIfNotExistsAsync(int stockTakeId, int userId, string role, string? signatureData, CancellationToken ct)
        {
            var exists = await _db.StockTakeSignatures
                .AnyAsync(x => x.StockTakeId == stockTakeId && x.Role == role, ct);

            if (!exists)
            {
                _db.StockTakeSignatures.Add(new Backend.Entities.StockTakeSignature
                {
                    StockTakeId = stockTakeId,
                    UserId = userId,
                    Role = role,
                    SignedAt = DateTime.UtcNow,
                    SignatureData = signatureData
                });
            }
        }

        public async Task<(bool success, string message)> CompleteAuditAsync(
            int stockTakeId,
            int userId,
            CompleteAuditRequest request,
            CancellationToken ct)
        {
            // Keep for backward compatibility but route through new flow
            var st = await _db.StockTakes
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                return (false, "Audit not found.");

            if (st.CompletedAt != null || string.Equals(st.Status, "Completed", StringComparison.OrdinalIgnoreCase))
                return (false, "Audit is already completed.");

            var currentUser = await _db.Users
                .AsNoTracking()
                .Include(x => x.Role)
                .FirstOrDefaultAsync(x => x.UserId == userId, ct);

            if (currentUser == null || !string.Equals(currentUser.Role.RoleName, "Accountant", StringComparison.OrdinalIgnoreCase))
                return (false, "Only accountants can complete the audit.");

            return await CompleteAndUpdateInventoryAsync(st, userId, request.Notes, ct);
        }
    }
}
