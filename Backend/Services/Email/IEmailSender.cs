namespace Backend.Services.Email;

public interface IEmailSender
{
    bool IsConfigured { get; }

    Task SendAsync(EmailMessage message, CancellationToken ct);
}
