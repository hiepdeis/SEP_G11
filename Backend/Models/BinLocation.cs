using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class BinLocation
{
    public int BinId { get; set; }

    public int? WarehouseId { get; set; }

    public string? Code { get; set; }

    public string? Type { get; set; }

    public virtual ICollection<InventoryCurrent> InventoryCurrents { get; set; } = new List<InventoryCurrent>();

    public virtual ICollection<TransferDetail> TransferDetailFromBins { get; set; } = new List<TransferDetail>();

    public virtual ICollection<TransferDetail> TransferDetailToBins { get; set; } = new List<TransferDetail>();

    public virtual Warehouse? Warehouse { get; set; }
}
