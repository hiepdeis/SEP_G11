using System.Net;
using System.Net.Mail;
using System.Text;
using Backend.Options;
using Microsoft.Extensions.Options;

namespace Backend.Services.Email;

public sealed class SmtpEmailSender : IEmailSender
{
    private readonly EmailOptions _options;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(
        IOptions<EmailOptions> options,
        ILogger<SmtpEmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_options.Host) &&
        _options.Port > 0 &&
        !string.IsNullOrWhiteSpace(_options.FromAddress);

    public async Task SendAsync(EmailMessage message, CancellationToken ct)
    {
        if (!IsConfigured)
        {
            throw new InvalidOperationException("SMTP email is not configured.");
        }

        ct.ThrowIfCancellationRequested();

        using var mail = new MailMessage
        {
            From = new MailAddress(_options.FromAddress, _options.FromName, Encoding.UTF8),
            Subject = message.Subject,
            SubjectEncoding = Encoding.UTF8,
            Body = message.HtmlBody,
            BodyEncoding = Encoding.UTF8,
            IsBodyHtml = true
        };

        mail.To.Add(new MailAddress(message.ToAddress, message.ToName, Encoding.UTF8));

        using var client = new SmtpClient(_options.Host, _options.Port)
        {
            EnableSsl = _options.EnableSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network
        };

        if (!string.IsNullOrWhiteSpace(_options.Username))
        {
            client.Credentials = new NetworkCredential(
                _options.Username,
                _options.Password ?? string.Empty);
        }

        _logger.LogInformation("Sending notification email to {Email}", message.ToAddress);
        await client.SendMailAsync(mail);
    }
}
