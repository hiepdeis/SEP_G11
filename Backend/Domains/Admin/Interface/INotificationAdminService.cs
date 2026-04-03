using Backend.Domains.Admin.Dtos;

namespace Backend.Domains.Admin.Interface
{
    public interface INotificationAdminService
    {
        Task<NotificationPagedResult<NotificationListItemDto>> GetNotificationsAsync(
            NotificationQueryDto query,
            CancellationToken ct);

        Task<List<NotificationUserLookupDto>> GetUsersAsync(CancellationToken ct);

        Task<NotificationCreateResultDto> CreateAsync(
            CreateNotificationDto request,
            CancellationToken ct);

        Task<bool> MarkAsReadAsync(long notiId, CancellationToken ct);

        Task<int> MarkAllAsReadAsync(int? userId, CancellationToken ct);

        Task<bool> DeleteAsync(long notiId, CancellationToken ct);
    }
}
