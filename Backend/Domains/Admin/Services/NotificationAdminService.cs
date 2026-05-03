using Backend.Data;
using Backend.Domains.Admin.Dtos;
using Backend.Domains.Admin.Interface;
using Backend.Services.Notifications;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Admin.Services
{
    public sealed class NotificationAdminService : INotificationAdminService
    {
        private readonly MyDbContext _db;
        private readonly INotificationDispatcher _notificationDispatcher;

        public NotificationAdminService(
            MyDbContext db,
            INotificationDispatcher notificationDispatcher)
        {
            _db = db;
            _notificationDispatcher = notificationDispatcher;
        }

        public async Task<NotificationPagedResult<NotificationListItemDto>> GetNotificationsAsync(
            NotificationQueryDto query,
            CancellationToken ct)
        {
            var page = query.Page <= 0 ? 1 : query.Page;
            var pageSize = query.PageSize <= 0 ? 8 : query.PageSize;
            if (pageSize > 100) pageSize = 100;

            var q =
                from n in _db.Notifications.AsNoTracking()
                join u in _db.Users.AsNoTracking() on n.UserId equals u.UserId
                join r in _db.Roles.AsNoTracking() on u.RoleId equals r.RoleId
                select new NotificationListItemDto
                {
                    NotiId = n.NotiId,
                    UserId = n.UserId,
                    UserFullName = u.FullName ?? "",
                    Username = u.Username,
                    RoleId = u.RoleId,
                    RoleName = r.RoleName,
                    Message = n.Message ?? "",
                    RelatedEntityType = n.RelatedEntityType,
                    RelatedEntityId = n.RelatedEntityId,
                    IsRead = n.IsRead ?? false,
                    CreatedAt = n.CreatedAt ?? DateTime.UtcNow
                };

            if (!string.IsNullOrWhiteSpace(query.Keyword))
            {
                var keyword = query.Keyword.Trim().ToLower();

                q = q.Where(x =>
                    x.Message.ToLower().Contains(keyword) ||
                    x.UserFullName.ToLower().Contains(keyword) ||
                    x.Username.ToLower().Contains(keyword) ||
                    x.RoleName.ToLower().Contains(keyword));
            }

            if (query.UserId.HasValue)
                q = q.Where(x => x.UserId == query.UserId.Value);

            if (query.IsRead.HasValue)
                q = q.Where(x => x.IsRead == query.IsRead.Value);

            q = q.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.NotiId);

            var totalItems = await q.CountAsync(ct);
            var items = await q
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(ct);

            foreach (var item in items)
            {
                item.CreatedAt = DateTime.SpecifyKind(item.CreatedAt, DateTimeKind.Utc);
            }

            return new NotificationPagedResult<NotificationListItemDto>
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = (int)Math.Ceiling(totalItems / (double)pageSize)
            };
        }

        public async Task<List<NotificationUserLookupDto>> GetUsersAsync(CancellationToken ct)
        {
            return await (
                from u in _db.Users.AsNoTracking()
                join r in _db.Roles.AsNoTracking() on u.RoleId equals r.RoleId
                orderby u.FullName, u.Username
                select new NotificationUserLookupDto
                {
                    UserId = u.UserId,
                    FullName = u.FullName ?? "",
                    Username = u.Username,
                    RoleId = u.RoleId,
                    RoleName = r.RoleName,
                    Status = u.Status
                }
            ).ToListAsync(ct);
        }

        public async Task<NotificationCreateResultDto> CreateAsync(
            CreateNotificationDto request,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.Message))
                throw new ArgumentException("Nội dung thông báo không được để trống.");

            var message = request.Message.Trim();

            if (message.Length < 10)
                throw new ArgumentException("Nội dung thông báo tối thiểu 10 ký tự.");

            if (message.Length > 500)
                throw new ArgumentException("Nội dung thông báo không được vượt quá 500 ký tự.");

            var relatedEntityType = string.IsNullOrWhiteSpace(request.RelatedEntityType)
                ? null
                : request.RelatedEntityType.Trim();
            var relatedEntityId = request.RelatedEntityId;
            var hasRelatedEntityType = relatedEntityType is not null;
            var hasRelatedEntityId = relatedEntityId.HasValue;

            if (hasRelatedEntityType != hasRelatedEntityId)
                throw new ArgumentException("RelatedEntityType and RelatedEntityId must be provided together.");

            if (relatedEntityType?.Length > 50)
                throw new ArgumentException("RelatedEntityType cannot exceed 50 characters.");

            var mode = (request.TargetMode ?? "single").Trim().ToLowerInvariant();
            List<NotificationRecipient> recipients;

            if (mode == "all")
            {
                recipients = await _db.Users
                    .AsNoTracking()
                    .Where(x => x.Status)
                    .Select(x => new NotificationRecipient(
                        x.UserId,
                        x.FullName ?? x.Username,
                        x.Email))
                    .ToListAsync(ct);

                if (recipients.Count == 0)
                    throw new ArgumentException("Không có người dùng active để gửi thông báo.");
            }
            else if (mode == "single")
            {
                if (!request.UserId.HasValue)
                    throw new ArgumentException("UserId là bắt buộc khi gửi cho một người dùng.");

                var user = await _db.Users
                    .AsNoTracking()
                    .Where(x => x.UserId == request.UserId.Value)
                    .Select(x => new NotificationRecipient(
                        x.UserId,
                        x.FullName ?? x.Username,
                        x.Email))
                    .FirstOrDefaultAsync(ct);

                if (user == null)
                    throw new ArgumentException("Người dùng không tồn tại.");

                recipients = new List<NotificationRecipient> { user };
            }
            else
            {
                throw new ArgumentException("TargetMode chỉ chấp nhận 'single' hoặc 'all'.");
            }

            var distinctRecipients = recipients
                .GroupBy(x => x.UserId)
                .Select(x => x.First())
                .ToList();

            var dispatchResult = await _notificationDispatcher.DispatchAsync(
                new NotificationDispatchRequest
                {
                    Recipients = distinctRecipients,
                    Message = message,
                    RelatedEntityType = relatedEntityType,
                    RelatedEntityId = relatedEntityId,
                    SendEmail = request.SendEmail,
                    SaveChanges = true
                },
                ct);

            return new NotificationCreateResultDto
            {
                SentCount = dispatchResult.NotificationCount,
                NotificationIds = dispatchResult.NotificationIds.ToList(),
                EmailRequested = dispatchResult.EmailRequested,
                EmailConfigured = dispatchResult.EmailConfigured,
                EmailSentCount = dispatchResult.EmailSentCount,
                EmailMissingAddressCount = dispatchResult.EmailMissingAddressCount,
                EmailFailedCount = dispatchResult.EmailFailedCount
            };
        }

        public async Task<bool> MarkAsReadAsync(long notiId, CancellationToken ct)
        {
            var entity = await _db.Notifications.FirstOrDefaultAsync(x => x.NotiId == notiId, ct);
            if (entity == null) return false;

            if (entity.IsRead != true)
            {
                entity.IsRead = true;
                await _db.SaveChangesAsync(ct);
            }

            return true;
        }

        public async Task<int> MarkAllAsReadAsync(int? userId, CancellationToken ct)
        {
            var q = _db.Notifications.Where(x => x.IsRead != true);

            if (userId.HasValue)
                q = q.Where(x => x.UserId == userId.Value);

            var items = await q.ToListAsync(ct);

            foreach (var item in items)
                item.IsRead = true;

            await _db.SaveChangesAsync(ct);
            return items.Count;
        }

        public async Task<bool> DeleteAsync(long notiId, CancellationToken ct)
        {
            var entity = await _db.Notifications.FirstOrDefaultAsync(x => x.NotiId == notiId, ct);
            if (entity == null) return false;

            _db.Notifications.Remove(entity);
            await _db.SaveChangesAsync(ct);
            return true;
        }
    }
}
