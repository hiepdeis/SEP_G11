namespace Backend.Services.Notifications;

public interface INotificationDispatcher
{
    Task<NotificationDispatchResult> DispatchAsync(
        NotificationDispatchRequest request,
        CancellationToken ct);
}
