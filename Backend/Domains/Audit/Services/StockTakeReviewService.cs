using Backend.Data;
using Backend.Domains.Audit.DTOs.Managers;
using Backend.Domains.Audit.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Audit.Services
{
    public class StockTakeReviewService : IStockTakeReviewService
    {
        private readonly MyDbContext _db;

        public StockTakeReviewService(MyDbContext db)
        {
            _db = db;
        }

        public async Task<(List<AuditListItemDto> items, int total)> GetAllAuditsAsync(
            int skip,
            int take,
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
                // Get item counts
                var totalItems = await _db.InventoryCurrents
                    .AsNoTracking()
                    .CountAsync(x => x.WarehouseId == st.WarehouseId, ct);

                var countedItems = await _db.StockTakeDetails
                    .AsNoTracking()
                    .CountAsync(x => x.StockTakeId == st.StockTakeId && x.CountQty != null, ct);

                var discrepancyItems = await _db.StockTakeDetails
                    .AsNoTracking()
                    .CountAsync(x =>
                        x.StockTakeId == st.StockTakeId &&
                        x.DiscrepancyStatus == "Discrepancy", ct);

                var unresolvedVariances = await _db.StockTakeDetails
                    .AsNoTracking()
                    .CountAsync(x =>
                        x.StockTakeId == st.StockTakeId &&
                        x.DiscrepancyStatus == "Discrepancy" &&
                        x.ResolutionAction == null, ct);

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
                    UnresolvedVariances = unresolvedVariances,
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
            var totalMaterials = await _db.InventoryCurrents
                .AsNoTracking()
                .Where(x => x.WarehouseId == st.WarehouseId)
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
            var totalItems = await _db.InventoryCurrents
                .AsNoTracking()
                .CountAsync(x => x.WarehouseId == st.WarehouseId, ct);

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

            var query = _db.StockTakeDetails
                .AsNoTracking()
                .Where(x =>
                    x.StockTakeId == stockTakeId &&
                    x.DiscrepancyStatus == "Discrepancy");

            // Filter by resolution status if specified
            if (resolved == false)
            {
                query = query.Where(x => x.ResolutionAction == null);
            }
            else if (resolved == true)
            {
                query = query.Where(x => x.ResolutionAction != null);
            }

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

            var unresolvedCount = await _db.StockTakeDetails
                .AsNoTracking()
                .CountAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.DiscrepancyStatus == "Discrepancy" &&
                    x.ResolutionAction == null, ct);

            var totalCount = await _db.StockTakeDetails
                .AsNoTracking()
                .CountAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.DiscrepancyStatus == "Discrepancy", ct);

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

            // Update resolution fields
            detail.ResolutionAction = request.ResolutionAction?.Trim();
            detail.AdjustmentReasonId = request.AdjustmentReasonId;
            detail.ResolvedBy = resolvedByUserId;
            detail.ResolvedAt = DateTime.UtcNow;

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
            await _db.SaveChangesAsync(ct);

            return (true, "Variance reason updated successfully.");
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
            var totalItems = await _db.InventoryCurrents
                .AsNoTracking()
                .CountAsync(x => x.WarehouseId == st.WarehouseId, ct);

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
            var totalMaterials = await _db.InventoryCurrents
                .AsNoTracking()
                .Where(x => x.WarehouseId == st.WarehouseId)
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
            var totalVariances = await _db.StockTakeDetails
                .AsNoTracking()
                .CountAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.DiscrepancyStatus == "Discrepancy", ct);

            var resolvedVariances = await _db.StockTakeDetails
                .AsNoTracking()
                .CountAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.DiscrepancyStatus == "Discrepancy" &&
                    x.ResolutionAction != null, ct);

            var unresolvedVariances = totalVariances - resolvedVariances;
            var resolutionRate = totalVariances > 0 ? (resolvedVariances * 100m / totalVariances) : 0m;

            var varianceSummary = new VarianceSummaryDto
            {
                TotalVariances = totalVariances,
                ResolvedVariances = resolvedVariances,
                UnresolvedVariances = unresolvedVariances,
                ResolutionRate = Math.Round(resolutionRate, 2)
            };

            // Get locked by name if exists
            string? lockedByName = null;
            if (st.LockedBy.HasValue)
            {
                var lockedByUser = await _db.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.UserId == st.LockedBy, ct);
                lockedByName = lockedByUser?.FullName;
            }

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
                LockedAt = st.LockedAt,
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

            // Check if already signed by this user
            var existingSignature = await _db.StockTakeSignatures
                .FirstOrDefaultAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.UserId == userId, ct);

            if (existingSignature != null)
                return (false, "You have already signed off on this audit.", null);

            // Get user to verify exists
            var user = await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId, ct);

            if (user == null)
                return (false, "User not found.", null);

            // Determine role based on team membership
            var teamMember = await _db.StockTakeTeamMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.UserId == userId &&
                    x.IsActive, ct);

            var role = "Manager"; // Default role for signing off
            if (teamMember != null)
                role = "Staff"; // Team member is a staff counter

            var signature = new Backend.Entities.StockTakeSignature
            {
                StockTakeId = stockTakeId,
                UserId = userId,
                Role = role,
                SignedAt = DateTime.UtcNow,
                SignatureData = request.Notes?.Trim()
            };

            _db.StockTakeSignatures.Add(signature);

            // Auto-transition status if both staff and manager have signed
            var allSignatures = await _db.StockTakeSignatures
                .Where(x => x.StockTakeId == stockTakeId)
                .ToListAsync(ct);

            var hasStaffSignature = allSignatures.Any(x => x.Role == "Staff");
            var hasManagerSignature = allSignatures.Any(x => x.Role == "Manager");

            if (hasStaffSignature && hasManagerSignature)
            {
                st.Status = "ReadyForReview";
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

            // Only manager can complete
            // Verify manager has signed off
            var managerSignature = await _db.StockTakeSignatures
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.UserId == managerId &&
                    x.Role == "Manager", ct);

            if (managerSignature == null)
                return (false, "Manager must sign off before completing audit.");

            // Verify all variances have been resolved
            var unresolvedVariances = await _db.StockTakeDetails
                .AsNoTracking()
                .CountAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.DiscrepancyStatus == "Discrepancy" &&
                    x.ResolutionAction == null, ct);

            if (unresolvedVariances > 0)
                return (false, $"{unresolvedVariances} variance(s) still need resolution.");

            // Update audit completion
            st.Status = "Completed";
            st.CompletedAt = DateTime.UtcNow;
            st.CompletedBy = managerId;
            st.Notes = request.Notes?.Trim();

            await _db.SaveChangesAsync(ct);

            return (true, "Audit completed successfully");
        }
    }
}
