using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

[Table("InventoryCurrent")]
public partial class InventoryCurrent
{
    [Key]
    [Column("ID")]
    public long Id { get; set; }

    [Column("WarehouseID")]
    public int WarehouseId { get; set; }

    [Column("BinID")]
    public int BinId { get; set; }

    [Column("MaterialID")]
    public int MaterialId { get; set; }

    [Column("BatchID")]
    public int BatchId { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal? QuantityOnHand { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal? QuantityAllocated { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? LastUpdated { get; set; }

    [ForeignKey("BatchId")]
    [InverseProperty("InventoryCurrents")]
    public virtual Batch Batch { get; set; } = null!;

    [ForeignKey("BinId")]
    [InverseProperty("InventoryCurrents")]
    public virtual BinLocation Bin { get; set; } = null!;

    [ForeignKey("MaterialId")]
    [InverseProperty("InventoryCurrents")]
    public virtual Material Material { get; set; } = null!;

    [ForeignKey("WarehouseId")]
    [InverseProperty("InventoryCurrents")]
    public virtual Warehouse Warehouse { get; set; } = null!;
}
