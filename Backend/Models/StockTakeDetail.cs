using System;

namespace Backend.Models;

public partial class StockTakeDetail
{
    public long Id { get; set; }

    public int? StockTakeId { get; set; }

    public int? MaterialId { get; set; }
    public int? BatchId { get; set; }

    // Optional (only if your inventory is per-bin)
    public int? BinId { get; set; }

    // "Blind count": staff should not see this on UI, but backend stores it
    public decimal? SystemQty { get; set; }

    // Physical count entered by staff
    public decimal? CountQty { get; set; }

    public decimal? Variance { get; set; }

    // Variance reason
    public string? ReasonCode { get; set; }   // e.g. BROKEN / LOST / FOUND / ADMIN_ERROR
    public string? ReasonNote { get; set; }

    // Line status: PendingCount / Counted / Discrepancy / Resolved / etc.
    public string? LineStatus { get; set; }

    // Audit trail for counting
    public int? CountedBy { get; set; }
    public DateTime? CountedAt { get; set; }

    // Reconcile / resolve discrepancy
    public string? ResolutionAction { get; set; } // AdjustToCount / RequestRecount / Ignore / etc.
    public int? ResolvedBy { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string? ManagerNote { get; set; }

    public virtual StockTake? StockTake { get; set; }
    public virtual Material? Material { get; set; }
    public virtual Batch? Batch { get; set; }

    // Optional (only if you have Bin entity)
    public virtual BinLocation? Bin { get; set; }

    public virtual User? CountedByNavigation { get; set; }
    public virtual User? ResolvedByNavigation { get; set; }
}
