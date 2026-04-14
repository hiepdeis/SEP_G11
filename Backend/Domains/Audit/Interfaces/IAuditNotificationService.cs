namespace Backend.Domains.Audit.Interfaces;

public interface IAuditNotificationService
{
    Task QueueNotificationAsync(
        IEnumerable<int> userIds,
        string message,
        string relatedEntityType,
        long? relatedEntityId,
        CancellationToken ct);

    Task QueueAuditNotificationAsync(
        int stockTakeId,
        string message,
        bool includeCreator,
        bool includeTeamMembers,
        IEnumerable<string>? roleNames,
        IEnumerable<int>? extraUserIds,
        IEnumerable<int>? excludeUserIds,
        CancellationToken ct);
}
