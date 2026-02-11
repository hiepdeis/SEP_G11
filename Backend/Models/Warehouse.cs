using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Warehouse
{
    public int WarehouseId { get; set; }

    public string Name { get; set; } = null!;

    public string? Address { get; set; }

    public virtual ICollection<BinLocation> BinLocations { get; set; } = new List<BinLocation>();

    public virtual ICollection<InventoryAdjustmentEntry> InventoryAdjustmentEntries { get; set; } = new List<InventoryAdjustmentEntry>();

    public virtual ICollection<InventoryCurrent> InventoryCurrents { get; set; } = new List<InventoryCurrent>();

    public virtual ICollection<IssueSlip> IssueSlips { get; set; } = new List<IssueSlip>();

    public virtual ICollection<LossReport> LossReports { get; set; } = new List<LossReport>();

    public virtual ICollection<Receipt> Receipts { get; set; } = new List<Receipt>();

    public virtual ICollection<StockTake> StockTakes { get; set; } = new List<StockTake>();

    public virtual ICollection<TransferOrder> TransferOrders { get; set; } = new List<TransferOrder>();
}
