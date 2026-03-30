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

        public StockTakeCountingService(
            MyDbContext db,
            IStockTakeLockService stockTakeLockService)
        {
            _db = db;
            _stockTakeLockService = stockTakeLockService;
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

        public async Task<List<MaterialBatchDto>> GetCountedItemsAsync(
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
                    BatchCode = b.BatchCode
                };

            return await q
                .Distinct()
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
                    BatchCode = b.BatchCode
                };

            // SAU ĐÓ MỚI SELECT
            return await q
                .Distinct()
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

            if (manager == null || !string.Equals(manager.Role.RoleName, "Manager", StringComparison.OrdinalIgnoreCase))
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
                detail.SystemQty = systemQty;
                detail.CountQty = request.CountQty;
                detail.CountRound = detail.CountRound <= 0 ? 1 : detail.CountRound;
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
            detail.CountRound = detail.CountRound <= 0 ? 2 : detail.CountRound + 1;
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
