using Backend.Domains.Audit.DTOs;
using Backend.Domains.Audit.DTOs.Accountant;
using Backend.Domains.Audit.DTOs.Manager;
using Backend.Domains.Audit.DTOs.Staff;
using Backend.Domains.Audit.Interfaces;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Backend.Domains.Audit.Services;

public class StockTakeService : IStockTakeService
{
    private readonly CapstoneSemester9Context _db;

    public StockTakeService(CapstoneSemester9Context db)
    {
        _db = db;
    }

    public async Task<StockTakeCreateResponse> CreateAsync(int currentUserId, StockTakeCreateRequest request, CancellationToken ct = default)
    {
        // Validate basic input
        if (request.WarehouseId <= 0)
            throw new ArgumentException("WarehouseId is required.");

        if (request.PlannedStartDate.HasValue && request.PlannedEndDate.HasValue
            && request.PlannedStartDate.Value > request.PlannedEndDate.Value)
            throw new ArgumentException("PlannedStartDate must be <= PlannedEndDate.");

        var warehouseExists = await _db.Warehouses.AnyAsync(w => w.WarehouseId == request.WarehouseId, ct);
        if (!warehouseExists)
            throw new ArgumentException("Warehouse does not exist.");

        // Optional: block if there is active audit in same warehouse
        if (request.BlockIfActiveAuditExists)
        {
            var hasActive = await _db.StockTakes.AnyAsync(st =>
                st.WarehouseId == request.WarehouseId
                && st.Status != null
                && (st.Status == "Planned" || st.Status == "Assigned" || st.Status == "Locked" || st.Status == "InProgress" || st.Status == "WaitingApproval"),
                ct);

            if (hasActive)
                throw new InvalidOperationException("There is an active audit in this warehouse.");
        }

        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        // 1) Create header
        var now = DateTime.UtcNow;

        var stockTake = new StockTake
        {
            WarehouseId = request.WarehouseId,
            Title = string.IsNullOrWhiteSpace(request.Title) ? $"StockTake - WH {request.WarehouseId} - {now:yyyy-MM-dd}" : request.Title.Trim(),
            Note = request.Note?.Trim(),
            PlannedStartDate = request.PlannedStartDate,
            PlannedEndDate = request.PlannedEndDate,
            CreatedBy = currentUserId,
            CreatedAt = now,
            Status = "Planned"
        };

        _db.StockTakes.Add(stockTake);
        await _db.SaveChangesAsync(ct); // to get StockTakeId

        // 2) Generate detail lines from InventoryCurrent
        var inventoryQuery = _db.InventoryCurrents
            .AsNoTracking()
            .Where(x => x.WarehouseId == request.WarehouseId);

        var grouped = await inventoryQuery
            .GroupBy(x => new { x.MaterialId, x.BatchId, x.BinId })
            .Select(g => new
            {
                g.Key.MaterialId,
                g.Key.BatchId,
                g.Key.BinId,
                SystemQty = g.Sum(x => (decimal?)(x.QuantityOnHand ?? 0m)) ?? 0m
            })
            .ToListAsync(ct);

        var details = grouped.Select(x => new StockTakeDetail
        {
            StockTakeId = stockTake.StockTakeId,
            MaterialId = x.MaterialId,
            BatchId = x.BatchId,
            BinId = x.BinId,
            SystemQty = x.SystemQty,
            CountQty = null,
            Variance = null,
            ReasonCode = null,
            ReasonNote = null,
            LineStatus = "PendingCount",
            CountedBy = null,
            CountedAt = null,
            ResolutionAction = null,
            ResolvedBy = null,
            ResolvedAt = null,
            ManagerNote = null
        }).ToList();

        if (details.Count > 0)
        {
            _db.StockTakeDetails.AddRange(details);
            await _db.SaveChangesAsync(ct);
        }

        await tx.CommitAsync(ct);

        return new StockTakeCreateResponse
        {
            StockTakeId = stockTake.StockTakeId,
            WarehouseId = stockTake.WarehouseId ?? request.WarehouseId,
            Title = stockTake.Title,
            Note = stockTake.Note,
            PlannedStartDate = stockTake.PlannedStartDate,
            PlannedEndDate = stockTake.PlannedEndDate,
            Status = stockTake.Status ?? "Planned",
            CreatedAt = stockTake.CreatedAt ?? now,
            CreatedBy = stockTake.CreatedBy ?? currentUserId,
            TotalLinesGenerated = details.Count
        };
    }
         public async Task<AssignTeamResponse> AssignTeamAsync(int managerUserId, int stockTakeId, AssignTeamRequest request, CancellationToken ct = default)
    {
        if (stockTakeId <= 0) throw new ArgumentException("Invalid StockTakeId.");
        if (request.Members == null || request.Members.Count == 0) throw new ArgumentException("Members is required.");

        // StockTake exists?
        var stockTake = await _db.StockTakes.FirstOrDefaultAsync(s => s.StockTakeId == stockTakeId, ct);
        if (stockTake == null) throw new ArgumentException("StockTake does not exist.");

        // Business rule: only allow assigning when not completed
        if (stockTake.Status == "Completed")
            throw new InvalidOperationException("Cannot assign team to a completed audit.");

        // Validate users exist
        var userIds = request.Members.Select(m => m.UserId).Distinct().ToList();
        var existingUsers = await _db.Users
            .Where(u => userIds.Contains(u.UserId))
            .Select(u => u.UserId)
            .ToListAsync(ct);

        var missing = userIds.Except(existingUsers).ToList();
        if (missing.Count > 0)
            throw new ArgumentException($"User(s) not found: {string.Join(",", missing)}");

        // Load current team members
        var current = await _db.StockTakeTeamMember
            .Where(x => x.StockTakeId == stockTakeId)
            .ToListAsync(ct);

        int added = 0, updated = 0, skipped = 0;

        foreach (var m in request.Members)
        {
            var role = string.IsNullOrWhiteSpace(m.RoleInAudit) ? "Counter" : m.RoleInAudit!.Trim();
            var note = m.Note?.Trim();

            var existing = current.FirstOrDefault(x => x.UserId == m.UserId);

            if (existing == null)
            {
                _db.StockTakeTeamMember.Add(new StockTakeTeamMember
                {
                    StockTakeId = stockTakeId,
                    UserId = m.UserId,
                    RoleInAudit = role,
                    AssignedBy = managerUserId,
                    AssignedAt = DateTime.UtcNow,
                    Status = "Assigned",
                    Note = note
                });
                added++;
            }
            else
            {
                if (!request.Upsert)
                {
                    skipped++;
                    continue;
                }

                existing.RoleInAudit = role;
                existing.Note = note;
                existing.AssignedBy = managerUserId;
                existing.AssignedAt = DateTime.UtcNow;
                existing.Status = existing.Status ?? "Assigned";
                updated++;
            }
        }

        // Optional: Update StockTake header status to Assigned
        if (stockTake.Status == "Planned" && (added > 0 || updated > 0))
            stockTake.Status = "Assigned";

        await _db.SaveChangesAsync(ct);

        return new AssignTeamResponse
        {
            StockTakeId = stockTakeId,
            Added = added,
            Updated = updated,
            Skipped = skipped
        };
    }
    public async Task<LockAuditResponse> LockAsync(int managerUserId, int stockTakeId, LockAuditRequest? request, CancellationToken ct = default)
    {
        if (stockTakeId <= 0) throw new ArgumentException("Invalid StockTakeId.");

        var stockTake = await _db.StockTakes.FirstOrDefaultAsync(s => s.StockTakeId == stockTakeId, ct);
        if (stockTake == null) throw new ArgumentException("StockTake does not exist.");

        if (stockTake.Status == "Completed")
            throw new InvalidOperationException("Cannot lock a completed audit.");

        if (stockTake.Status == "Locked")
            return new LockAuditResponse
            {
                StockTakeId = stockTakeId,
                Status = stockTake.Status!,
                LockedAt = stockTake.LockedAt ?? DateTime.UtcNow,
                LockedBy = stockTake.LockedBy ?? managerUserId
            };

        // Rule 1: must have team members
        var hasTeam = await _db.StockTakeTeamMember.AnyAsync(x => x.StockTakeId == stockTakeId, ct);
        if (!hasTeam) throw new InvalidOperationException("Cannot lock audit without team members.");

        // Rule 2 (UI card: 1 active locked): only ONE locked audit per warehouse at a time
        if (stockTake.WarehouseId.HasValue)
        {
            var otherLocked = await _db.StockTakes.AnyAsync(s =>
                s.StockTakeId != stockTakeId &&
                s.WarehouseId == stockTake.WarehouseId &&
                s.Status == "Locked", ct);

            if (otherLocked)
                throw new InvalidOperationException("This warehouse already has an active locked audit.");
        }

        // Apply lock
        var now = DateTime.UtcNow;
        stockTake.LockedAt = now;
        stockTake.LockedBy = managerUserId;
        stockTake.Status = "Locked";

        // Optional: append note
        if (!string.IsNullOrWhiteSpace(request?.Note))
        {
            var note = request!.Note!.Trim();
            stockTake.Note = string.IsNullOrWhiteSpace(stockTake.Note)
                ? note
                : $"{stockTake.Note}\n[LOCK] {note}";
        }

        await _db.SaveChangesAsync(ct);

        return new LockAuditResponse
        {
            StockTakeId = stockTakeId,
            Status = stockTake.Status!,
            LockedAt = stockTake.LockedAt!.Value,
            LockedBy = stockTake.LockedBy!.Value
        };
    }
    public async Task<List<MyAssignmentsResponse>> GetMyAssignmentsAsync(int currentUserId, CancellationToken ct = default)
    {
        // Trả list audit mà staff đang được assign
        var data = await _db.StockTakeTeamMember
            .AsNoTracking()
            .Where(x => x.UserId == currentUserId)
            .Join(_db.StockTakes.AsNoTracking(),
                  tm => tm.StockTakeId,
                  st => st.StockTakeId,
                  (tm, st) => new { tm, st })
            .Select(x => new MyAssignmentsResponse
            {
                TeamMemberId = x.tm.Id,
                StockTakeId = x.tm.StockTakeId,
                WarehouseId = x.st.WarehouseId ?? 0,
                AuditTitle = x.st.Title,
                RoleInAudit = x.tm.RoleInAudit,
                Status = x.tm.Status ?? "Assigned",
                AssignedAt = x.tm.AssignedAt,
                AssignedBy = x.tm.AssignedBy
            })
            .OrderByDescending(x => x.StockTakeId)
            .ToListAsync(ct);

        return data;
    }

