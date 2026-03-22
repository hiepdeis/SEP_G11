using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

[Table("SupplementaryReceiptItems")]
public class SupplementaryReceiptItem
{
    [Key]
    [Column("ItemID")]
    public long ItemId { get; set; }

    [Column("SupplementaryReceiptID")]
    public long SupplementaryReceiptId { get; set; }

    [Column("MaterialID")]
    public int MaterialId { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal SupplementaryQuantity { get; set; }

    [ForeignKey("SupplementaryReceiptId")]
    [InverseProperty("Items")]
    public virtual SupplementaryReceipt SupplementaryReceipt { get; set; } = null!;

    [ForeignKey("MaterialId")]
    [InverseProperty("SupplementaryReceiptItems")]
    public virtual Material Material { get; set; } = null!;
}
