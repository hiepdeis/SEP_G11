using Backend.Data;
using Backend.Domains.Audit.Interfaces;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Audit.Services;

public sealed class AuditNotificationService : IAuditNotificationService
{
    private readonly MyDbContext _db;

    public AuditNotificationService(MyDbContext db)
    {
        _db = db;
    }

    public async Task QueueNotificationAsync(
        IEnumerable<int> userIds,
        string message,
        string relatedEntityType,
        long? relatedEntityId,
        CancellationToken ct)
    {
        var normalizedMessage = message?.Trim();
        if (string.IsNullOrWhiteSpace(normalizedMessage))
            return;

        var distinctUserIds = userIds
            .Where(x => x > 0)
            .Distinct()
            .ToList();

        if (distinctUserIds.Count == 0)
            return;

        var activeUserIds = await _db.Users
            .AsNoTracking()
            .Where(x => x.Status && distinctUserIds.Contains(x.UserId))
            .Select(x => x.UserId)
            .ToListAsync(ct);

        if (activeUserIds.Count == 0)
            return;

        var now = DateTime.UtcNow;
        foreach (var userId in activeUserIds)
        {
            _db.Notifications.Add(new Notification
            {
                UserId = userId,
                Message = normalizedMessage,
                RelatedEntityType = relatedEntityType,
                RelatedEntityId = relatedEntityId,
                IsRead = false,
                CreatedAt = now
            });
        }
    }

    public async Task QueueAuditNotificationAsync(
        int stockTakeId,
        string message,
        bool includeCreator,
        bool includeTeamMembers,
        IEnumerable<string>? roleNames,
        IEnumerable<int>? extraUserIds,
        IEnumerable<int>? excludeUserIds,
        CancellationToken ct)
    {
        var recipientIds = new HashSet<int>();

        if (includeCreator)
        {
            var createdByUserId = await _db.StockTakes
                .AsNoTracking()
                .Where(x => x.StockTakeId == stockTakeId)
                .Select(x => x.CreatedBy)
                .FirstOrDefaultAsync(ct);

            if (createdByUserId > 0)
                recipientIds.Add(createdByUserId);
        }

        if (includeTeamMembers)
        {
            var teamUserIds = await _db.StockTakeTeamMembers
                .AsNoTracking()
                .Where(x =>
                    x.StockTakeId == stockTakeId &&
                    (x.IsActive || x.MemberCompletedAt != null))
                .Select(x => x.UserId)
                .Distinct()
                .ToListAsync(ct);

            foreach (var userId in teamUserIds)
                recipientIds.Add(userId);
        }

        var normalizedRoleNames = roleNames?
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim().ToLowerInvariant())
            .Distinct()
            .ToList();

        if (normalizedRoleNames is { Count: > 0 })
        {
            var roleUserIds = await (
                from u in _db.Users.AsNoTracking()
                join r in _db.Roles.AsNoTracking() on u.RoleId equals r.RoleId
                where u.Status && normalizedRoleNames.Contains(r.RoleName.ToLower())
                select u.UserId
            ).ToListAsync(ct);

            foreach (var userId in roleUserIds)
                recipientIds.Add(userId);
        }

        if (extraUserIds != null)
        {
            foreach (var userId in extraUserIds.Where(x => x > 0))
                recipientIds.Add(userId);
        }

        if (excludeUserIds != null)
        {
            foreach (var userId in excludeUserIds.Where(x => x > 0))
                recipientIds.Remove(userId);
        }

        await QueueNotificationAsync(
            recipientIds,
            message,
            relatedEntityType: "Audit",
            relatedEntityId: stockTakeId,
            ct);
    }
}
