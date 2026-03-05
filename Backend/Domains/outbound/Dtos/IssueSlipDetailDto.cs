namespace Backend.Domains.outbound.Dtos
{
    public class IssueSlipDetailDto
    {
        public long IssueId { get; set; }
        public string IssueCode { get; set; } = null!;
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = null!;
        public int? WarehouseId { get; set; }
        public string? WarehouseName { get; set; }
        public string? IssueDate { get; set; }
        public string? Status { get; set; }
        public int CreatedBy { get; set; }
        public string CreatedByName { get; set; } = null!;
        public string? Description { get; set; }
        public List<IssueSlipMaterialDetailDto> Details { get; set; } = new();

    }
}
