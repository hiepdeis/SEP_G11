using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

[Table("QCCheckDetails")]
public partial class QCCheckDetail
{
    [Key]
    [Column("DetailID")]
    public long DetailId { get; set; }

    [Column("QCCheckID")]
    public long QCCheckId { get; set; }

    [Column("ReceiptDetailID")]
    public long ReceiptDetailId { get; set; }

    /// <summary>"Pass" | "Fail"</summary>
    [Required]
    [StringLength(10)]
    [Unicode(false)]
    public string Result { get; set; } = null!;

    [StringLength(500)]
    public string? FailReason { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal PassQuantity { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal FailQuantity { get; set; }

    /// <summary>Fail quantity due to shortage (OrderedQuantity - PassQuantity)</summary>
    [Column(TypeName = "decimal(18, 4)")]
    public decimal? FailQuantityQuantity { get; set; }

    /// <summary>Fail quantity due to quality defects</summary>
    [Column(TypeName = "decimal(18, 4)")]
    public decimal? FailQuantityQuality { get; set; }

    /// <summary>Fail quantity due to damage</summary>
    [Column(TypeName = "decimal(18, 4)")]
    public decimal? FailQuantityDamage { get; set; }

    // Navigation properties
    [ForeignKey("QCCheckId")]
    [InverseProperty("QCCheckDetails")]
    public virtual QCCheck QCCheck { get; set; } = null!;

    [ForeignKey("ReceiptDetailId")]
    [InverseProperty("QCCheckDetails")]
    public virtual ReceiptDetail ReceiptDetail { get; set; } = null!;
}