    public async Task<bool> RespondAssignmentAsync(int currentUserId, long teamMemberId, AcceptAssignmentRequest request, CancellationToken ct = default)
    {
        var tm = await _db.StockTakeTeamMember
            .FirstOrDefaultAsync(x => x.Id == teamMemberId, ct);

        if (tm == null) throw new ArgumentException("Assignment not found.");

        // đảm bảo staff chỉ phản hồi assignment của chính mình
        if (tm.UserId != currentUserId)
            throw new UnauthorizedAccessException("You are not allowed to respond to this assignment.");

        // chỉ cho phản hồi khi đang Assigned (hoặc bạn muốn allow đổi ý thì bỏ check này)
        if ((tm.Status ?? "Assigned") != "Assigned")
            throw new InvalidOperationException($"Cannot respond. Current status is '{tm.Status}'.");

        tm.Status = request.Accept ? "Accepted" : "Declined";

        if (!string.IsNullOrWhiteSpace(request.Note))
        {
            var note = request.Note.Trim();
            tm.Note = string.IsNullOrWhiteSpace(tm.Note) ? note : $"{tm.Note}\n[STAFF] {note}";
        }

        await _db.SaveChangesAsync(ct);
        return true;
    }
    public async Task<ActiveAuditDetailsResponse> GetCountingListByWarehouseAsync(int staffUserId, int warehouseId, CancellationToken ct = default)
    {
        if (warehouseId <= 0) throw new ArgumentException("Invalid warehouseId.");

        // Find active audit (InProcess) in this warehouse that staff Accepted
        var audit = await _db.StockTakeTeamMember.AsNoTracking()
            .Where(tm => tm.UserId == staffUserId && tm.Status == "Accepted")
            .Join(_db.StockTakes.AsNoTracking()
                    .Where(st => st.Status == "InProcess" && st.WarehouseId == warehouseId),
                  tm => tm.StockTakeId,
                  st => st.StockTakeId,
                  (tm, st) => st)
            .OrderByDescending(st => st.StockTakeId)
            .FirstOrDefaultAsync(ct);

        if (audit == null)
            throw new InvalidOperationException("No active audit (InProcess) assigned to you in this warehouse.");

        var stockTakeId = audit.StockTakeId;

        // Load detail lines (blind count: DO NOT select SystemQty)
        var details = await _db.StockTakeDetails.AsNoTracking()
            .Where(d => d.StockTakeId == stockTakeId)
            .Join(_db.Materials.AsNoTracking(),
                  d => d.MaterialId, m => m.MaterialId,
                  (d, m) => new { d, m })
            .GroupJoin(_db.Batches.AsNoTracking(),
                  dm => dm.d.BatchId, b => b.BatchId,
                  (dm, batches) => new { dm.d, dm.m, batches })
            .SelectMany(x => x.batches.DefaultIfEmpty(),
                  (x, b) => new { x.d, x.m, b })
            .GroupJoin(_db.BinLocations.AsNoTracking(),
                  dmb => dmb.d.BinId, bin => bin.BinId,
                  (dmb, bins) => new { dmb.d, dmb.m, dmb.b, bins })
            .SelectMany(x => x.bins.DefaultIfEmpty(),
                  (x, bin) => new StockTakeDetailForCountResponse
                  {
                      Id = x.d.Id,
                      BinId = x.d.BinId,
                      BinCode = bin != null ? bin.Code : null,

                      MaterialId = x.m.MaterialId,
                      MaterialCode = x.m.Code,
                      MaterialName = x.m.Name,
                      Unit = x.m.Unit,

                      BatchId = x.d.BatchId,
                      BatchCode = x.b != null ? x.b.BatchCode : null,

                      CountQty = x.d.CountQty,
                      LineStatus = x.d.LineStatus
                  })
            .OrderBy(x => x.BinCode)
            .ThenBy(x => x.MaterialCode)
            .ThenBy(x => x.BatchCode)
            .ToListAsync(ct);

        var total = details.Count;
        var counted = details.Count(x => x.LineStatus == "Counted" || x.LineStatus == "Discrepancy" || x.LineStatus == "Resolved");
        var progress = total == 0 ? 0 : (int)Math.Round((double)counted * 100.0 / total);

        return new ActiveAuditDetailsResponse
        {
            StockTakeId = stockTakeId,
            WarehouseId = warehouseId,
            Title = audit.Title,
            Status = audit.Status ?? "InProcess",
            TotalLines = total,
            CountedLines = counted,
            ProgressPercent = progress,
            Details = details
        };
    }

