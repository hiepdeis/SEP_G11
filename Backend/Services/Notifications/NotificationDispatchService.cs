using System.Net;
using Backend.Data;
using Backend.Entities;
using Backend.Options;
using Backend.Services.Email;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Backend.Services.Notifications;

/// <summary>
/// Tạo thông báo trong hệ thống và tùy chọn gửi email thông báo.
/// Service này được dùng chung cho luồng Admin và Import để giữ hành vi nhất quán.
/// </summary>
public sealed class NotificationDispatchService : INotificationDispatcher
{
    private const int MaxRelatedEntityTypeLength = 50;

    private readonly MyDbContext _db;
    private readonly IEmailSender _emailSender;
    private readonly IEmailQueue _emailQueue;
    private readonly EmailOptions _emailOptions;
    private readonly ILogger<NotificationDispatchService> _logger;

    public NotificationDispatchService(
        MyDbContext db,
        IEmailSender emailSender,
        IEmailQueue emailQueue,
        IOptions<EmailOptions> emailOptions,
        ILogger<NotificationDispatchService> logger)
    {
        _db = db;
        _emailSender = emailSender;
        _emailQueue = emailQueue;
        _emailOptions = emailOptions.Value;
        _logger = logger;
    }

    public async Task<NotificationDispatchResult> DispatchAsync(
        NotificationDispatchRequest request,
        CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(request);
        ct.ThrowIfCancellationRequested();

        // Chặn các vi phạm business rule trước khi có bất kỳ side effect nào trên DB.
        ValidateDispatchRequest(request.SendEmail, request.SaveChanges, request.RelatedEntityType);

        // Message rỗng nghĩa là không có thông báo hợp lệ để tạo.
        var normalizedMessage = request.Message?.Trim() ?? string.Empty;
        if (normalizedMessage.Length == 0)
            return CreateEmptyResult(request.SendEmail);

        // Loại trùng người nhận theo UserId để tránh tạo/gửi trùng.
        var recipients = NormalizeRecipients(request.Recipients ?? Array.Empty<NotificationRecipient>());
        if (recipients.Count == 0)
            return CreateEmptyResult(request.SendEmail);

        var createdAtUtc = DateTime.UtcNow;
        var relatedEntityType = NormalizeRelatedEntityType(request.RelatedEntityType);

        var notifications = BuildNotifications(
            recipients,
            normalizedMessage,
            relatedEntityType,
            request.RelatedEntityId,
            createdAtUtc);

        _db.Notifications.AddRange(notifications);

        // Ưu tiên lưu DB trước để Notification id được tạo trước khi gửi email.
        if (request.SaveChanges)
            await _db.SaveChangesAsync(ct);

        var emailRecipients = ResolveEmailRecipients(request, recipients);

        var emailResult = request.SendEmail
            ? await SendNotificationEmailsAsync(
                emailRecipients,
                normalizedMessage,
                createdAtUtc,
                request.SendEmailInBackground,
                ct)
            : new EmailDispatchCounters();

        return CreateResult(
            notificationCount: notifications.Count,
            notificationIds: notifications.Where(x => x.NotiId > 0).Select(x => x.NotiId).ToList(),
            createdAtUtc,
            request.SendEmail,
            emailResult);
    }

    public async Task<NotificationDispatchResult> DispatchToRoleAsync(
        NotificationRoleDispatchRequest request,
        CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(request);
        ct.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(request.RoleName))
            throw new ArgumentException("RoleName is required.", nameof(request.RoleName));

        var recipients = await GetRecipientsByRoleAsync(
            request.RoleName.Trim(),
            request.OnlyActiveUsers,
            ct);

        var fallbackApplied = false;

        if (recipients.Count == 0 && !string.IsNullOrWhiteSpace(request.FallbackRoleName))
        {
            recipients = await GetRecipientsByRoleAsync(
                request.FallbackRoleName.Trim(),
                request.OnlyActiveUsers,
                ct);
            fallbackApplied = true;
        }

        IReadOnlyCollection<NotificationRecipient>? emailRecipientsOverride = null;
        if (request.SendEmail)
        {
            var hasEmail = recipients.Any(r => !string.IsNullOrWhiteSpace(r.Email));

            if (!hasEmail)
            {
                if (!fallbackApplied && !string.IsNullOrWhiteSpace(request.FallbackRoleName))
                {
                    var fallbackRecipients = await GetRecipientsByRoleAsync(
                        request.FallbackRoleName.Trim(),
                        request.OnlyActiveUsers,
                        ct);

                    if (fallbackRecipients.Any(r => !string.IsNullOrWhiteSpace(r.Email)))
                    {
                        emailRecipientsOverride = fallbackRecipients;
                    }
                    else
                    {
                        _logger.LogWarning(
                            "Email requested for role {RoleName}, but no valid email addresses were found.",
                            request.RoleName);
                    }
                }
                else
                {
                    _logger.LogWarning(
                        "Email requested for role {RoleName}, but no valid email addresses were found.",
                        request.RoleName);
                }
            }
        }

