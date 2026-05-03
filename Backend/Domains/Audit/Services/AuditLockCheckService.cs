using Backend.Data;
using Backend.Domains.Audit.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Audit.Services
{
    public class AuditLockCheckService : IAuditLockCheckService
    {
        private readonly MyDbContext _db;

        public AuditLockCheckService(MyDbContext db)
        {
            _db = db;
        }

        public async Task<AuditLockInfo> GetLockedBinsAsync(int warehouseId, CancellationToken ct = default)
        {
            var activeLocks = await _db.StockTakeLocks
                .AsNoTracking()
                .Where(x => x.IsActive && x.WarehouseId == warehouseId)
                .Select(x => new { x.ScopeType, x.BinId })
                .ToListAsync(ct);

            if (activeLocks.Count == 0)
                return new AuditLockInfo();

            // If any lock is warehouse-wide, the entire warehouse is locked
            if (activeLocks.Any(x => x.ScopeType == "Warehouse"))
                return new AuditLockInfo { IsWarehouseLocked = true };

            // Otherwise, return the list of individually locked bin IDs
            var lockedBinIds = activeLocks
                .Where(x => x.ScopeType == "Bin" && x.BinId.HasValue)
                .Select(x => x.BinId!.Value)
                .Distinct()
                .ToList();

            return new AuditLockInfo { LockedBinIds = lockedBinIds };
        }

        public async Task<bool> IsBinLockedAsync(int warehouseId, int binId, CancellationToken ct = default)
        {
            var info = await GetLockedBinsAsync(warehouseId, ct);

            if (info.IsWarehouseLocked)
                return true;

            return info.LockedBinIds.Contains(binId);
        }

        public async Task<string?> CheckBinsForLockAsync(int warehouseId, IEnumerable<int> binIds, CancellationToken ct = default)
        {
            var info = await GetLockedBinsAsync(warehouseId, ct);

            if (info.IsWarehouseLocked)
                return "Kho đang bị khóa để kiểm kê (audit). Không thể thực hiện giao dịch nhập/xuất kho lúc này.";

            var lockedBins = binIds.Where(id => info.LockedBinIds.Contains(id)).Distinct().ToList();

            if (lockedBins.Count == 0)
                return null; // All clear

            // Get bin codes for a user-friendly message
            var binCodes = await _db.BinLocations
                .AsNoTracking()
                .Where(b => lockedBins.Contains(b.BinId))
                .Select(b => b.Code)
                .ToListAsync(ct);

            var binList = string.Join(", ", binCodes);
            return $"Các vị trí kệ ({binList}) đang bị khóa để kiểm kê (audit). Không thể nhập/xuất hàng vào các vị trí này.";
        }
    }
}
