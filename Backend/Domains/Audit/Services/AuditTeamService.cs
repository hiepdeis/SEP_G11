using Backend.Data;
using Backend.Domains.Audit.DTOs.Managers;
using Backend.Domains.Audit.Interfaces;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Audit.Services;

public class AuditTeamService : IAuditTeamService
{
    private readonly MyDbContext _db;

    public AuditTeamService(MyDbContext db)
    {
        _db = db;
    }

    private static bool IsAssignableStatus(string? status)
      => string.Equals(status, "Planned", StringComparison.OrdinalIgnoreCase)
      || string.Equals(status, "PLAN", StringComparison.OrdinalIgnoreCase)
      || string.Equals(status, "Assigned", StringComparison.OrdinalIgnoreCase); // NEW

    public async Task<AuditTeamResponse> GetTeamAsync(int stockTakeId, CancellationToken ct)
    {
        var st = await _db.StockTakes
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

        if (st == null) throw new ArgumentException("StockTake/Audit không tồn tại.");

        var members = await _db.StockTakeTeamMembers
            .AsNoTracking()
            .Where(x => x.StockTakeId == stockTakeId && x.IsActive) // IsActive là bool
            .Join(_db.Users.AsNoTracking(),
                tm => tm.UserId,
                u => u.UserId,
                (tm, u) => new AssignedMemberDto
                {
                    UserId = u.UserId,
                    FullName = u.FullName,
                    Email = u.Email,
                    
                    AssignedAt = tm.AssignedAt
                })
            .OrderBy(x => x.FullName)
            .ToListAsync(ct);

        return new AuditTeamResponse
        {
            StockTakeId = st.StockTakeId,
            Title = st.Title,
            WarehouseId = st.WarehouseId,
            PlannedStartDate = st.PlannedStartDate,
            PlannedEndDate = st.PlannedEndDate,
            AssignedMembers = members
        };
    }

    public async Task<List<EligibleStaffDto>> GetEligibleStaffAsync(int stockTakeId, CancellationToken ct)
    {
        var assignedIds = await _db.StockTakeTeamMembers
            .AsNoTracking()
            .Where(x => x.StockTakeId == stockTakeId && x.IsActive)
            .Select(x => x.UserId)
            .ToListAsync(ct);

        // NEW: staff đang bận audit khác (active + audit đó chưa Completed)
        var busyIds = await _db.StockTakeTeamMembers
           .AsNoTracking()
           .Where(tm => tm.IsActive
                     && tm.MemberCompletedAt == null           // NEW: chưa hoàn thành phần mình
                     && tm.StockTakeId != stockTakeId)
           .Select(tm => tm.UserId)
           .Distinct()
           .ToListAsync(ct);

        var q =
            from u in _db.Users.AsNoTracking()
            join r in _db.Roles.AsNoTracking() on u.RoleId equals r.RoleId
            where r.RoleName == "Staff"
            where u.Status == true
            where !assignedIds.Contains(u.UserId)
            where !busyIds.Contains(u.UserId)            // NEW
            select new EligibleStaffDto
            {
                UserId = u.UserId,
                FullName = u.FullName,
                Email = u.Email
            };

        return await q.OrderBy(x => x.FullName).ToListAsync(ct);
    }


    public async Task SaveTeamAsync(int stockTakeId, SaveTeamRequest request, int managerUserId, CancellationToken ct)
    {
        if (request.MemberUserIds == null || request.MemberUserIds.Count == 0) return;

        var st = await _db.StockTakes.FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);
        if (st == null) throw new ArgumentException("Audit không tồn tại.");

        if (!IsAssignableStatus(st.Status))
            throw new InvalidOperationException("Audit không ở trạng thái cho phép phân công team.");

        var now = DateTime.UtcNow;
        var distinctIds = request.MemberUserIds.Distinct().ToList();

        // NEW: chỉ cho add đúng Staff + đang active
        var validUserIds = await (
            from u in _db.Users.AsNoTracking()
            join r in _db.Roles.AsNoTracking() on u.RoleId equals r.RoleId
            where distinctIds.Contains(u.UserId)
                  && u.Status
                  && r.RoleName == "Staff"
            select u.UserId
        ).ToListAsync(ct);

        // NEW: chặn staff đang bận audit khác (active + audit kia chưa Completed)
        // NEW: chặn staff đang bận audit khác (IsActive + chưa hoàn thành phần mình)
        var busyUserIds = await _db.StockTakeTeamMembers
            .AsNoTracking()
            .Where(tm => validUserIds.Contains(tm.UserId)
                      && tm.IsActive
                      && tm.MemberCompletedAt == null      // <-- KEY
                      && tm.StockTakeId != stockTakeId)
            .Select(tm => tm.UserId)
            .Distinct()
            .ToListAsync(ct);

