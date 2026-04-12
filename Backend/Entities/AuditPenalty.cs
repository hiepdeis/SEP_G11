using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities;

public partial class AuditPenalty
{
    [Key]
    public int PenaltyId { get; set; }

    public int StockTakeId { get; set; }

    /// <summary>Admin who issued the penalty</summary>
    public int IssuedByUserId { get; set; }

    /// <summary>Manager who receives the penalty</summary>
    public int TargetUserId { get; set; }

    [StringLength(500)]
    public string Reason { get; set; } = null!;

    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey("StockTakeId")]
    public virtual StockTake StockTake { get; set; } = null!;

    [ForeignKey("IssuedByUserId")]
    public virtual User IssuedByUser { get; set; } = null!;

    [ForeignKey("TargetUserId")]
    public virtual User TargetUser { get; set; } = null!;
}