    public async Task<CountDetailResponse> CountActiveAuditDetailAsync(int staffUserId, long id, CountDetailRequest request, CancellationToken ct = default)
    {
        if (id <= 0) throw new ArgumentException("Invalid id.");
        if (request.CountQty < 0) throw new ArgumentException("CountQty must be >= 0.");

        // Find active audit (InProcess) that staff Accepted
        var activeAuditId = await _db.StockTakeTeamMember.AsNoTracking()
            .Where(tm => tm.UserId == staffUserId && tm.Status == "Accepted")
            .Join(_db.StockTakes.AsNoTracking().Where(st => st.Status == "InProcess"),
                  tm => tm.StockTakeId,
                  st => st.StockTakeId,
                  (tm, st) => st.StockTakeId)
            .OrderByDescending(x => x)
            .FirstOrDefaultAsync(ct);

        if (activeAuditId == 0)
            throw new InvalidOperationException("You do not have any active audit (InProcess) assigned.");

        // Load detail belongs to active audit
        var detail = await _db.StockTakeDetails
            .FirstOrDefaultAsync(d => d.Id == id && d.StockTakeId == activeAuditId, ct);

        if (detail == null)
            throw new ArgumentException("This detail does not belong to your active audit.");

        var now = DateTime.UtcNow;

        detail.CountQty = request.CountQty;

        var systemQty = detail.SystemQty ?? 0m;
        var variance = request.CountQty - systemQty;

        detail.Variance = variance;
        detail.LineStatus = variance == 0m ? "Counted" : "Discrepancy";
        detail.CountedBy = staffUserId;
        detail.CountedAt = now;

        if (!string.IsNullOrWhiteSpace(request.Note))
        {
            var note = request.Note.Trim();
            detail.ReasonNote = string.IsNullOrWhiteSpace(detail.ReasonNote)
                ? $"[STAFF] {note}"
                : $"{detail.ReasonNote}\n[STAFF] {note}";
        }

        await _db.SaveChangesAsync(ct);

        return new CountDetailResponse
        {
            Id = detail.Id,
            StockTakeId = activeAuditId,
            CountQty = detail.CountQty ?? request.CountQty,
            Variance = detail.Variance ?? variance,
            LineStatus = detail.LineStatus ?? (variance == 0m ? "Counted" : "Discrepancy"),
            CountedBy = detail.CountedBy ?? staffUserId,
            CountedAt = detail.CountedAt ?? now
        };
    }
    public async Task<List<StockTakeDetailForManagerResponse>> GetDetailsForManagerAsync(int stockTakeId, string? status, CancellationToken ct = default)
    {
        if (stockTakeId <= 0) throw new ArgumentException("Invalid stockTakeId.");

        var q = _db.StockTakeDetails.AsNoTracking()
            .Where(d => d.StockTakeId == stockTakeId);

        if (!string.IsNullOrWhiteSpace(status))
        {
            var s = status.Trim();
            q = q.Where(d => d.LineStatus == s);
        }

        var result = await q
            .Join(_db.Materials.AsNoTracking(),
                  d => d.MaterialId, m => m.MaterialId,
                  (d, m) => new { d, m })
            .GroupJoin(_db.Batches.AsNoTracking(),
                  dm => dm.d.BatchId, b => b.BatchId,
                  (dm, batches) => new { dm.d, dm.m, batches })
            .SelectMany(x => x.batches.DefaultIfEmpty(),
                  (x, b) => new { x.d, x.m, b })
            .GroupJoin(_db.BinLocations.AsNoTracking(),
                  dmb => dmb.d.BinId, bin => bin.BinId,
                  (dmb, bins) => new { dmb.d, dmb.m, dmb.b, bins })
            .SelectMany(x => x.bins.DefaultIfEmpty(),
                  (x, bin) => new StockTakeDetailForManagerResponse
                  {
                      Id = x.d.Id,
                      StockTakeId = x.d.StockTakeId ?? stockTakeId,

                      BinId = x.d.BinId,
                      BinCode = bin != null ? bin.Code : null,

                      MaterialId = x.m.MaterialId,
                      MaterialCode = x.m.Code,
                      MaterialName = x.m.Name,
                      Unit = x.m.Unit,

                      BatchId = x.d.BatchId,
                      BatchCode = x.b != null ? x.b.BatchCode : null,

                      SystemQty = x.d.SystemQty,
                      CountQty = x.d.CountQty,
                      Variance = x.d.Variance,

                      LineStatus = x.d.LineStatus,
                      ReasonCode = x.d.ReasonCode,
                      ReasonNote = x.d.ReasonNote,

                      CountedBy = x.d.CountedBy,
                      CountedAt = x.d.CountedAt
                  })
            .OrderByDescending(x => x.Variance)   // lệch nhiều lên đầu (tuỳ bạn)
            .ThenBy(x => x.BinCode)
            .ThenBy(x => x.MaterialCode)
            .ThenBy(x => x.BatchCode)
            .ToListAsync(ct);

        return result;
    }
}
   
