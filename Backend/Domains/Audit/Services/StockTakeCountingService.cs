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

        public async Task<List<CountItemStaffDto>> GetCountItemsAsync(
            int stockTakeId,
            int userId,
            string? keyword,
            bool uncountedOnly,
            int skip,
            int take,
            CancellationToken ct)
        {
            // Verify team membership
            var isMember = await IsTeamMemberAsync(stockTakeId, userId, ct);
            if (!isMember)
                throw new UnauthorizedAccessException("User is not part of this audit team.");

            // Get audit
            var st = await _db.StockTakes
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);
            if (st == null)
                throw new ArgumentException("Audit not found.");

            var assignedBinIds = await GetAssignedBinIdsAsync(stockTakeId, ct);

            if (take <= 0) take = 50;
            if (take > 200) take = 200;
            if (skip < 0) skip = 0;

            // Query inventory in assigned scope (bins or whole warehouse) and map counted state
            var details = _db.StockTakeDetails.AsNoTracking().Where(d => d.StockTakeId == stockTakeId);

            var q =
                from ic in _db.InventoryCurrents.AsNoTracking()
                where ic.WarehouseId == st.WarehouseId
                      && (assignedBinIds.Count == 0 || assignedBinIds.Contains(ic.BinId))
                join d in details
                  on new { ic.MaterialId, BatchId = (int?)ic.BatchId, BinId = (int?)ic.BinId }
                  equals new { d.MaterialId, d.BatchId, d.BinId }
                  into gj
                from d in gj.DefaultIfEmpty()
                select new CountItemStaffDto
                {
                    MaterialId = ic.MaterialId,
                    BinId = ic.BinId,
                    BatchId = ic.BatchId,

                    MaterialName = ic.Material.Name,
                    BatchCode = ic.Batch.BatchCode,
                    BinCode = ic.Bin.Code,

                    CountQty = d != null ? d.CountQty : null,
                    CountedBy = d != null ? d.CountedBy : null,
                    CountedAt = d != null ? d.CountedAt : null
                };

            // Filter by keyword
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
                        (x.BinCode != null &&
                         EF.Functions.Like(EF.Functions.Collate(x.BinCode, "Vietnamese_CI_AI"), like))
                        ||
                        (x.BatchCode != null &&
                         EF.Functions.Like(EF.Functions.Collate(x.BatchCode, "Vietnamese_CI_AI"), like))
                    );
                }
            }

            if (uncountedOnly)
                q = q.Where(x => x.CountQty == null);

            var data = await q
                .OrderBy(x => x.BinId)
                .ThenBy(x => x.MaterialId)
                .Skip(skip)
                .Take(take)
                .ToListAsync(ct);

            return data;
        }

        public async Task<(bool success, string message)> UpsertCountAsync(
            int stockTakeId,
            int userId,
            UpsertCountRequest request,
            CancellationToken ct)
        {
            if (request.CountQty < 0)
                return (false, "CountQty must be >= 0.");

            // Verify team membership
            var isMember = await IsTeamMemberAsync(stockTakeId, userId, ct);
            if (!isMember)
                return (false, "User is not part of this audit team.");

            var st = await _db.StockTakes.FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);
            if (st == null)
                return (false, "Audit not found.");

            var assignedBinIds = await GetAssignedBinIdsAsync(stockTakeId, ct);
            var isWarehouseScopeAudit = assignedBinIds.Count == 0;

            // Prevent edits if audit is already completed
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

            // Find BatchId from BatchCode
            var batchId = await _db.Batches.AsNoTracking()
                .Where(b => b.BatchCode == request.BatchCode && b.MaterialId == request.MaterialId)
                .Select(b => b.BatchId)
                .FirstOrDefaultAsync(ct);

            if (batchId == 0)
                return (false, "BatchCode not found for this material.");

            // Resolve BinId from BinCode
            var binCode = request.BinCode?.Trim() ?? string.Empty;
            var binCodeLower = binCode.ToLower();

            var binId = await _db.BinLocations.AsNoTracking()
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



            var ic = await _db.InventoryCurrents.AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.WarehouseId == st.WarehouseId &&
                    x.MaterialId == request.MaterialId &&
                    x.BinId == binId &&
                    x.BatchId == batchId, ct);

            if (ic == null)
                return (false, "InventoryCurrent row not found for this material/bin/batch.");

            var systemQty = ic.QuantityOnHand ?? 0m;
            var variance = request.CountQty - systemQty;

            // Upsert StockTakeDetail
            var detail = await _db.StockTakeDetails
                .FirstOrDefaultAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.MaterialId == request.MaterialId &&
                    x.BatchId == batchId &&
                    x.BinId == binId, ct);

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
                    DiscrepancyStatus = variance == 0 ? "Matched" : "Discrepancy",
                    Reason = request.Reason?.Trim()
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
                detail.Reason = request.Reason?.Trim();
            }

            await _db.SaveChangesAsync(ct);

            return (true, $"Count recorded successfully. Variance: {variance}");
        }
    }
}
