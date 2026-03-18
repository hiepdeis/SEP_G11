using Backend.Data;
using Backend.Domains.Audit.DTOs.Staffs;
using Backend.Domains.Audit.Interfaces;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Audit.Services
{
    public class StockTakeCountingService : IStockTakeCountingService
    {
        private readonly MyDbContext _db;

        public StockTakeCountingService(MyDbContext db)
        {
            _db = db;
        }

        private async Task<List<int>> GetAssignedBinIdsAsync(int stockTakeId, CancellationToken ct)
        {
            return await _db.StockTakeBinLocations
                .AsNoTracking()
                .Where(x => x.StockTakeId == stockTakeId)
                .Select(x => x.BinId)
                .ToListAsync(ct);
        }

        private async Task<bool> HasActiveLockForCurrentAuditAsync(
            int stockTakeId,
            CancellationToken ct)
        {
            return await _db.StockTakeLocks
                .AsNoTracking()
                .AnyAsync(x => x.StockTakeId == stockTakeId && x.IsActive, ct);
        }

        private async Task<bool> HasConflictingLockForBinAsync(
            int warehouseId,
            int currentStockTakeId,
            bool isWarehouseScopeAudit,
            int currentBinId,
            CancellationToken ct)
        {
            return await _db.StockTakeLocks
                .AsNoTracking()
                .AnyAsync(x =>
                    x.StockTakeId != currentStockTakeId &&
                    x.WarehouseId == warehouseId &&
                    x.IsActive &&
                    (
                        x.ScopeType == "Warehouse" ||
                        (x.ScopeType == "Bin" &&
                            (isWarehouseScopeAudit || x.BinId == currentBinId))
                    ), ct);
        }

        public async Task<bool> IsTeamMemberAsync(int stockTakeId, int userId, CancellationToken ct)
        {
            return await _db.StockTakeTeamMembers
                .AsNoTracking()
                .AnyAsync(x => x.StockTakeId == stockTakeId && x.UserId == userId && x.IsActive, ct);
        }

        public async Task<List<CountingDto>> GetCountItemsAsync(
            int stockTakeId,
            int userId,
            string? keyword,
            bool uncountedOnly,
            int skip,
            int take,
            CancellationToken ct)
        {
            var isMember = await IsTeamMemberAsync(stockTakeId, userId, ct);
            if (!isMember)
                throw new UnauthorizedAccessException("User is not part of this audit team.");

            if (take <= 0) take = 50;
            if (take > 200) take = 200;
            if (skip < 0) skip = 0;

            var q = _db.StockTakeDetails
                .AsNoTracking()
                .Where(x => x.StockTakeId == stockTakeId)
                .Select(x => new CountingDto
                {
                    MaterialId = x.MaterialId,
                    BinId = x.BinId ?? 0,
                    BatchId = x.BatchId ?? 0,
                    MaterialName = x.Material != null ? x.Material.Name : null,
                    BatchCode = x.Batch != null ? x.Batch.BatchCode : null,
                    BinCode = x.Bin != null ? x.Bin.Code : null,
                    SystemQty = x.SystemQty,
                    CountQty = x.CountQty,
                    Variance = x.Variance,
                    CountedBy = x.CountedBy,
                    CountedAt = x.CountedAt
                });

            if (uncountedOnly)
            {
                q = q.Where(x => x.CountQty == null);
            }

            keyword = keyword?.Trim();
            if (!string.IsNullOrWhiteSpace(keyword))
            {
                if (int.TryParse(keyword, out var k))
                {
                    q = q.Where(x => x.MaterialId == k || x.BatchId == k || x.BinId == k);
                }
                else
                {
                    var like = $"%{keyword}%";
                    q = q.Where(x =>
                        (x.MaterialName != null &&
                         EF.Functions.Like(EF.Functions.Collate(x.MaterialName, "Vietnamese_CI_AI"), like))
                        ||
                        (x.BatchCode != null &&
                         EF.Functions.Like(EF.Functions.Collate(x.BatchCode, "Vietnamese_CI_AI"), like))
                    );
                }
            }

            return await q
                .OrderBy(x => x.MaterialName)
                .ThenBy(x => x.BatchCode)
                .Skip(skip)
                .Take(take)
                .ToListAsync(ct);
        }



        public async Task<List<CountingDto>> GetRecountItemsAsync(
    int stockTakeId,
    int userId,
    string? keyword,
    int skip,
    int take,
    CancellationToken ct)
        {
            var isMember = await IsTeamMemberAsync(stockTakeId, userId, ct);
            if (!isMember)
                throw new UnauthorizedAccessException("User is not part of this audit team.");

            if (take <= 0) take = 50;
            if (take > 200) take = 200;
            if (skip < 0) skip = 0;

            var st = await _db.StockTakes
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                throw new ArgumentException("Audit not found.");

            var assignedBinIds = await GetAssignedBinIdsAsync(stockTakeId, ct);
            var isWarehouseScopeAudit = assignedBinIds.Count == 0;

            var q = _db.StockTakeDetails
                .AsNoTracking()
                .Where(x =>
                    x.StockTakeId == stockTakeId &&
                    x.DiscrepancyStatus == "RecountRequested");

            if (!isWarehouseScopeAudit)
            {
                q = q.Where(x => x.BinId.HasValue && assignedBinIds.Contains(x.BinId.Value));
            }

            var result = q.Select(x => new CountingDto
            {
                MaterialId = x.MaterialId,
                BinId = x.BinId ?? 0,
                BatchId = x.BatchId ?? 0,
                MaterialName = x.Material != null ? x.Material.Name : null,
                BatchCode = x.Batch != null ? x.Batch.BatchCode : null,
                BinCode = x.Bin != null ? x.Bin.Code : null,
                SystemQty = x.SystemQty,
                CountQty = x.CountQty,
                Variance = x.Variance,
                CountedBy = x.CountedBy,
                CountedAt = x.CountedAt
            });

            keyword = keyword?.Trim();
            if (!string.IsNullOrWhiteSpace(keyword))
            {
                if (int.TryParse(keyword, out var k))
                {
                    result = result.Where(x => x.MaterialId == k || x.BatchId == k || x.BinId == k);
                }
                else
                {
                    var like = $"%{keyword}%";
                    result = result.Where(x =>
                        (x.MaterialName != null &&
                         EF.Functions.Like(EF.Functions.Collate(x.MaterialName, "Vietnamese_CI_AI"), like))
                        ||
                        (x.BatchCode != null &&
                         EF.Functions.Like(EF.Functions.Collate(x.BatchCode, "Vietnamese_CI_AI"), like))
                        ||
                        (x.BinCode != null &&
                         EF.Functions.Like(EF.Functions.Collate(x.BinCode, "Vietnamese_CI_AI"), like))
                    );
                }
            }

            return await result
                .OrderBy(x => x.MaterialName)
                .ThenBy(x => x.BatchCode)
                .ThenBy(x => x.BinCode)
                .Skip(skip)
                .Take(take)
                .ToListAsync(ct);
        }
        public async Task<List<MaterialSuggestDto>> SuggestMaterialsAsync(
       int stockTakeId,
       int userId,
       string? keyword,
       int take,
       CancellationToken ct)
        {
            var isMember = await IsTeamMemberAsync(stockTakeId, userId, ct);
            if (!isMember)
                throw new UnauthorizedAccessException("User is not part of this audit team.");

            if (take <= 0) take = 10;
            if (take > 50) take = 50;

            var st = await _db.StockTakes
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                throw new ArgumentException("Audit not found.");

            var assignedBinIds = await GetAssignedBinIdsAsync(stockTakeId, ct);
            var isWarehouseScopeAudit = assignedBinIds.Count == 0;

            keyword = keyword?.Trim();

            var q = _db.InventoryCurrents
                .AsNoTracking()
                .Where(x => x.WarehouseId == st.WarehouseId); // check warehouse được giao

            if (!isWarehouseScopeAudit)
            {
                q = q.Where(x => assignedBinIds.Contains(x.BinId)); // check bin được giao
            }

            var resultQuery = q.Select(x => new MaterialSuggestDto
            {
                MaterialId = x.MaterialId,
                MaterialName = x.Material != null ? x.Material.Name : "",
                BatchCode = x.Batch != null ? x.Batch.BatchCode : null
            });

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var like = $"%{keyword}%";

                resultQuery = resultQuery.Where(x =>
                    (!string.IsNullOrEmpty(x.MaterialName) &&
                     EF.Functions.Like(EF.Functions.Collate(x.MaterialName, "Vietnamese_CI_AI"), like))
                    ||
                    (x.BatchCode != null &&
                     EF.Functions.Like(EF.Functions.Collate(x.BatchCode, "Vietnamese_CI_AI"), like))
                );
            }

            return await resultQuery
                .GroupBy(x => new { x.MaterialId, x.MaterialName, x.BatchCode })
                .Select(g => new MaterialSuggestDto
                {
                    MaterialId = g.Key.MaterialId,
                    MaterialName = g.Key.MaterialName,
                    BatchCode = g.Key.BatchCode
                })
                .OrderBy(x => x.MaterialName)
                .ThenBy(x => x.BatchCode)
                .Take(take)
                .ToListAsync(ct);
        }
        public async Task<(bool success, string message)> UpsertCountAsync(
            int stockTakeId,
            int userId,
            UpsertCountRequest request,
            CancellationToken ct)
        {
            if (request.CountQty < 0)
                return (false, "CountQty must be >= 0.");

            if (request.MaterialId <= 0)
                return (false, "MaterialId is required.");

            var isMember = await IsTeamMemberAsync(stockTakeId, userId, ct);
            if (!isMember)
                return (false, "User is not part of this audit team.");

            var st = await _db.StockTakes.FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);
            if (st == null)
                return (false, "Audit not found.");

            var assignedBinIds = await GetAssignedBinIdsAsync(stockTakeId, ct);
            var isWarehouseScopeAudit = assignedBinIds.Count == 0;

            if (st.CompletedAt != null || string.Equals(st.Status, "Completed", StringComparison.OrdinalIgnoreCase))
                return (false, "Audit is already completed and cannot be modified.");

            if (!string.Equals(st.Status, "InProgress", StringComparison.OrdinalIgnoreCase))
            {
                if (string.Equals(st.Status, "Planned", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(st.Status, "Assigned", StringComparison.OrdinalIgnoreCase))
                {
                    st.Status = "InProgress";
                    st.CheckDate ??= DateTime.UtcNow;
                }
                else
                {
                    return (false, $"Audit is not countable in status '{st.Status}'.");
                }
            }

            var materialExists = await _db.Materials
                .AsNoTracking()
                .AnyAsync(m => m.MaterialId == request.MaterialId, ct);

            if (!materialExists)
                return (false, "MaterialId not found.");

            var batchCode = request.BatchCode?.Trim();
            if (string.IsNullOrWhiteSpace(batchCode))
                return (false, "BatchCode is required.");

            var batchId = await _db.Batches
                .AsNoTracking()
                .Where(b => b.BatchCode == batchCode && b.MaterialId == request.MaterialId)
                .Select(b => b.BatchId)
                .FirstOrDefaultAsync(ct);

            if (batchId == 0)
                return (false, "BatchCode not found for this material.");

            var binCode = request.BinCode?.Trim();
            if (string.IsNullOrWhiteSpace(binCode))
                return (false, "BinCode is required.");

            var binCodeLower = binCode.ToLower();

            var binId = await _db.BinLocations
                .AsNoTracking()
                .Where(b => b.WarehouseId == st.WarehouseId && b.Code.ToLower() == binCodeLower)
                .Select(b => b.BinId)
                .FirstOrDefaultAsync(ct);

            if (binId == 0)
                return (false, "BinCode not found in this warehouse.");

            if (!isWarehouseScopeAudit && !assignedBinIds.Contains(binId))
                return (false, "BinLocation is outside assigned scope of this audit.");

            var hasActiveLock = await HasActiveLockForCurrentAuditAsync(stockTakeId, ct);
            if (!hasActiveLock)
                return (false, "Audit scope is not locked yet.");

            var hasConflict = await HasConflictingLockForBinAsync(
                st.WarehouseId,
                stockTakeId,
                isWarehouseScopeAudit,
                binId,
                ct);

            if (hasConflict)
            {
                return (false, isWarehouseScopeAudit
                    ? "Warehouse is currently locked by another active audit."
                    : "BinLocation is currently locked by another active audit.");
            }

            var ic = await _db.InventoryCurrents
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.WarehouseId == st.WarehouseId &&
                    x.MaterialId == request.MaterialId &&
                    x.BinId == binId &&
                    x.BatchId == batchId, ct);

            if (ic == null)
                return (false, "InventoryCurrent row not found for this material/bin/batch.");

            var systemQty = ic.QuantityOnHand ?? 0m;
            var variance = request.CountQty - systemQty;

            var detail = await _db.StockTakeDetails
                .FirstOrDefaultAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.MaterialId == request.MaterialId &&
                    x.BatchId == batchId &&
                    x.BinId == binId, ct);
            if (detail != null &&
    string.Equals(detail.DiscrepancyStatus, "RecountRequested", StringComparison.OrdinalIgnoreCase))
            {
                return (false, "This item is waiting for recount. Please use recount API.");
            }
            if (detail == null)
            {
                detail = new StockTakeDetail
                {
                    StockTakeId = stockTakeId,
                    MaterialId = request.MaterialId,
                    BatchId = batchId,
                    BinId = binId,
                    SystemQty = systemQty,
                    CountQty = request.CountQty,
                    Variance = variance,
                    CountedBy = userId,
                    CountedAt = DateTime.UtcNow,
                    DiscrepancyStatus = variance == 0 ? "Matched" : "Discrepancy"
                };
                _db.StockTakeDetails.Add(detail);
            }
            else
            {
                detail.SystemQty = systemQty;
                detail.CountQty = request.CountQty;
                detail.Variance = variance;
                detail.CountedBy = userId;
                detail.CountedAt = DateTime.UtcNow;
                detail.DiscrepancyStatus = variance == 0 ? "Matched" : "Discrepancy";
            }

            await _db.SaveChangesAsync(ct);

            return (true, $"Count recorded successfully.");
        }
        public async Task<(bool success, string message)> RecountAsync(
    int stockTakeId,
    int userId,
    UpsertCountRequest request,
    CancellationToken ct)
        {
            if (request.CountQty < 0)
                return (false, "CountQty must be >= 0.");

            if (request.MaterialId <= 0)
                return (false, "MaterialId is required.");

            var isMember = await IsTeamMemberAsync(stockTakeId, userId, ct);
            if (!isMember)
                return (false, "User is not part of this audit team.");

            var st = await _db.StockTakes
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                return (false, "Audit not found.");

            var assignedBinIds = await GetAssignedBinIdsAsync(stockTakeId, ct);
            var isWarehouseScopeAudit = assignedBinIds.Count == 0;

            if (st.CompletedAt != null || string.Equals(st.Status, "Completed", StringComparison.OrdinalIgnoreCase))
                return (false, "Audit is already completed and cannot be modified.");

            if (!string.Equals(st.Status, "InProgress", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(st.Status, "ReadyForReview", StringComparison.OrdinalIgnoreCase))
            {
                return (false, $"Audit is not recountable in status '{st.Status}'.");
            }

            var batchCode = request.BatchCode?.Trim();
            if (string.IsNullOrWhiteSpace(batchCode))
                return (false, "BatchCode is required.");

            var binCode = request.BinCode?.Trim();
            if (string.IsNullOrWhiteSpace(binCode))
                return (false, "BinCode is required.");

            var batchId = await _db.Batches
                .AsNoTracking()
                .Where(b => b.BatchCode == batchCode && b.MaterialId == request.MaterialId)
                .Select(b => b.BatchId)
                .FirstOrDefaultAsync(ct);

            if (batchId == 0)
                return (false, "BatchCode not found for this material.");

            var binCodeLower = binCode.ToLower();

            var binId = await _db.BinLocations
                .AsNoTracking()
                .Where(b => b.WarehouseId == st.WarehouseId && b.Code.ToLower() == binCodeLower)
                .Select(b => b.BinId)
                .FirstOrDefaultAsync(ct);

            if (binId == 0)
                return (false, "BinCode not found in this warehouse.");

            if (!isWarehouseScopeAudit && !assignedBinIds.Contains(binId))
                return (false, "BinLocation is outside assigned scope of this audit.");

            var hasActiveLock = await HasActiveLockForCurrentAuditAsync(stockTakeId, ct);
            if (!hasActiveLock)
                return (false, "Audit scope is not locked yet.");

            var hasConflict = await HasConflictingLockForBinAsync(
                st.WarehouseId,
                stockTakeId,
                isWarehouseScopeAudit,
                binId,
                ct);

            if (hasConflict)
            {
                return (false, isWarehouseScopeAudit
                    ? "Warehouse is currently locked by another active audit."
                    : "BinLocation is currently locked by another active audit.");
            }

            var ic = await _db.InventoryCurrents
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.WarehouseId == st.WarehouseId &&
                    x.MaterialId == request.MaterialId &&
                    x.BinId == binId &&
                    x.BatchId == batchId, ct);

            if (ic == null)
                return (false, "InventoryCurrent row not found for this material/bin/batch.");

            var detail = await _db.StockTakeDetails
                .FirstOrDefaultAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.MaterialId == request.MaterialId &&
                    x.BatchId == batchId &&
                    x.BinId == binId, ct);

            if (detail == null)
                return (false, "Recount item not found.");

            if (!string.Equals(detail.DiscrepancyStatus, "RecountRequested", StringComparison.OrdinalIgnoreCase))
                return (false, "This item has not been requested for recount.");

            var systemQty = ic.QuantityOnHand ?? 0m;
            var variance = request.CountQty - systemQty;

            detail.SystemQty = systemQty;
            detail.CountQty = request.CountQty;
            detail.Variance = variance;
            detail.CountedBy = userId;
            detail.CountedAt = DateTime.UtcNow;
            detail.DiscrepancyStatus = variance == 0 ? "Matched" : "Recounted";
            detail.ResolutionAction = null;
            detail.AdjustmentReasonId = null;
            detail.Reason = null;
            detail.ResolvedBy = null;
            detail.ResolvedAt = null;

            await _db.SaveChangesAsync(ct);

            return (true, "Recount recorded successfully.");
        }
    }
}