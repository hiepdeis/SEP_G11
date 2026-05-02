using Backend.Data;
using Backend.Domains.Audit.Interfaces;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Audit.Services
{
    public class StockTakeLockService : IStockTakeLockService
    {
        private readonly MyDbContext _db;
        private readonly IAuditNotificationService _notificationService;

        public StockTakeLockService(
            MyDbContext db,
            IAuditNotificationService notificationService)
        {
            _db = db;
            _notificationService = notificationService;
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
                    LockedAt = DateTime.UtcNow,
                    LockedBy = userId
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

                var now = DateTime.UtcNow;

                foreach (var binId in assignedBinIds)
                {
                    _db.StockTakeLocks.Add(new StockTakeLock
                    {
                        StockTakeId = stockTakeId,
                        ScopeType = "Bin",
                        WarehouseId = st.WarehouseId,
                        BinId = binId,
                        IsActive = true,
                        LockedAt = now,
                        LockedBy = userId
                    });
                }
            }

            if (string.Equals(st.Status, "Planned", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(st.Status, "Assigned", StringComparison.OrdinalIgnoreCase))
            {
                st.Status = "InProgress";
                st.CheckDate ??= DateTime.UtcNow;
            }

            // === Snapshot the audit scope by initializing StockTakeDetails ===
            // This ensures totalItems is stable even if live inventory changes later.
            // We only include items that currently have stock.
            var inventoryQuery = _db.InventoryCurrents.Where(x => x.WarehouseId == st.WarehouseId && (x.QuantityOnHand ?? 0) != 0);
            if (assignedBinIds.Any())
            {
                inventoryQuery = inventoryQuery.Where(x => assignedBinIds.Contains(x.BinId));
            }

            var itemsInScope = await inventoryQuery.ToListAsync(ct);
            var existingDetails = await _db.StockTakeDetails
                .Where(x => x.StockTakeId == stockTakeId)
                .ToListAsync(ct);

            foreach (var inv in itemsInScope)
            {
                var exists = existingDetails.Any(d => 
                    d.MaterialId == inv.MaterialId && 
                    d.BinId == inv.BinId && 
                    d.BatchId == inv.BatchId);
                
                if (!exists)
                {
                    _db.StockTakeDetails.Add(new StockTakeDetail
                    {
                        StockTakeId = stockTakeId,
                        MaterialId = inv.MaterialId,
                        BinId = inv.BinId,
                        BatchId = inv.BatchId,
                        SystemQty = inv.QuantityOnHand ?? 0m,
                        CountQty = null,
                        CountRound = 1,
                        DiscrepancyStatus = null
                    });
                }
            }

            await _notificationService.QueueAuditNotificationAsync(
                stockTakeId,
                $"Audit #{st.StockTakeId} ({st.Title}) đã được khóa phạm vi và bắt đầu kiểm kê.",
                includeCreator: true,
                includeTeamMembers: true,
                roleNames: new[] { "WarehouseManager" },
                extraUserIds: null,
                excludeUserIds: new[] { userId },
                ct);

            await _db.SaveChangesAsync(ct);

            // Lock System => Notify all active users (with email)
            var allActiveUserIds = await _db.Users.AsNoTracking()
                .Where(u => u.Status)
                .Select(u => u.UserId)
                .ToListAsync(ct);

            await _notificationService.QueueNotificationAsync(
                allActiveUserIds,
                $"Hệ thống vừa khóa kho/vị trí cho phiếu kiểm kê #{stockTakeId}. Vui lòng ngừng các giao dịch xuất/nhập liên quan.",
                relatedEntityType: "Audit",
                relatedEntityId: stockTakeId,
                ct);

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
                item.UnlockedBy = userId;
            }

            await _notificationService.QueueAuditNotificationAsync(
                stockTakeId,
                $"Audit #{st.StockTakeId} ({st.Title}) đã được mở khóa phạm vi kiểm kê.",
                includeCreator: true,
                includeTeamMembers: true,
                roleNames: new[] { "WarehouseManager" },
                extraUserIds: null,
                excludeUserIds: new[] { userId },
                ct);

            await _db.SaveChangesAsync(ct);
            return (true, "Audit scope unlocked successfully.");
        }
    }
}
