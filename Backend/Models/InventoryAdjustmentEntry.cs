using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class InventoryAdjustmentEntry
{
    public long EntryId { get; set; }

    public int StockTakeId { get; set; }

    public long StockTakeDetailId { get; set; }

    public int? WarehouseId { get; set; }

    public int? BinId { get; set; }

    public int? MaterialId { get; set; }

    public int? BatchId { get; set; }

    public decimal QtyDelta { get; set; }

    public int? ReasonId { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public int? CreatedBy { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public int? ApprovedBy { get; set; }

    public DateTime? PostedAt { get; set; }

    public virtual User? ApprovedByNavigation { get; set; }

    public virtual Batch? Batch { get; set; }

    public virtual BinLocation? Bin { get; set; }

    public virtual User? CreatedByNavigation { get; set; }

    public virtual Material? Material { get; set; }

    public virtual AdjustmentReason? Reason { get; set; }

    public virtual StockTake StockTake { get; set; } = null!;

    public virtual StockTakeDetail StockTakeDetail { get; set; } = null!;

    public virtual Warehouse? Warehouse { get; set; }
}
