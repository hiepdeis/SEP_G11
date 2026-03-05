namespace Backend.Domains.outbound.Dtos
{
    public class IssueSlipListDto
    {
        public long IssueId { get; set; }
        public string IssueCode { get; set; } = null!;
        public string ProjectName { get; set; } = null!;
        public string WarehouseName { get; set; } = null!;
        public string? IssueDate { get; set; }
        public string? Status { get; set; }
    }
}
