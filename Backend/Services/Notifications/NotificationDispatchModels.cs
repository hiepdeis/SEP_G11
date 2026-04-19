namespace Backend.Services.Notifications;

public sealed record NotificationRecipient(
    int UserId,
    string? DisplayName = null,
    string? Email = null);

public sealed class NotificationDispatchRequest
{
    public IReadOnlyCollection<NotificationRecipient> Recipients { get; init; } =
        Array.Empty<NotificationRecipient>();

    public string Message { get; init; } = string.Empty;

    public string? RelatedEntityType { get; init; }

    public long? RelatedEntityId { get; init; }

    public bool SendEmail { get; init; }

    public bool SaveChanges { get; init; } = true;
}

public sealed class NotificationDispatchResult
{
    public int NotificationCount { get; init; }

    public IReadOnlyList<long> NotificationIds { get; init; } = Array.Empty<long>();

    public DateTime CreatedAtUtc { get; init; }

    public bool EmailRequested { get; init; }

    public bool EmailConfigured { get; init; }

    public int EmailSentCount { get; init; }

    public int EmailMissingAddressCount { get; init; }

    public int EmailFailedCount { get; init; }
}
