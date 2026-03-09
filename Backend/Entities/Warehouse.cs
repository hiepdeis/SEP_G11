using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

public partial class Warehouse
{
    [Key]
    [Column("WarehouseID")]
    public int WarehouseId { get; set; }

    [StringLength(100)]
    public string Name { get; set; } = null!;

    [StringLength(255)]
    public string? Address { get; set; }

    [InverseProperty("Warehouse")]
    public virtual ICollection<BinLocation> BinLocations { get; set; } = new List<BinLocation>();
    public virtual ICollection<InventoryAdjustmentEntry> InventoryAdjustmentEntries { get; set; } = new List<InventoryAdjustmentEntry>();

    [InverseProperty("Warehouse")]
    public virtual ICollection<InventoryCurrent> InventoryCurrents { get; set; } = new List<InventoryCurrent>();

    [InverseProperty("Warehouse")]
    public virtual ICollection<IssueSlip> IssueSlips { get; set; } = new List<IssueSlip>();

    [InverseProperty("Warehouse")]
    public virtual ICollection<LossReport> LossReports { get; set; } = new List<LossReport>();

    [InverseProperty("Warehouse")]
    public virtual ICollection<Receipt> Receipts { get; set; } = new List<Receipt>();

    [InverseProperty("Warehouse")]
    public virtual ICollection<StockTake> StockTakes { get; set; } = new List<StockTake>();

    [InverseProperty("Warehouse")]
    public virtual ICollection<TransferOrder> TransferOrders { get; set; } = new List<TransferOrder>();

    [InverseProperty("Warehouse")]
    public virtual ICollection<WarehouseCard> WarehouseCards { get; set; } = new List<WarehouseCard>();
    [InverseProperty(nameof(StockTakeLock.Warehouse))]
    public virtual ICollection<StockTakeLock> StockTakeLocks { get; set; } = new List<StockTakeLock>();

}
