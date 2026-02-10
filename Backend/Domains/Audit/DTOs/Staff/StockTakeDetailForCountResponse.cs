namespace Backend.Domains.Audit.DTOs.Staff;

public class StockTakeDetailForCountResponse
{
    public long Id { get; set; }

    public int? BinId { get; set; }
    public string? BinCode { get; set; }

    public int MaterialId { get; set; }
    public string? MaterialCode { get; set; }
    public string? MaterialName { get; set; }
    public string? Unit { get; set; }

    public int? BatchId { get; set; }
    public string? BatchCode { get; set; }

    public decimal? CountQty { get; set; }
    public string? LineStatus { get; set; } // PendingCount / Counted / Discrepancy / Resolved
}
