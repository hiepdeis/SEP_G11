namespace Backend.Services.Email;

public sealed class EmailMessage
{
    public string ToAddress { get; init; } = string.Empty;

    public string? ToName { get; init; }

    public string Subject { get; init; } = string.Empty;

    public string HtmlBody { get; init; } = string.Empty;
}
