using System;

namespace Backend.Domains.Audit.DTOs.Manager;

public class StockTakeDetailForManagerResponse
{
    public long Id { get; set; }          // StockTakeDetails.ID
    public int StockTakeId { get; set; }

    public int? BinId { get; set; }
    public string? BinCode { get; set; }

    public int? MaterialId { get; set; }
    public string? MaterialCode { get; set; }
    public string? MaterialName { get; set; }
    public string? Unit { get; set; }

    public int? BatchId { get; set; }
    public string? BatchCode { get; set; }

    public decimal? SystemQty { get; set; }
    public decimal? CountQty { get; set; }
    public decimal? Variance { get; set; }

    public string? LineStatus { get; set; }     // PendingCount / Counted / Discrepancy / Resolved
    public string? ReasonCode { get; set; }
    public string? ReasonNote { get; set; }

    public int? CountedBy { get; set; }
    public DateTime? CountedAt { get; set; }
}
