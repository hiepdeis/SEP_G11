
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

public partial class BinLocation
{
    [Key]
    [Column("BinID")]
    public int BinId { get; set; }

    [Column("WarehouseID")]
    public int WarehouseId { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string Code { get; set; } = null!;

    [StringLength(20)]
    [Unicode(false)]
    public string? Type { get; set; }

    [Column("CurrentMaterialID")]
    public int? CurrentMaterialId { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal? MaxStockLevel { get; set; }

    public virtual ICollection<InventoryAdjustmentEntry> InventoryAdjustmentEntries { get; set; } = new List<InventoryAdjustmentEntry>();

    [InverseProperty("Bin")]
    public virtual ICollection<InventoryCurrent> InventoryCurrents { get; set; } = new List<InventoryCurrent>();

    [InverseProperty("Bin")]
    public virtual ICollection<LossDetail> LossDetails { get; set; } = new List<LossDetail>();

    public virtual ICollection<StockTakeBinLocation> StockTakeBinLocations { get; set; } = new List<StockTakeBinLocation>();

    public virtual ICollection<StockTakeDetail> StockTakeDetails { get; set; } = new List<StockTakeDetail>();

    [InverseProperty("BinLocation")]
    public virtual ICollection<ReceiptDetail> ReceiptDetails { get; set; } = new List<ReceiptDetail>();

    [InverseProperty("FromBin")]
    public virtual ICollection<TransferDetail> TransferDetailFromBins { get; set; } = new List<TransferDetail>();

    [InverseProperty("ToBin")]
    public virtual ICollection<TransferDetail> TransferDetailToBins { get; set; } = new List<TransferDetail>();

    [ForeignKey("WarehouseId")]
    [InverseProperty("BinLocations")]
    public virtual Warehouse Warehouse { get; set; } = null!;

    [InverseProperty("Bin")]
    public virtual ICollection<WarehouseCard> WarehouseCards { get; set; } = new List<WarehouseCard>();
    [InverseProperty(nameof(StockTakeLock.Bin))]
    public virtual ICollection<StockTakeLock> StockTakeLocks { get; set; } = new List<StockTakeLock>();

    [InverseProperty("Bin")]
    public virtual ICollection<ReceiptDetailBinAllocation> ReceiptDetailBinAllocations { get; set; } = new List<ReceiptDetailBinAllocation>();
    public virtual ICollection<PickingList> PickingLists { get; set; } = new List<PickingList>();
}
