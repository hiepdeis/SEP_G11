using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class StockTakeDetail
{
    public long Id { get; set; }

    public int StockTakeId { get; set; }

    public int MaterialId { get; set; }

    public int? BatchId { get; set; }

    public decimal? SystemQty { get; set; }

    public decimal? CountQty { get; set; }

    public decimal? Variance { get; set; }

    public string? Reason { get; set; }

    public int? BinId { get; set; }

    public int? CountedBy { get; set; }

    public DateTime? CountedAt { get; set; }

    public string? DiscrepancyStatus { get; set; }

    public string? ResolutionAction { get; set; }

    public int? AdjustmentReasonId { get; set; }

    public int? ResolvedBy { get; set; }

    public DateTime? ResolvedAt { get; set; }

    public virtual AdjustmentReason? AdjustmentReason { get; set; }

    public virtual Batch? Batch { get; set; }

    public virtual BinLocation? Bin { get; set; }

    public virtual User? CountedByNavigation { get; set; }

    public virtual ICollection<InventoryAdjustmentEntry> InventoryAdjustmentEntries { get; set; } = new List<InventoryAdjustmentEntry>();

    public virtual Material Material { get; set; } = null!;

    public virtual User? ResolvedByNavigation { get; set; }

    public virtual StockTake StockTake { get; set; } = null!;
}