        if (busyUserIds.Count > 0)
        {
            var busyNames = await _db.Users.AsNoTracking()
                .Where(u => busyUserIds.Contains(u.UserId))
                .Select(u => u.FullName)
                .ToListAsync(ct);

            throw new InvalidOperationException(
                $"Không thể phân công vì có Staff đang tham gia audit khác chưa hoàn thành phần mình: {string.Join(", ", busyNames)}"
            );
        }


        var notifyUserIds = new List<int>();

        using var tx = await _db.Database.BeginTransactionAsync(ct);

        foreach (var uid in validUserIds)
        {
            var member = await _db.StockTakeTeamMembers
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId && x.UserId == uid, ct);

            if (member == null)
            {
                _db.StockTakeTeamMembers.Add(new StockTakeTeamMember
                {
                    StockTakeId = stockTakeId,
                    UserId = uid,
                    
                    AssignedAt = now,
                    IsActive = true
                });

                notifyUserIds.Add(uid);
            }
            else
            {
                var wasActive = member.IsActive;

                member.IsActive = true;
                member.RemovedAt = null;
                
                if (member.AssignedAt == default) member.AssignedAt = now;

                if (!wasActive) notifyUserIds.Add(uid);
            }
        }

        if (validUserIds.Count > 0 &&
            (string.Equals(st.Status, "Planned", StringComparison.OrdinalIgnoreCase) ||
             string.Equals(st.Status, "PLAN", StringComparison.OrdinalIgnoreCase)))
        {
            st.Status = "Assigned";
        }

        if (notifyUserIds.Count > 0)
        {
            foreach (var uid in notifyUserIds.Distinct())
            {
                _db.Notifications.Add(new Notification
                {
                    UserId = uid,
                    Message = $"You have been assigned to Audit #{st.StockTakeId} ({st.Title}).",
                    IsRead = false,
                    CreatedAt = now
                });
            }
        }

        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }



    public async Task RemoveMemberAsync(int stockTakeId, int userId, int managerUserId, CancellationToken ct)
        {
            var st = await _db.StockTakes.FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);
            if (st == null) throw new ArgumentException("StockTake/Audit không tồn tại.");

            if (!IsAssignableStatus(st.Status))
                throw new InvalidOperationException("Audit không ở trạng thái cho phép sửa team.");

            var member = await _db.StockTakeTeamMembers
                .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId && x.UserId == userId, ct);

            if (member == null) return;
        
            member.IsActive = false;
            member.RemovedAt = DateTime.UtcNow;
            var anyActive = await _db.StockTakeTeamMembers.AnyAsync(x => x.StockTakeId == stockTakeId && x.IsActive, ct);
            if (!anyActive) st.Status = "Planned";
            await _db.SaveChangesAsync(ct);
        }
    public async Task MarkMyWorkDoneAsync(int stockTakeId, int staffUserId, CancellationToken ct)
    {
        var st = await _db.StockTakes
            .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

        if (st == null) throw new ArgumentException("Audit không tồn tại.");

        if (string.Equals(st.Status, "Completed", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Audit đã Completed.");

        var member = await _db.StockTakeTeamMembers
            .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId
                                   && x.UserId == staffUserId
                                   && x.IsActive, ct);

        if (member == null)
            throw new InvalidOperationException("Bạn chưa được phân công audit này.");

        // idempotent: bấm nhiều lần không sao
        if (member.MemberCompletedAt != null) return;

        var now = DateTime.UtcNow;
        member.MemberCompletedAt = now;

        // (tuỳ chọn) notify người tạo audit (thường là Accountant)
        // (tuỳ chọn) notify người tạo audit
        var creatorId = st.CreatedBy; // int

        if (creatorId > 0) // hoặc bỏ if nếu CreatedBy luôn có
        {
            var staffName = await _db.Users.AsNoTracking()
                .Where(u => u.UserId == staffUserId)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync(ct) ?? $"User#{staffUserId}";

            _db.Notifications.Add(new Notification
            {
                UserId = creatorId, // <-- FIX
                Message = $"{staffName} đã hoàn thành phần kiểm kê của mình cho Audit #{st.StockTakeId} ({st.Title}).",
                IsRead = false,
                CreatedAt = now
            });
        }


        await _db.SaveChangesAsync(ct);
    }


}
