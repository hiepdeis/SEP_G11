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

    private string NormalizedHost => _options.Host.Trim();

    private string NormalizedFromAddress => _options.FromAddress.Trim();

    private string? NormalizedUsername =>
        string.IsNullOrWhiteSpace(_options.Username)
            ? null
            : _options.Username.Trim();

    private bool RequiresCredentials =>
        !string.IsNullOrWhiteSpace(NormalizedUsername) ||
        !string.IsNullOrWhiteSpace(NormalizedPassword) ||
        NormalizedHost.Equals("smtp.gmail.com", StringComparison.OrdinalIgnoreCase);

    private string? NormalizedPassword
    {
        get
        {
            if (string.IsNullOrWhiteSpace(_options.Password))
                return null;

            var password = _options.Password.Trim();

            // Gmail app passwords are commonly copied with spaces between groups.
            if (NormalizedHost.Equals("smtp.gmail.com", StringComparison.OrdinalIgnoreCase))
                return password.Replace(" ", string.Empty);

            return password;
        }
    }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(NormalizedHost) &&
        _options.Port > 0 &&
        IsValidEmailAddress(NormalizedFromAddress) &&
        (!RequiresCredentials ||
         (!string.IsNullOrWhiteSpace(NormalizedUsername) &&
          !string.IsNullOrWhiteSpace(NormalizedPassword)));

    public async Task SendAsync(EmailMessage message, CancellationToken ct)
    {
        if (!IsConfigured)
        {
            throw new InvalidOperationException("SMTP email is not configured.");
        }

        ct.ThrowIfCancellationRequested();

        using var mail = new MailMessage
        {
            From = new MailAddress(NormalizedFromAddress, _options.FromName, Encoding.UTF8),
            Subject = message.Subject,
            SubjectEncoding = Encoding.UTF8,
            Body = message.HtmlBody,
            BodyEncoding = Encoding.UTF8,
            IsBodyHtml = true
        };

        mail.To.Add(new MailAddress(message.ToAddress, message.ToName, Encoding.UTF8));

        using var client = new SmtpClient(NormalizedHost, _options.Port)
        {
            EnableSsl = _options.EnableSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            Timeout = 30000
        };

        if (!string.IsNullOrWhiteSpace(NormalizedUsername))
        {
            client.Credentials = new NetworkCredential(
                NormalizedUsername,
                NormalizedPassword ?? string.Empty);
        }

        _logger.LogInformation("Sending notification email to {Email}", message.ToAddress);
        await client.SendMailAsync(mail);
    }

    private static bool IsValidEmailAddress(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return false;

        try
        {
            _ = new MailAddress(value);
            return true;
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
