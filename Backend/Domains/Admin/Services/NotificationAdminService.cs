using System.Net;
using Backend.Data;
using Backend.Domains.Admin.Dtos;
using Backend.Domains.Admin.Interface;
using Backend.Entities;
using Backend.Options;
using Backend.Services.Email;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Backend.Domains.Admin.Services
{
    public sealed class NotificationAdminService : INotificationAdminService
    {
        private readonly MyDbContext _db;
        private readonly IEmailSender _emailSender;
        private readonly EmailOptions _emailOptions;
        private readonly ILogger<NotificationAdminService> _logger;

        public NotificationAdminService(
            MyDbContext db,
            IEmailSender emailSender,
            IOptions<EmailOptions> emailOptions,
            ILogger<NotificationAdminService> logger)
        {
            _db = db;
            _emailSender = emailSender;
            _emailOptions = emailOptions.Value;
            _logger = logger;
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
            List<NotificationTarget> targets;

            if (mode == "all")
            {
                targets = await _db.Users
                    .AsNoTracking()
                    .Where(x => x.Status)
                    .Select(x => new NotificationTarget(
                        x.UserId,
                        x.FullName ?? x.Username,
                        x.Email))
                    .ToListAsync(ct);

                if (targets.Count == 0)
                    throw new ArgumentException("Không có người dùng active để gửi thông báo.");
            }
            else if (mode == "single")
            {
                if (!request.UserId.HasValue)
                    throw new ArgumentException("UserId là bắt buộc khi gửi cho một người dùng.");

                var user = await _db.Users
                    .AsNoTracking()
                    .Where(x => x.UserId == request.UserId.Value)
                    .Select(x => new NotificationTarget(
                        x.UserId,
                        x.FullName ?? x.Username,
                        x.Email))
                    .FirstOrDefaultAsync(ct);

                if (user == null)
                    throw new ArgumentException("Người dùng không tồn tại.");

                targets = new List<NotificationTarget> { user };
            }
            else
            {
                throw new ArgumentException("TargetMode chỉ chấp nhận 'single' hoặc 'all'.");
            }

            var distinctTargets = targets
                .GroupBy(x => x.UserId)
                .Select(x => x.First())
                .ToList();

            var now = DateTime.UtcNow;

            var entities = distinctTargets
                .Select(target => new Notification
                {
                    UserId = target.UserId,
                    Message = message,
                    IsRead = false,
                    CreatedAt = now
                })
                .ToList();

            _db.Notifications.AddRange(entities);
            await _db.SaveChangesAsync(ct);

            var emailResult = await SendNotificationEmailsAsync(
                distinctTargets,
                message,
                request.SendEmail,
                now,
                ct);

            return new NotificationCreateResultDto
            {
                SentCount = entities.Count,
                NotificationIds = entities.Select(x => x.NotiId).ToList(),
                EmailRequested = request.SendEmail,
                EmailConfigured = _emailSender.IsConfigured,
                EmailSentCount = emailResult.EmailSentCount,
                EmailMissingAddressCount = emailResult.EmailMissingAddressCount,
                EmailFailedCount = emailResult.EmailFailedCount
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

        private async Task<NotificationEmailDispatchResult> SendNotificationEmailsAsync(
            IReadOnlyCollection<NotificationTarget> targets,
            string message,
            bool sendEmail,
            DateTime createdAtUtc,
            CancellationToken ct)
        {
            if (!sendEmail || !_emailSender.IsConfigured)
            {
                return new NotificationEmailDispatchResult();
            }

            var result = new NotificationEmailDispatchResult();

            foreach (var target in targets)
            {
                ct.ThrowIfCancellationRequested();

                if (string.IsNullOrWhiteSpace(target.Email))
                {
                    result.EmailMissingAddressCount++;
                    continue;
                }

                try
                {
                    await _emailSender.SendAsync(
                        BuildNotificationEmail(target, message, createdAtUtc),
                        ct);
                    result.EmailSentCount++;
                }
                catch (Exception ex)
                {
                    result.EmailFailedCount++;
                    _logger.LogWarning(
                        ex,
                        "Failed to send notification email to user {UserId} ({Email})",
                        target.UserId,
                        target.Email);
                }
            }

            return result;
        }

        private EmailMessage BuildNotificationEmail(
            NotificationTarget target,
            string message,
            DateTime createdAtUtc)
        {
            var recipientName = string.IsNullOrWhiteSpace(target.DisplayName)
                ? $"User #{target.UserId}"
                : target.DisplayName.Trim();

            var normalizedMessage = WebUtility.HtmlEncode(message)
                .Replace("\r\n", "\n")
                .Replace("\n", "<br />");

            var createdAtText = createdAtUtc.ToLocalTime().ToString("dd/MM/yyyy HH:mm");
            var subject = string.IsNullOrWhiteSpace(_emailOptions.NotificationSubject)
                ? "[MatCost] Thong bao moi"
                : _emailOptions.NotificationSubject.Trim();

            return new EmailMessage
            {
                ToAddress = target.Email!,
                ToName = recipientName,
                Subject = subject,
                HtmlBody =
                    $$"""
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1f2937;">
                      <p>Xin chao {{WebUtility.HtmlEncode(recipientName)}},</p>
                      <p>Ban vua nhan duoc mot thong bao moi tu he thong MatCost.</p>
                      <div style="margin:16px 0;padding:12px 14px;border-left:4px solid #2563eb;background:#eff6ff;border-radius:8px;">
                        {{normalizedMessage}}
                      </div>
                      <p>Thoi gian tao: {{createdAtText}}</p>
                      <p>Vui long dang nhap vao he thong de xem them chi tiet.</p>
                    </div>
                    """
            };
        }

        private sealed record NotificationTarget(
            int UserId,
            string DisplayName,
            string? Email);

        private sealed class NotificationEmailDispatchResult
        {
            public int EmailSentCount { get; set; }
            public int EmailMissingAddressCount { get; set; }
            public int EmailFailedCount { get; set; }
        }
    }
}
