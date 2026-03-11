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

    // Navigation properties
    [ForeignKey("QCCheckId")]
    [InverseProperty("QCCheckDetails")]
    public virtual QCCheck QCCheck { get; set; } = null!;

    [ForeignKey("ReceiptDetailId")]
    [InverseProperty("QCCheckDetails")]
    public virtual ReceiptDetail ReceiptDetail { get; set; } = null!;
}
