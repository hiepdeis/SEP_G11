namespace Backend.Domains.outbound.Dtos
{
    public class ProcessIssueRequest
    {
        public List<ProcessIssueItem> Items { get; set; } = new();
    }
}
