using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class InventoryCurrent
{
    public long Id { get; set; }

    public int WarehouseId { get; set; }

    public int BinId { get; set; }

    public int MaterialId { get; set; }

    public int BatchId { get; set; }

    public decimal? QuantityOnHand { get; set; }

    public decimal? QuantityAllocated { get; set; }

    public DateTime? LastUpdated { get; set; }

    public virtual Batch Batch { get; set; } = null!;

    public virtual BinLocation Bin { get; set; } = null!;

    public virtual Material Material { get; set; } = null!;

    public virtual Warehouse Warehouse { get; set; } = null!;
}
