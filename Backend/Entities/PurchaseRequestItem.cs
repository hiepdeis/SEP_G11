using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities;

[Table("PurchaseRequestItems")]
public class PurchaseRequestItem
{
    [Key]
    [Column("ItemID")]
    public long ItemId { get; set; }

    [Column("RequestID")]
    public long RequestId { get; set; }

    [Column("MaterialID")]
    public int MaterialId { get; set; }

    [Column("WarehouseID")]
    public int? WarehouseId { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal Quantity { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }

    [ForeignKey("RequestId")]
    [InverseProperty("Items")]
    public virtual PurchaseRequest PurchaseRequest { get; set; } = null!;

    [ForeignKey("MaterialId")]
    [InverseProperty("PurchaseRequestItems")]
    public virtual Material Material { get; set; } = null!;

    [ForeignKey("WarehouseId")]
    [InverseProperty("PurchaseRequestItems")]
    public virtual Warehouse? Warehouse { get; set; }
}
