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
        || string.Equals(status, "PLAN", StringComparison.OrdinalIgnoreCase);

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
                    RoleInTeam = tm.RoleInTeam,
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

        // Users.RoleId -> Roles.RoleId (DB của bạn không có UserRoles)
        var q =
            from u in _db.Users.AsNoTracking()
            join r in _db.Roles.AsNoTracking() on u.RoleId equals r.RoleId
            where r.RoleName == "Staff"
            where u.Status == true   // Status là bit => bool
            where !assignedIds.Contains(u.UserId)
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

        var validUserIds = await _db.Users.AsNoTracking()
            .Where(u => distinctIds.Contains(u.UserId) && u.Status)   // Status bool
            .Select(u => u.UserId)
            .ToListAsync(ct);

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
                    RoleInTeam = request.RoleInTeam,
                    AssignedAt = now,
                    IsActive = true
                });

                notifyUserIds.Add(uid); // NEW
            }
            else
            {
                var wasActive = member.IsActive;

                member.IsActive = true;
                member.RemovedAt = null;
                member.RoleInTeam = request.RoleInTeam;
                if (member.AssignedAt == default) member.AssignedAt = now;

                if (!wasActive) notifyUserIds.Add(uid); // RE-ACTIVE thì notify lại (tuỳ bạn)
            }
        }

        // TẠO NOTIFICATIONS
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

        await _db.SaveChangesAsync(ct);
    }
}
