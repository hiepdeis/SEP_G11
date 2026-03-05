namespace Backend.Domains.outbound.Dtos
{
    public class IssueSlipMaterialDetailDto
    {
        public long DetailId { get; set; }
        public int MaterialId { get; set; }
        public string MaterialName { get; set; } = null!;
        public string? Unit { get; set; }
        public decimal RequestedQty { get; set; }
        public decimal TotalStock { get; set; }
        public bool IsEnough { get; set; }
        public string Message { get; set; } = null!;
    }
}
