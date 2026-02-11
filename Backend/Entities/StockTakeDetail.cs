using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

public partial class StockTakeDetail
{
    [Key]
    [Column("ID")]
    public long Id { get; set; }

    [Column("StockTakeID")]
    public int StockTakeId { get; set; }

    [Column("MaterialID")]
    public int MaterialId { get; set; }

    [Column("BatchID")]
    public int? BatchId { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal? SystemQty { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal? CountQty { get; set; }

    [Column(TypeName = "decimal(18, 4)")]
    public decimal? Variance { get; set; }

    [StringLength(255)]
    public string? Reason { get; set; }

    [ForeignKey("BatchId")]
    [InverseProperty("StockTakeDetails")]
    public virtual Batch? Batch { get; set; }

    [ForeignKey("MaterialId")]
    [InverseProperty("StockTakeDetails")]
    public virtual Material? Material { get; set; } = null!;

    [ForeignKey("StockTakeId")]
    [InverseProperty("StockTakeDetails")]
    public virtual StockTake? StockTake { get; set; } = null!;

    // Optional (only if your inventory is per-bin)
    public int? BinId { get; set; }


    // Variance reason
    public string? ReasonCode { get; set; }   // e.g. BROKEN / LOST / FOUND / ADMIN_ERROR

    public string? ReasonNote { get; set; }

    // Line status: PendingCount / Counted / Discrepancy / Resolved / etc.
    public string? LineStatus { get; set; }

    // Audit trail for counting
    public int? CountedBy { get; set; }
    public DateTime? CountedAt { get; set; }

    // Reconcile / resolve discrepancy
    public string? ResolutionAction { get; set; } // AdjustToCount / RequestRecount / Ignore / etc.
    public int? ResolvedBy { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string? ManagerNote { get; set; }

    public virtual BinLocation? Bin { get; set; }

    public virtual User? CountedByNavigation { get; set; }
    public virtual User? ResolvedByNavigation { get; set; }



}
