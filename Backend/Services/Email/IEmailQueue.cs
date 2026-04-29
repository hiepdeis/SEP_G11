namespace Backend.Services.Email;

public interface IEmailQueue
{
    ValueTask EnqueueAsync(EmailMessage message, CancellationToken ct);

    IAsyncEnumerable<EmailMessage> DequeueAsync(CancellationToken ct);
}
