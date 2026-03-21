using Backend.Data;
using Backend.Domains.Admin.Dtos;
using Backend.Domains.Admin.Interface;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Domains.Admin.Services
{
    public sealed class NotificationAdminService : INotificationAdminService
    {
        private readonly MyDbContext _db;

        public NotificationAdminService(MyDbContext db)
        {
            _db = db;
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

            var mode = (request.TargetMode ?? "single").Trim().ToLowerInvariant();

            List<int> targetUserIds;

            if (mode == "all")
            {
                targetUserIds = await _db.Users
                    .AsNoTracking()
                    .Where(x => x.Status)
                    .Select(x => x.UserId)
                    .ToListAsync(ct);

                if (targetUserIds.Count == 0)
                    throw new ArgumentException("Không có người dùng active để gửi thông báo.");
            }
            else if (mode == "single")
            {
                if (!request.UserId.HasValue)
                    throw new ArgumentException("UserId là bắt buộc khi gửi cho một người dùng.");

                var userExists = await _db.Users
                    .AsNoTracking()
                    .AnyAsync(x => x.UserId == request.UserId.Value, ct);

                if (!userExists)
                    throw new ArgumentException("Người dùng không tồn tại.");

                targetUserIds = new List<int> { request.UserId.Value };
            }
            else
            {
                throw new ArgumentException("TargetMode chỉ chấp nhận 'single' hoặc 'all'.");
            }

            var now = DateTime.UtcNow;

            var entities = targetUserIds
                .Distinct()
                .Select(userId => new Notification
                {
                    UserId = userId,
                    Message = message,
                    IsRead = false,
                    CreatedAt = now
                })
                .ToList();

            _db.Notifications.AddRange(entities);
            await _db.SaveChangesAsync(ct);

            return new NotificationCreateResultDto
            {
                SentCount = entities.Count,
                NotificationIds = entities.Select(x => x.NotiId).ToList()
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