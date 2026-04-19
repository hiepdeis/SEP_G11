using System.Net;
using Backend.Data;
using Backend.Entities;
using Backend.Options;
using Backend.Services.Email;
using Microsoft.Extensions.Options;

namespace Backend.Services.Notifications;

public sealed class NotificationDispatchService : INotificationDispatcher
{
    private readonly MyDbContext _db;
    private readonly IEmailSender _emailSender;
    private readonly EmailOptions _emailOptions;
    private readonly ILogger<NotificationDispatchService> _logger;

    public NotificationDispatchService(
        MyDbContext db,
        IEmailSender emailSender,
        IOptions<EmailOptions> emailOptions,
        ILogger<NotificationDispatchService> logger)
    {
        _db = db;
        _emailSender = emailSender;
        _emailOptions = emailOptions.Value;
        _logger = logger;
    }

    public async Task<NotificationDispatchResult> DispatchAsync(
        NotificationDispatchRequest request,
        CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (request.SendEmail && !request.SaveChanges)
        {
            throw new InvalidOperationException(
                "Email dispatch requires SaveChanges=true to avoid sending emails for unsaved notifications.");
        }

        var normalizedMessage = request.Message?.Trim();
        if (string.IsNullOrWhiteSpace(normalizedMessage))
        {
            return CreateResult(
                notificationCount: 0,
                notificationIds: Array.Empty<long>(),
                createdAtUtc: DateTime.UtcNow,
                request.SendEmail,
                new NotificationEmailDispatchResult());
        }

        var recipients = request.Recipients
            .Where(x => x.UserId > 0)
            .GroupBy(x => x.UserId)
            .Select(x => x.First())
            .ToList();

        if (recipients.Count == 0)
        {
            return CreateResult(
                notificationCount: 0,
                notificationIds: Array.Empty<long>(),
                createdAtUtc: DateTime.UtcNow,
                request.SendEmail,
                new NotificationEmailDispatchResult());
        }

        var now = DateTime.UtcNow;
        var relatedEntityType = string.IsNullOrWhiteSpace(request.RelatedEntityType)
            ? null
            : request.RelatedEntityType.Trim();

        var notifications = recipients
            .Select(recipient => new Notification
            {
                UserId = recipient.UserId,
                Message = normalizedMessage,
                RelatedEntityType = relatedEntityType,
                RelatedEntityId = request.RelatedEntityId,
                IsRead = false,
                CreatedAt = now
            })
            .ToList();

        _db.Notifications.AddRange(notifications);

        if (request.SaveChanges)
        {
            await _db.SaveChangesAsync(ct);
        }

        var emailResult = request.SendEmail
            ? await SendNotificationEmailsAsync(recipients, normalizedMessage, now, ct)
            : new NotificationEmailDispatchResult();

        return CreateResult(
            notificationCount: notifications.Count,
            notificationIds: notifications
                .Where(x => x.NotiId > 0)
                .Select(x => x.NotiId)
                .ToList(),
            createdAtUtc: now,
            request.SendEmail,
            emailResult);
    }

    private NotificationDispatchResult CreateResult(
        int notificationCount,
        IReadOnlyList<long> notificationIds,
        DateTime createdAtUtc,
        bool emailRequested,
        NotificationEmailDispatchResult emailResult)
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

    private async Task<NotificationEmailDispatchResult> SendNotificationEmailsAsync(
        IReadOnlyCollection<NotificationRecipient> recipients,
        string message,
        DateTime createdAtUtc,
        CancellationToken ct)
    {
        if (!_emailSender.IsConfigured)
        {
            _logger.LogWarning(
                "Email delivery was requested for notifications, but SMTP is not configured correctly.");
            return new NotificationEmailDispatchResult();
        }

        var result = new NotificationEmailDispatchResult();

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

    private sealed class NotificationEmailDispatchResult
    {
        public int EmailSentCount { get; set; }

        public int EmailMissingAddressCount { get; set; }

        public int EmailFailedCount { get; set; }
    }
}
