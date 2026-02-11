using System;
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

    [InverseProperty("Bin")]
    public virtual ICollection<InventoryCurrent> InventoryCurrents { get; set; } = new List<InventoryCurrent>();

    [InverseProperty("Bin")]
    public virtual ICollection<LossDetail> LossDetails { get; set; } = new List<LossDetail>();

    [InverseProperty("FromBin")]
    public virtual ICollection<TransferDetail> TransferDetailFromBins { get; set; } = new List<TransferDetail>();

    [InverseProperty("ToBin")]
    public virtual ICollection<TransferDetail> TransferDetailToBins { get; set; } = new List<TransferDetail>();

    [ForeignKey("WarehouseId")]
    [InverseProperty("BinLocations")]
    public virtual Warehouse Warehouse { get; set; } = null!;
}
