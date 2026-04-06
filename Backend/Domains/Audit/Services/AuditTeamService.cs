using Backend.Data;
using Backend.Domains.Audit.DTOs.Managers;
using Backend.Domains.Audit.Interfaces;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Audit.Services;

public class AuditTeamService : IAuditTeamService
{
    private readonly MyDbContext _db;
    private readonly IAuditNotificationService _notificationService;

    public AuditTeamService(
        MyDbContext db,
        IAuditNotificationService notificationService)
    {
        _db = db;
        _notificationService = notificationService;
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

        if (st == null)
            throw new KeyNotFoundException("StockTake/Audit không tồn tại.");

        var members = await _db.StockTakeTeamMembers
            .AsNoTracking()
            .Where(x => x.StockTakeId == stockTakeId && x.IsActive)
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
        var stockTakeExists = await _db.StockTakes
            .AsNoTracking()
            .AnyAsync(x => x.StockTakeId == stockTakeId, ct);

        if (!stockTakeExists)
            throw new KeyNotFoundException("StockTake/Audit không tồn tại.");

        var assignedIds = await _db.StockTakeTeamMembers
            .AsNoTracking()
            .Where(x => x.StockTakeId == stockTakeId && x.IsActive)
            .Select(x => x.UserId)
            .ToListAsync(ct);

        // Staff chỉ bị coi là bận nếu còn active ở audit khác và audit đó chưa completed.
        var busyIds = await (
            from tm in _db.StockTakeTeamMembers.AsNoTracking()
            join st in _db.StockTakes.AsNoTracking() on tm.StockTakeId equals st.StockTakeId
            where tm.IsActive
                  && tm.MemberCompletedAt == null
                  && tm.StockTakeId != stockTakeId
                  && st.CompletedAt == null
                  && st.Status != "Completed"
            select tm.UserId
        )
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
        if (request.MemberUserIds == null)
            throw new ArgumentException("MemberUserIds không được null.");

        var st = await _db.StockTakes.FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);
        if (st == null) throw new ArgumentException("Audit không tồn tại.");

        if (!IsAssignableStatus(st.Status))
            throw new InvalidOperationException("Audit không ở trạng thái cho phép phân công team.");

        var now = DateTime.UtcNow;
        var distinctIds = request.MemberUserIds.Distinct().ToList();

        var validUserIds = await (
            from u in _db.Users.AsNoTracking()
            join r in _db.Roles.AsNoTracking() on u.RoleId equals r.RoleId
            where distinctIds.Contains(u.UserId)
                  && u.Status
                  && r.RoleName == "Staff"
            select u.UserId
        ).ToListAsync(ct);

        var notifyUserIds = new List<int>();
        var removedUserIds = new List<int>();

        using var tx = await _db.Database.BeginTransactionAsync(ct);

        var existingMembers = await _db.StockTakeTeamMembers
            .Where(x => x.StockTakeId == stockTakeId)
            .ToListAsync(ct);

        foreach (var member in existingMembers)
        {
            if (!validUserIds.Contains(member.UserId) && member.IsActive)
            {
                member.IsActive = false;
                member.RemovedAt = now;
                removedUserIds.Add(member.UserId);
            }
        }

        foreach (var uid in validUserIds)
        {
            var member = existingMembers.FirstOrDefault(x => x.UserId == uid);

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

                if (member.AssignedAt == default)
                    member.AssignedAt = now;

                if (!wasActive)
                {
                    member.MemberCompletedAt = null;
                    notifyUserIds.Add(uid);
                }
            }
        }

        if (validUserIds.Count > 0 &&
            (string.Equals(st.Status, "Planned", StringComparison.OrdinalIgnoreCase) ||
             string.Equals(st.Status, "PLAN", StringComparison.OrdinalIgnoreCase)))
        {
            st.Status = "Assigned";
        }

        var assignedUserIds = notifyUserIds
            .Distinct()
            .ToList();
        var deactivatedUserIds = removedUserIds
            .Distinct()
            .ToList();

        if (assignedUserIds.Count > 0)
        {
            await _notificationService.QueueNotificationAsync(
                assignedUserIds,
                $"Bạn đã được phân công vào Audit #{st.StockTakeId} ({st.Title}).",
                relatedEntityType: "Audit",
                relatedEntityId: stockTakeId,
                ct);
        }

        if (deactivatedUserIds.Count > 0)
        {
            await _notificationService.QueueNotificationAsync(
                deactivatedUserIds,
                $"Bạn đã bị gỡ khỏi Audit #{st.StockTakeId} ({st.Title}).",
                relatedEntityType: "Audit",
                relatedEntityId: stockTakeId,
                ct);
        }

        if (assignedUserIds.Count > 0 || deactivatedUserIds.Count > 0)
        {
            await _notificationService.QueueAuditNotificationAsync(
                stockTakeId,
                $"Danh sách team của Audit #{st.StockTakeId} ({st.Title}) đã được cập nhật: thêm {assignedUserIds.Count}, gỡ {deactivatedUserIds.Count}.",
                includeCreator: true,
                includeTeamMembers: false,
                roleNames: new[] { "Manager" },
                extraUserIds: null,
                excludeUserIds: new[] { managerUserId },
                ct);
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

        await _notificationService.QueueNotificationAsync(
            new[] { userId },
            $"Bạn đã bị gỡ khỏi Audit #{st.StockTakeId} ({st.Title}).",
            relatedEntityType: "Audit",
            relatedEntityId: stockTakeId,
            ct);

        await _notificationService.QueueAuditNotificationAsync(
            stockTakeId,
            $"Audit #{st.StockTakeId} ({st.Title}) vừa được cập nhật danh sách nhân sự và đã gỡ một thành viên khỏi team.",
            includeCreator: true,
            includeTeamMembers: false,
            roleNames: new[] { "Manager" },
            extraUserIds: null,
            excludeUserIds: new[] { managerUserId },
            ct);

        var anyActive = await _db.StockTakeTeamMembers
            .AnyAsync(x => x.StockTakeId == stockTakeId && x.UserId != userId && x.IsActive, ct);

        if (!anyActive)
            st.Status = "Planned";

        await _db.SaveChangesAsync(ct);
    }
    public async Task MarkMyWorkDoneAsync(int stockTakeId, int staffUserId, CancellationToken ct)
    {
        var st = await _db.StockTakes
            .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId, ct);

        if (st == null)
            throw new ArgumentException("Audit không tồn tại.");

        if (string.Equals(st.Status, "Completed", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Audit đã Completed.");

        var member = await _db.StockTakeTeamMembers
            .FirstOrDefaultAsync(x => x.StockTakeId == stockTakeId
                                   && x.UserId == staffUserId
                                   && x.IsActive, ct);

        if (member == null)
            throw new InvalidOperationException("Bạn chưa được phân công audit này.");

        var now = DateTime.UtcNow;

        if (member.MemberCompletedAt == null)
            member.MemberCompletedAt = now;

        var creatorId = st.CreatedBy;

        if (creatorId > 0)
        {
            var staffName = await _db.Users.AsNoTracking()
                .Where(u => u.UserId == staffUserId)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync(ct) ?? $"User#{staffUserId}";

            await _notificationService.QueueAuditNotificationAsync(
                stockTakeId,
                $"{staffName} đã hoàn thành phần kiểm kê của mình cho Audit #{st.StockTakeId} ({st.Title}).",
                includeCreator: true,
                includeTeamMembers: false,
                roleNames: new[] { "Manager" },
                extraUserIds: null,
                excludeUserIds: new[] { staffUserId },
                ct);
        }

        await _db.SaveChangesAsync(ct);
    }

}
