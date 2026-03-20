using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities;

[Table("PurchaseOrderItems")]
public class PurchaseOrderItem
{
    [Key]
    [Column("ItemID")]
    public long ItemId { get; set; }

    [Column("PurchaseOrderID")]
    public long PurchaseOrderId { get; set; }

    [Column("SupplierID")]
    public int? SupplierId { get; set; }

    [Column("MaterialID")]
    public int MaterialId { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal OrderedQuantity { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? UnitPrice { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? LineTotal { get; set; }

    [ForeignKey("PurchaseOrderId")]
    [InverseProperty("Items")]
    public virtual PurchaseOrder PurchaseOrder { get; set; } = null!;

    [ForeignKey("SupplierId")]
    [InverseProperty("PurchaseOrderItems")]
    public virtual Supplier? Supplier { get; set; }

    [ForeignKey("MaterialId")]
    [InverseProperty("PurchaseOrderItems")]
    public virtual Material Material { get; set; } = null!;
}
