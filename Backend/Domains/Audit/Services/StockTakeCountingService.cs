using Backend.Data;
using Backend.Domains.Audit.DTOs.Staffs;
using Backend.Domains.Audit.Interfaces;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;
using Backend.Domains.Audit.DTOs.Managers;
namespace Backend.Domains.Audit.Services
{
    public class StockTakeCountingService : IStockTakeCountingService
    {
        private readonly MyDbContext _db;
        private readonly IStockTakeLockService _stockTakeLockService;
        private readonly IAuditNotificationService _notificationService;

        public StockTakeCountingService(
            MyDbContext db,
            IStockTakeLockService stockTakeLockService,
            IAuditNotificationService notificationService)
        {
            _db = db;
            _stockTakeLockService = stockTakeLockService;
            _notificationService = notificationService;
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

        private async Task<(bool success, string? message)> EnsureScopeLockedAsync(
            int stockTakeId,
            int userId,
            CancellationToken ct)
        {
            if (await HasActiveLockForCurrentAuditAsync(stockTakeId, ct))
                return (true, null);

            var lockResult = await _stockTakeLockService.LockScopeAsync(stockTakeId, userId, ct);
            if (lockResult.success)
                return (true, null);

            // Another request may have locked the same audit scope concurrently.
            if (await HasActiveLockForCurrentAuditAsync(stockTakeId, ct))
                return (true, null);

            return (false, lockResult.message);
        }
     
        public async Task<bool> IsTeamMemberAsync(int stockTakeId, int userId, CancellationToken ct)
        {
            return await _db.StockTakeTeamMembers
                .AsNoTracking()
                .AnyAsync(x => x.StockTakeId == stockTakeId && x.UserId == userId && (x.IsActive || x.MemberCompletedAt != null), ct);
        }

        private IQueryable<InventoryCurrent> BuildScopedInventoryQuery(int stockTakeId, int warehouseId)
        {
            var assignedBinIds = _db.StockTakeBinLocations
                .AsNoTracking()
                .Where(x => x.StockTakeId == stockTakeId)
                .Select(x => x.BinId);

            return _db.InventoryCurrents
                .AsNoTracking()
                .Where(x => x.WarehouseId == warehouseId &&
                           (x.QuantityOnHand ?? 0) != 0 &&
                           (!assignedBinIds.Any() || assignedBinIds.Contains(x.BinId)));
        }

        private async Task EnsureAssignedAsync(int stockTakeId, int userId, CancellationToken ct)
        {
            var isAssigned = await _db.StockTakeTeamMembers
                .AsNoTracking()
                .AnyAsync(x =>
                    x.StockTakeId == stockTakeId &&
                    x.UserId == userId &&
                    x.IsActive &&
                    x.MemberCompletedAt == null,
                    ct);

            if (!isAssigned)
                throw new UnauthorizedAccessException("Bạn không được phân công audit này.");
        }

        private IQueryable<(int MaterialId, string MaterialName, bool IsCounted)> BuildMaterialQuery(int stockTakeId)
        {
            var detailQuery = _db.StockTakeDetails
                .AsNoTracking()
                .Where(x => x.StockTakeId == stockTakeId);

            var query =
                from stBin in _db.StockTakeBinLocations.AsNoTracking()
                where stBin.StockTakeId == stockTakeId

                join inv in _db.InventoryCurrents.AsNoTracking()
                    on stBin.BinId equals inv.BinId

                join m in _db.Materials.AsNoTracking()
                    on inv.MaterialId equals m.MaterialId

                join d in detailQuery
                    on new
                    {
                        MaterialId = inv.MaterialId,
                        BinId = inv.BinId,
                        BatchId = inv.BatchId
                    }
                    equals new
                    {
                        d.MaterialId,
                        BinId = d.BinId ?? 0,
                        BatchId = d.BatchId ?? 0
                    }
                    into detailJoin
                from d in detailJoin.DefaultIfEmpty()

                select new ValueTuple<int, string, bool>(
                    inv.MaterialId,
                    m.Name,
                    d != null && d.CountQty != null
                );

            return query;
        }

        public async Task<List<CountingDto>> GetCountedItemsAsync(
     int stockTakeId,
     int userId,
     int skip,
     int take,
     CancellationToken ct)
        {
            await EnsureAssignedAsync(stockTakeId, userId, ct);

            var st = await _db.StockTakes
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                throw new ArgumentException("Audit not found.");

            if (take <= 0) take = 50;
            if (take > 200) take = 200;
            if (skip < 0) skip = 0;

            var q =
                from inv in BuildScopedInventoryQuery(stockTakeId, st.WarehouseId)

                join m in _db.Materials.AsNoTracking()
                    on inv.MaterialId equals m.MaterialId

                join b in _db.Batches.AsNoTracking()
                    on inv.BatchId equals b.BatchId

                join bin in _db.BinLocations.AsNoTracking()
                    on inv.BinId equals bin.BinId

                join d in _db.StockTakeDetails.AsNoTracking().Where(x => x.StockTakeId == stockTakeId)
                    on new
                    {
                        MaterialId = inv.MaterialId,
                        BinId = inv.BinId,
                        BatchId = inv.BatchId
                    }
                    equals new
                    {
                        d.MaterialId,
                        BinId = d.BinId ?? 0,
                        BatchId = d.BatchId ?? 0
                    }
                    into detailJoin
                from d in detailJoin.DefaultIfEmpty()

                where d != null && d.CountQty != null

                select new
                {
                    inv.MaterialId,
                    MaterialName = m.Name,
                    BinId = inv.BinId,
                    BinCode = bin.Code,
                    BatchId = inv.BatchId,
                    BatchCode = b.BatchCode,
                    b.MfgDate,
                    b.ExpiryDate,
                    CountQty = d.CountQty
                };

            return await q
                .GroupBy(x => new { x.MaterialId, x.MaterialName, x.BatchCode, x.MfgDate, x.ExpiryDate, x.BinCode, x.CountQty })
                .Select(g => new 
                {
                    g.Key.MaterialId,
                    g.Key.MaterialName,
                    g.Key.BatchCode,
                    g.Key.BinCode,
                    g.Key.CountQty,
                    BinId = g.Min(x => x.BinId),
                    BatchId = g.Min(x => x.BatchId)
                })
                .OrderBy(x => x.MaterialName)
                .ThenBy(x => x.BatchCode)
                .ThenBy(x => x.BinCode)
                .Skip(skip)
                .Take(take)
                .Select(x => new CountingDto
                {
                    MaterialId = x.MaterialId,
                    MaterialName = x.MaterialName,
                    BinId = x.BinId,
                    BinCode = x.BinCode,
                    BatchId = x.BatchId,
                    BatchCode = x.BatchCode,
                    CountQty = x.CountQty
                })
                .ToListAsync(ct);
        }
        public async Task<List<MaterialBatchDto>> GetUncountedItemsAsync(
     int stockTakeId,
     int userId,
     int skip,
     int take,
     CancellationToken ct)
        {
            await EnsureAssignedAsync(stockTakeId, userId, ct);

            var st = await _db.StockTakes
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                throw new ArgumentException("Audit not found.");

            if (take <= 0) take = 50;
            if (take > 200) take = 200;
            if (skip < 0) skip = 0;

            var q =
                from inv in BuildScopedInventoryQuery(stockTakeId, st.WarehouseId)

                join m in _db.Materials.AsNoTracking()
                    on inv.MaterialId equals m.MaterialId

                join b in _db.Batches.AsNoTracking()
                    on inv.BatchId equals b.BatchId

                join bin in _db.BinLocations.AsNoTracking()
                    on inv.BinId equals bin.BinId

                join d in _db.StockTakeDetails.AsNoTracking().Where(x => x.StockTakeId == stockTakeId)
                    on new
                    {
                        MaterialId = inv.MaterialId,
                        BinId = inv.BinId,
                        BatchId = inv.BatchId
                    }
                    equals new
                    {
                        d.MaterialId,
                        BinId = d.BinId ?? 0,
                        BatchId = d.BatchId ?? 0
                    }
                    into detailJoin
                from d in detailJoin.DefaultIfEmpty()

                where d == null || d.CountQty == null

                select new
                {
                    inv.MaterialId,
                    MaterialName = m.Name,
                    BinId = inv.BinId,
                    BinCode = bin.Code,
                    BatchId = inv.BatchId,
                    BatchCode = b.BatchCode,
                    b.MfgDate,
                    b.ExpiryDate
                };

            // GROUP BY BUSINESS KEYS
            return await q
                .GroupBy(x => new { x.MaterialId, x.MaterialName, x.BatchCode, x.MfgDate, x.ExpiryDate, x.BinCode })
                .Select(g => new 
                {
                    g.Key.MaterialId,
                    g.Key.MaterialName,
                    g.Key.BatchCode,
                    g.Key.BinCode,
                    BinId = g.Min(x => x.BinId),
                    BatchId = g.Min(x => x.BatchId)
                })
                .OrderBy(x => x.MaterialName)
                .ThenBy(x => x.BatchCode)
                .ThenBy(x => x.BinCode)
                .Skip(skip)
                .Take(take)
                .Select(x => new MaterialBatchDto
                {
                    MaterialId = x.MaterialId,
                    MaterialName = x.MaterialName,
                    BinId = x.BinId,
                    BinCode = x.BinCode,
                    BatchId = x.BatchId,
                    BatchCode = x.BatchCode
                })
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
                throw new UnauthorizedAccessException("User is not currently active in this audit.");

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
                    (x.DiscrepancyStatus == "RecountRequested" || 
                     (x.CountRound >= 2 && (x.DiscrepancyStatus == "Matched" || x.DiscrepancyStatus == "Recounted"))));

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
                UnitName = x.Material != null ? x.Material.Unit : null, // nếu field khác thì đổi lại
                SystemQty = x.SystemQty,
                CountQty = x.CountQty,
                CountRound = x.CountRound,
                Variance = x.Variance,
                CountedBy = x.CountedBy,
                CountedAt = x.CountedAt
            });

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
                        (x.Material != null &&
                         EF.Functions.Like(EF.Functions.Collate(x.Material.Name, "Vietnamese_CI_AI"), like))
                        ||
                        (x.Batch != null &&
                         EF.Functions.Like(EF.Functions.Collate(x.Batch.BatchCode, "Vietnamese_CI_AI"), like))
                        ||
                        (x.Bin != null &&
                         EF.Functions.Like(EF.Functions.Collate(x.Bin.Code, "Vietnamese_CI_AI"), like))
                    );
                }
            }

            return await q
                .Include(x => x.Material)
                .Include(x => x.Batch)
                .Include(x => x.Bin)
                .Select(x => new 
                {
                    x.MaterialId,
                    MaterialName = x.Material != null ? x.Material.Name : null,
                    BatchCode = x.Batch != null ? x.Batch.BatchCode : null,
                    MfgDate = x.Batch != null ? x.Batch.MfgDate : null,
                    ExpiryDate = x.Batch != null ? x.Batch.ExpiryDate : null,
                    BinCode = x.Bin != null ? x.Bin.Code : null,
                    x.BatchId,
                    x.BinId,
                    x.SystemQty,
                    x.CountQty,
                    x.Variance,
                    x.CountedBy,
                    x.CountedAt,
                    x.DiscrepancyStatus
                })
                .GroupBy(x => new { x.MaterialId, x.MaterialName, x.BatchCode, x.MfgDate, x.ExpiryDate, x.BinCode })
                .Select(g => new CountingDto
                {
                    MaterialId = g.Key.MaterialId,
                    MaterialName = g.Key.MaterialName,
                    BatchCode = g.Key.BatchCode,
                    BinCode = g.Key.BinCode,
                    // Pick the most relevant metrics from the group
                    SystemQty = g.Sum(x => x.SystemQty),
                    CountQty = g.Max(x => x.CountQty),
                    Variance = g.Max(x => x.Variance),
                    DiscrepancyStatus = g.Max(x => x.DiscrepancyStatus), 
                    BatchId = g.Min(x => x.BatchId) ?? 0,
                    BinId = g.Min(x => x.BinId) ?? 0,
                    CountedBy = g.Max(x => x.CountedBy),
                    CountedAt = g.Max(x => x.CountedAt)
                })
                .OrderBy(x => x.MaterialName)
                .ThenBy(x => x.BatchCode)
                .ThenBy(x => x.BinCode)
                .Skip(skip)
                .Take(take)
                .ToListAsync(ct);
        }
        public async Task<List<RecountCandidateDto>> GetRecountCandidatesAsync(
    int stockTakeId,
    CancellationToken ct)
        {
            var st = await _db.StockTakes
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                throw new ArgumentException("Audit not found.");

            var result = await (
                from tm in _db.StockTakeTeamMembers.AsNoTracking()
                join u in _db.Users.AsNoTracking() on tm.UserId equals u.UserId
                where tm.StockTakeId == stockTakeId
                orderby tm.IsActive descending, u.FullName
                select new RecountCandidateDto
                {
                    UserId = tm.UserId,
                    FullName = u.FullName,
                    IsActive = tm.IsActive && tm.MemberCompletedAt == null,
                    AssignedAt = tm.AssignedAt,
                    RemovedAt = tm.RemovedAt
                }
            ).ToListAsync(ct);

            return result;
        }
        public async Task<(bool success, string message)> RejoinForRecountAsync(
    int stockTakeId,
    int targetUserId,
    int managerUserId,
    CancellationToken ct)
        {
            var st = await _db.StockTakes
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

            if (st == null)
                return (false, "Audit not found.");

            var manager = await _db.Users
                .AsNoTracking()
                .Include(x => x.Role)
                .FirstOrDefaultAsync(x => x.UserId == managerUserId, ct);

            var isManager = string.Equals(manager?.Role?.RoleName, "WarehouseManager", StringComparison.OrdinalIgnoreCase);
            var isAdmin = string.Equals(manager?.Role?.RoleName, "Admin", StringComparison.OrdinalIgnoreCase);

            if (manager == null || (!isManager && !isAdmin))
                return (false, "You do not have permission to update this audit.");

            var member = await _db.StockTakeTeamMembers
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId && x.UserId == targetUserId, ct);

            if (member == null)
                return (false, "This user has never joined this audit.");

            if (member.IsActive && member.MemberCompletedAt == null)
                return (true, "User is already active in this audit.");

            member.IsActive = true;
            member.RemovedAt = null;
            member.MemberCompletedAt = null;

            if (string.Equals(st.Status, "Planned", StringComparison.OrdinalIgnoreCase))
                st.Status = "Assigned";

            await _db.SaveChangesAsync(ct);

            return (true, "User rejoined successfully for recount.");
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
                BatchCode = x.Batch != null ? x.Batch.BatchCode : null,
                UnitName = x.Material != null ? x.Material.Unit : null // nếu field khác thì đổi lại
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
    .GroupBy(x => new { x.MaterialId, x.MaterialName, x.BatchCode, x.UnitName })
    .Select(g => new MaterialSuggestDto
    {
        MaterialId = g.Key.MaterialId,
        MaterialName = g.Key.MaterialName,
        BatchCode = g.Key.BatchCode,
        UnitName = g.Key.UnitName
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

            var batch = await _db.Batches
                .AsNoTracking()
                .Where(b => b.BatchCode == batchCode && b.MaterialId == request.MaterialId)
                .OrderBy(b => b.BatchId)
                .FirstOrDefaultAsync(ct);

            if (batch == null)
                return (false, "BatchCode not found for this material.");

            var batchId = batch.BatchId;
            var mfgDate = batch.MfgDate;
            var expiryDate = batch.ExpiryDate;

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

            var lockResult = await EnsureScopeLockedAsync(stockTakeId, userId, ct);
            if (!lockResult.success)
                return (false, lockResult.message ?? "Unable to lock audit scope.");

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

            // Sum up system quantity across all rows matching this Material/BatchCode/Dates/BinCode
            var systemQty = await (
                from inventory in _db.InventoryCurrents.AsNoTracking()
                join b in _db.Batches.AsNoTracking() on inventory.BatchId equals b.BatchId
                join bin in _db.BinLocations.AsNoTracking() on inventory.BinId equals bin.BinId
                where inventory.WarehouseId == st.WarehouseId &&
                      inventory.MaterialId == request.MaterialId &&
                      b.BatchCode == batchCode &&
                      b.MfgDate == mfgDate &&
                      b.ExpiryDate == expiryDate &&
                      bin.Code == binCode
                select inventory.QuantityOnHand ?? 0m
            ).SumAsync(ct);

            // Also check if any row exists at all for this triplet to avoid creating details for non-existent items
            var itemExistsInInventory = await (
                from inventory in _db.InventoryCurrents.AsNoTracking()
                join b in _db.Batches.AsNoTracking() on inventory.BatchId equals b.BatchId
                join bin in _db.BinLocations.AsNoTracking() on inventory.BinId equals bin.BinId
                where inventory.WarehouseId == st.WarehouseId &&
                      inventory.MaterialId == request.MaterialId &&
                      b.BatchCode == batchCode &&
                      b.MfgDate == mfgDate &&
                      b.ExpiryDate == expiryDate &&
                      bin.Code == binCode
                select 1
            ).AnyAsync(ct);

            if (!itemExistsInInventory)
            {
                // Check if item exists in other bins (user entered wrong bin)
                var existsInOtherBin = await (
                    from inventory in _db.InventoryCurrents.AsNoTracking()
                    join b in _db.Batches.AsNoTracking() on inventory.BatchId equals b.BatchId
                    where inventory.WarehouseId == st.WarehouseId &&
                          inventory.MaterialId == request.MaterialId &&
                          b.BatchCode == batchCode &&
                          b.MfgDate == mfgDate &&
                          b.ExpiryDate == expiryDate
                    select 1
                ).AnyAsync(ct);

                if (existsInOtherBin)
                    return (false, "Incorrect Bin Code for this item. Please check and try again.");

                return (false, "InventoryCurrent row not found for this material/bin/batch.");
            }

            var variance = request.CountQty - systemQty;

            // Update ALL matching detail records (in case duplicates were created before or technical IDs mismatch)
            var detailsToUpdate = await (
                from d in _db.StockTakeDetails
                join b in _db.Batches on d.BatchId equals b.BatchId
                join bin in _db.BinLocations on d.BinId equals bin.BinId
                where d.StockTakeId == stockTakeId &&
                      d.MaterialId == request.MaterialId &&
                      b.BatchCode == batchCode &&
                      b.MfgDate == mfgDate &&
                      b.ExpiryDate == expiryDate &&
                      bin.Code == binCode
                select d
            ).ToListAsync(ct);

            if (detailsToUpdate.Count == 0)
            {
                // Fallback to creating a new detail record for the canonical IDs
                var detail = new StockTakeDetail
                {
                    StockTakeId = stockTakeId,
                    MaterialId = request.MaterialId,
                    BatchId = batchId,
                    BinId = binId,
                    SystemQty = systemQty,
                    CountQty = request.CountQty,
                    CountRound = 1,
                    Variance = variance,
                    CountedBy = userId,
                    CountedAt = DateTime.UtcNow,
                    DiscrepancyStatus = variance == 0 ? "Matched" : "Discrepancy"
                };
                _db.StockTakeDetails.Add(detail);
            }
            else
            {
                foreach (var detail in detailsToUpdate)
                {
                    // If it's already requested for recount, we don't update it via this basic API
                    // (Actually the UI should have blocked this, but let's be safe)
                    if (string.Equals(detail.DiscrepancyStatus, "RecountRequested", StringComparison.OrdinalIgnoreCase))
                        continue;

                    detail.SystemQty = systemQty;
                    detail.CountQty = request.CountQty;
                    detail.CountRound = 1;
                    detail.Variance = variance;
                    detail.CountedBy = userId;
                    detail.CountedAt = DateTime.UtcNow;
                    detail.DiscrepancyStatus = variance == 0 ? "Matched" : "Discrepancy";
                }
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

            var batch = await _db.Batches
                .AsNoTracking()
                .Where(b => b.BatchCode == batchCode && b.MaterialId == request.MaterialId)
                .OrderBy(b => b.BatchId)
                .FirstOrDefaultAsync(ct);

            if (batch == null)
                return (false, "BatchCode not found for this material.");

            var batchId = batch.BatchId;
            var mfgDate = batch.MfgDate;
            var expiryDate = batch.ExpiryDate;

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

            var lockResult = await EnsureScopeLockedAsync(stockTakeId, userId, ct);
            if (!lockResult.success)
                return (false, lockResult.message ?? "Unable to lock audit scope.");

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

            // Sum up system quantity across all rows matching this Material/BatchCode/Dates/BinCode
            var systemQty = await (
                from inventory in _db.InventoryCurrents.AsNoTracking()
                join b in _db.Batches.AsNoTracking() on inventory.BatchId equals b.BatchId
                join bin in _db.BinLocations.AsNoTracking() on inventory.BinId equals bin.BinId
                where inventory.WarehouseId == st.WarehouseId &&
                      inventory.MaterialId == request.MaterialId &&
                      b.BatchCode == batchCode &&
                      b.MfgDate == mfgDate &&
                      b.ExpiryDate == expiryDate &&
                      bin.Code == binCode
                select inventory.QuantityOnHand ?? 0m
            ).SumAsync(ct);

            // Verify if item exists in inventory
            var itemExistsInInventory = await (
                from inventory in _db.InventoryCurrents.AsNoTracking()
                join b in _db.Batches.AsNoTracking() on inventory.BatchId equals b.BatchId
                join bin in _db.BinLocations.AsNoTracking() on inventory.BinId equals bin.BinId
                where inventory.WarehouseId == st.WarehouseId &&
                      inventory.MaterialId == request.MaterialId &&
                      b.BatchCode == batchCode &&
                      b.MfgDate == mfgDate &&
                      b.ExpiryDate == expiryDate &&
                      bin.Code == binCode
                select 1
            ).AnyAsync(ct);

            if (!itemExistsInInventory)
                return (false, "InventoryCurrent row not found for this material/bin/batch.");

            // Find ALL matching detail records
            var detailsToUpdate = await (
                from d in _db.StockTakeDetails
                join b in _db.Batches on d.BatchId equals b.BatchId
                join bin in _db.BinLocations on d.BinId equals bin.BinId
                where d.StockTakeId == stockTakeId &&
                      d.MaterialId == request.MaterialId &&
                      b.BatchCode == batchCode &&
                      b.MfgDate == mfgDate &&
                      b.ExpiryDate == expiryDate &&
                      bin.Code == binCode &&
                      d.DiscrepancyStatus == "RecountRequested"
                select d
            ).ToListAsync(ct);

            if (detailsToUpdate.Count == 0)
            {
                // Check if maybe it's already recounted/matched (to give a better error message or allow re-save)
                var alreadyDone = await (
                    from d in _db.StockTakeDetails
                    join b in _db.Batches on d.BatchId equals b.BatchId
                    join bin in _db.BinLocations on d.BinId equals bin.BinId
                    where d.StockTakeId == stockTakeId &&
                          d.MaterialId == request.MaterialId &&
                          b.BatchCode == batchCode &&
                          b.MfgDate == mfgDate &&
                          b.ExpiryDate == expiryDate &&
                          bin.Code == binCode &&
                          (d.DiscrepancyStatus == "Matched" || d.DiscrepancyStatus == "Recounted")
                    select 1
                ).AnyAsync(ct);

                if (alreadyDone)
                {
                    // Update the ones that are already done too (allow correction)
                    detailsToUpdate = await (
                        from d in _db.StockTakeDetails
                        join b in _db.Batches on d.BatchId equals b.BatchId
                        join bin in _db.BinLocations on d.BinId equals bin.BinId
                        where d.StockTakeId == stockTakeId &&
                              d.MaterialId == request.MaterialId &&
                              b.BatchCode == batchCode &&
                              b.MfgDate == mfgDate &&
                              b.ExpiryDate == expiryDate &&
                              bin.Code == binCode
                        select d
                    ).ToListAsync(ct);
                }
                else
                {
                    return (false, "This item has not been requested for recount.");
                }
            }

            var variance = request.CountQty - systemQty;

            foreach (var detail in detailsToUpdate)
            {
                detail.SystemQty = systemQty;
                detail.CountQty = request.CountQty;
                detail.CountRound = 2;
                detail.Variance = variance;
                detail.CountedBy = userId;
                detail.CountedAt = DateTime.UtcNow;
                detail.DiscrepancyStatus = variance == 0 ? "Matched" : "Recounted";
                detail.ResolutionAction = null;
                detail.AdjustmentReasonId = null;
                detail.Reason = null;
                detail.ResolvedBy = null;
                detail.ResolvedAt = null;
            }

            await _db.SaveChangesAsync(ct);
            return (true, "Recount recorded successfully.");
        }
    }
}
