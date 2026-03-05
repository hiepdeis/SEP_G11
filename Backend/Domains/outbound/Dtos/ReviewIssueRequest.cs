namespace Backend.Domains.outbound.Dtos
{
    public class ReviewIssueRequest
    {
        public string Action { get; set; } = null!;
        public string? Reason { get; set; }
    }
}
