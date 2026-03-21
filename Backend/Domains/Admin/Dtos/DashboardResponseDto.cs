namespace Backend.Domains.Admin.Dtos
{
    public sealed class DashboardResponseDto
    {
        public DashboardSummaryDto Summary { get; set; } = new();
        public List<LowStockMaterialDto> LowStockMaterials { get; set; } = new();
        public List<RecentReceiptDto> RecentReceipts { get; set; } = new();
        public List<RecentIssueDto> RecentIssues { get; set; } = new();
    }

    public sealed class DashboardSummaryDto
    {
        public int TotalMaterials { get; set; }
        public int LowStockCount { get; set; }
        public int TodayReceipts { get; set; }
        public int TodayIssues { get; set; }
    }

    public sealed class LowStockMaterialDto
    {
        public int MaterialId { get; set; }
        public string Code { get; set; } = default!;
        public string Name { get; set; } = default!;
        public string Unit { get; set; } = default!;
        public decimal QuantityOnHand { get; set; }
        public decimal MinStockLevel { get; set; }
        public string WarehouseName { get; set; } = default!;
    }

    public sealed class RecentReceiptDto
    {
        public string Id { get; set; } = default!;
        public DateTime Date { get; set; }
        public string Supplier { get; set; } = default!;
        public int Items { get; set; }
        public string Status { get; set; } = default!;
        public string StatusKey { get; set; } = default!;
    }

    public sealed class RecentIssueDto
    {
        public string Id { get; set; } = default!;
        public DateTime Date { get; set; }
        public string Project { get; set; } = default!;
        public int Items { get; set; }
        public string Status { get; set; } = default!;
        public string StatusKey { get; set; } = default!;
    }
}