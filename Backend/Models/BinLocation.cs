using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class BinLocation
{
    public int BinId { get; set; }

    public int WarehouseId { get; set; }

    public string Code { get; set; } = null!;

    public string? Type { get; set; }

    public virtual ICollection<InventoryAdjustmentEntry> InventoryAdjustmentEntries { get; set; } = new List<InventoryAdjustmentEntry>();

    public virtual ICollection<InventoryCurrent> InventoryCurrents { get; set; } = new List<InventoryCurrent>();

    public virtual ICollection<LossDetail> LossDetails { get; set; } = new List<LossDetail>();

    public virtual ICollection<StockTakeDetail> StockTakeDetails { get; set; } = new List<StockTakeDetail>();

    public virtual ICollection<TransferDetail> TransferDetailFromBins { get; set; } = new List<TransferDetail>();

    public virtual ICollection<TransferDetail> TransferDetailToBins { get; set; } = new List<TransferDetail>();

    public virtual Warehouse Warehouse { get; set; } = null!;
}