        // Tái sử dụng cùng pipeline để tất cả business rule nằm tại một nơi.
        return await DispatchAsync(
            new NotificationDispatchRequest
            {
                Recipients = recipients,
                EmailRecipientsOverride = emailRecipientsOverride,
                Message = request.Message,
                RelatedEntityType = request.RelatedEntityType,
                RelatedEntityId = request.RelatedEntityId,
                SendEmail = request.SendEmail,
                SaveChanges = request.SaveChanges,
                SendEmailInBackground = request.SendEmailInBackground
            },
            ct);
    }

    private static List<NotificationRecipient> ResolveEmailRecipients(
        NotificationDispatchRequest request,
        List<NotificationRecipient> recipients)
    {
        if (request.EmailRecipientsOverride is null)
            return recipients;

        return NormalizeRecipients(request.EmailRecipientsOverride);
    }

    private static void ValidateDispatchRequest(
        bool sendEmail,
        bool saveChanges,
        string? relatedEntityType)
    {
        if (sendEmail && !saveChanges)
        {
            throw new InvalidOperationException(
                "Email dispatch requires SaveChanges=true to avoid sending emails for unsaved notifications.");
        }

        if (!string.IsNullOrWhiteSpace(relatedEntityType) &&
            relatedEntityType.Trim().Length > MaxRelatedEntityTypeLength)
        {
            throw new ArgumentException(
                "RelatedEntityType cannot exceed 50 characters.",
                nameof(relatedEntityType));
        }
    }

    private static string? NormalizeRelatedEntityType(string? relatedEntityType)
    {
        return string.IsNullOrWhiteSpace(relatedEntityType)
            ? null
            : relatedEntityType.Trim();
    }

    private static List<NotificationRecipient> NormalizeRecipients(
        IEnumerable<NotificationRecipient> recipients)
    {
        return recipients
            .Where(x => x.UserId > 0)
            .GroupBy(x => x.UserId)
            .Select(group => new NotificationRecipient(
                UserId: group.Key,
                DisplayName: SelectFirstNonEmpty(group.Select(x => x.DisplayName)),
                Email: SelectFirstNonEmpty(group.Select(x => x.Email))))
            .ToList();
    }

    private static string? SelectFirstNonEmpty(IEnumerable<string?> values)
    {
        foreach (var value in values)
        {
            if (!string.IsNullOrWhiteSpace(value))
                return value.Trim();
        }

        return null;
    }

    private List<Notification> BuildNotifications(
        IReadOnlyCollection<NotificationRecipient> recipients,
        string message,
        string? relatedEntityType,
        long? relatedEntityId,
        DateTime createdAtUtc)
    {
        return recipients
            .Select(recipient => new Notification
            {
                UserId = recipient.UserId,
                Message = message,
                RelatedEntityType = relatedEntityType,
                RelatedEntityId = relatedEntityId,
                IsRead = false,
                CreatedAt = createdAtUtc
            })
            .ToList();
    }

    private async Task<List<NotificationRecipient>> GetRecipientsByRoleAsync(
        string roleName,
        bool onlyActiveUsers,
        CancellationToken ct)
    {
        // Luồng gửi theo role được dùng nhiều trong các bước chuyển trạng thái Import.
        var query = _db.Users.AsNoTracking().Where(u => u.Role.RoleName == roleName);

        if (onlyActiveUsers)
            query = query.Where(u => u.Status);

        return await query
            .Select(u => new NotificationRecipient(
                u.UserId,
                string.IsNullOrWhiteSpace(u.FullName) ? u.Username : u.FullName,
                u.Email))
            .ToListAsync(ct);
    }

    private NotificationDispatchResult CreateEmptyResult(bool emailRequested)
    {
        return CreateResult(
            notificationCount: 0,
            notificationIds: Array.Empty<long>(),
            createdAtUtc: DateTime.UtcNow,
            emailRequested,
            new EmailDispatchCounters());
    }

    private NotificationDispatchResult CreateResult(
        int notificationCount,
        IReadOnlyList<long> notificationIds,
        DateTime createdAtUtc,
        bool emailRequested,
        EmailDispatchCounters emailResult)
    {
        return new NotificationDispatchResult
        {
            NotificationCount = notificationCount,
            NotificationIds = notificationIds,
            CreatedAtUtc = createdAtUtc,
            EmailRequested = emailRequested,
            EmailConfigured = _emailSender.IsConfigured,
            EmailSentCount = emailResult.EmailSentCount,
            EmailMissingAddressCount = emailResult.EmailMissingAddressCount,
            EmailFailedCount = emailResult.EmailFailedCount
        };
    }

    private async Task<EmailDispatchCounters> SendNotificationEmailsAsync(
        IReadOnlyCollection<NotificationRecipient> recipients,
        string message,
        DateTime createdAtUtc,
        bool sendInBackground,
        CancellationToken ct)
    {
        if (!_emailSender.IsConfigured)
        {
            _logger.LogWarning(
                "Email delivery was requested for notifications, but SMTP is not configured correctly.");
            return new EmailDispatchCounters();
        }

        if (sendInBackground)
        {
            return await QueueNotificationEmailsAsync(recipients, message, createdAtUtc, ct);
        }

        var result = new EmailDispatchCounters();

        foreach (var recipient in recipients)
        {
            ct.ThrowIfCancellationRequested();

            if (string.IsNullOrWhiteSpace(recipient.Email))
            {
                result.EmailMissingAddressCount++;
                continue;
            }

            try
            {
                await _emailSender.SendAsync(
                    BuildNotificationEmail(recipient, message, createdAtUtc),
                    ct);
                result.EmailSentCount++;
            }
            catch (Exception ex)
            {
                result.EmailFailedCount++;
                _logger.LogWarning(
                    ex,
                    "Failed to send notification email to user {UserId} ({Email})",
                    recipient.UserId,
                    recipient.Email);
            }
        }

        return result;
    }

    private async Task<EmailDispatchCounters> QueueNotificationEmailsAsync(
        IReadOnlyCollection<NotificationRecipient> recipients,
        string message,
        DateTime createdAtUtc,
        CancellationToken ct)
    {
        var result = new EmailDispatchCounters();

        foreach (var recipient in recipients)
        {
            ct.ThrowIfCancellationRequested();

            if (string.IsNullOrWhiteSpace(recipient.Email))
            {
                result.EmailMissingAddressCount++;
                continue;
            }

            await _emailQueue.EnqueueAsync(
                BuildNotificationEmail(recipient, message, createdAtUtc),
                ct);

            result.EmailSentCount++;
        }

        return result;
    }

    private EmailMessage BuildNotificationEmail(
        NotificationRecipient recipient,
        string message,
        DateTime createdAtUtc)
    {
        var recipientName = string.IsNullOrWhiteSpace(recipient.DisplayName)
            ? $"User #{recipient.UserId}"
            : recipient.DisplayName.Trim();

        var normalizedMessage = WebUtility.HtmlEncode(message)
            .Replace("\r\n", "\n")
            .Replace("\n", "<br />");

        var createdAtText = createdAtUtc.ToLocalTime().ToString("dd/MM/yyyy HH:mm");
        var subject = string.IsNullOrWhiteSpace(_emailOptions.NotificationSubject)
            ? "[MatCost] Thong bao moi"
            : _emailOptions.NotificationSubject.Trim();

        return new EmailMessage
        {
            ToAddress = recipient.Email!,
            ToName = recipientName,
            Subject = subject,
            HtmlBody =
                    $$"""
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1f2937;">
                    <p>Xin chào {{WebUtility.HtmlEncode(recipientName)}},</p>
                    <p>Bạn vừa nhận được một thông báo mới từ hệ thống MatCost.</p>
                    <div style="margin:16px 0;padding:12px 14px;border-left:4px solid #2563eb;background:#eff6ff;border-radius:8px;">
                        {{normalizedMessage}}
                    </div>
                    <p>Thời gian tạo: {{createdAtText}}</p>
                    <p>Vui lòng đăng nhập vào hệ thống để xem thêm chi tiết.</p>
                    </div>
                    """
        };
    }

    /// <summary>
    /// Bộ đếm nội bộ để tổng hợp NotificationDispatchResult.
    /// </summary>
    private sealed class EmailDispatchCounters
    {
        public int EmailSentCount { get; set; }

        public int EmailMissingAddressCount { get; set; }

        public int EmailFailedCount { get; set; }
    }
}