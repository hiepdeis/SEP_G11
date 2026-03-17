using Backend.Data;
using Backend.Domains.Audit.Interfaces;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Audit.Services
{
    public class StockTakeLockService : IStockTakeLockService
    {
        private readonly MyDbContext _db;

        public StockTakeLockService(MyDbContext db)
        {
            _db = db;
        }

        public async Task<(bool success, string message)> LockScopeAsync(
            int stockTakeId,
            int userId,
            CancellationToken ct)
        {
            var st = await _db.StockTakes
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                return (false, "Audit not found.");

            if (st.CompletedAt != null || string.Equals(st.Status, "Completed", StringComparison.OrdinalIgnoreCase))
                return (false, "Audit is already completed.");

            var activeLocksOfCurrentAudit = await _db.StockTakeLocks
                .AnyAsync(x => x.StockTakeId == stockTakeId && x.IsActive, ct);

            if (activeLocksOfCurrentAudit)
                return (false, "Audit scope is already locked.");

            var assignedBinIds = await _db.StockTakeBinLocations
                .AsNoTracking()
                .Where(x => x.StockTakeId == stockTakeId)
                .Select(x => x.BinId)
                .Distinct()
                .ToListAsync(ct);

            if (assignedBinIds.Count == 0)
            {
                var warehouseConflict = await _db.StockTakeLocks
                    .AsNoTracking()
                    .AnyAsync(x =>
                        x.StockTakeId != stockTakeId &&
                        x.WarehouseId == st.WarehouseId &&
                        x.IsActive &&
                        (x.ScopeType == "Warehouse" || x.ScopeType == "Bin"), ct);

                if (warehouseConflict)
                    return (false, "Warehouse is already locked by another active audit.");

                _db.StockTakeLocks.Add(new StockTakeLock
                {
                    StockTakeId = stockTakeId,
                    ScopeType = "Warehouse",
                    WarehouseId = st.WarehouseId,
                    BinId = null,
                    IsActive = true,
                    LockedAt = DateTime.UtcNow
                });
            }
            else
            {
                foreach (var binId in assignedBinIds)
                {
                    var binConflict = await _db.StockTakeLocks
                        .AsNoTracking()
                        .AnyAsync(x =>
                            x.StockTakeId != stockTakeId &&
                            x.WarehouseId == st.WarehouseId &&
                            x.IsActive &&
                            (
                                x.ScopeType == "Warehouse" ||
                                (x.ScopeType == "Bin" && x.BinId == binId)
                            ), ct);

                    if (binConflict)
                        return (false, $"BinId {binId} is already locked by another active audit.");
                }

                foreach (var binId in assignedBinIds)
                {
                    _db.StockTakeLocks.Add(new StockTakeLock
                    {
                        StockTakeId = stockTakeId,
                        ScopeType = "Bin",
                        WarehouseId = st.WarehouseId,
                        BinId = binId,
                        IsActive = true,
                        LockedAt = DateTime.UtcNow
                    });
                }
            }

            if (string.Equals(st.Status, "Planned", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(st.Status, "Assigned", StringComparison.OrdinalIgnoreCase))
            {
                st.Status = "InProgress";
                st.CheckDate ??= DateTime.UtcNow;
            }

            await _db.SaveChangesAsync(ct);
            return (true, "Audit scope locked successfully.");
        }

        public async Task<(bool success, string message)> UnlockScopeAsync(
            int stockTakeId,
            int userId,
            CancellationToken ct)
        {
            var st = await _db.StockTakes
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                return (false, "Audit not found.");

            var locks = await _db.StockTakeLocks
                .Where(x => x.StockTakeId == stockTakeId && x.IsActive)
                .ToListAsync(ct);

            if (locks.Count == 0)
                return (false, "Audit scope is not locked.");

            foreach (var item in locks)
            {
                item.IsActive = false;
                item.UnlockedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync(ct);
            return (true, "Audit scope unlocked successfully.");
        }
    }
}