namespace Backend.Domains.outbound.Dtos
{
    public class ProcessIssueItem
    {
        public long DetailId { get; set; }
        public int BatchId { get; set; }
        public decimal Quantity { get; set; }
    }
}
