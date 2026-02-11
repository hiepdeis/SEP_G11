using Backend.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities;

public partial class StockTake
{
    [Key]
    [Column("StockTakeID")]
    public int StockTakeId { get; set; }

    [Column("WarehouseID")]
    public int WarehouseId { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? CheckDate { get; set; }

    public int CreatedBy { get; set; }

    [StringLength(20)]
    [Unicode(false)]
    public string? Status { get; set; }

    [ForeignKey("CreatedBy")]
    [InverseProperty("StockTakes")]
    public virtual User CreatedByNavigation { get; set; } = null!;

    [InverseProperty("StockTake")]
    public virtual ICollection<StockTakeDetail> StockTakeDetails { get; set; } = new List<StockTakeDetail>();

    [ForeignKey("WarehouseId")]
    [InverseProperty("StockTakes")]
    public virtual Warehouse Warehouse { get; set; } = null!;


    public string? Title { get; set; }           // optional display title
    public string? Note { get; set; }

    // Planning window (audit plan)
    public DateTime? PlannedStartDate { get; set; }
    public DateTime? PlannedEndDate { get; set; }

    public DateTime? CreatedAt { get; set; }

    // Locking (close book)
    public DateTime? LockedAt { get; set; }
    public int? LockedBy { get; set; }

    // Approval
    public DateTime? ApprovedAt { get; set; }
    public int? ApprovedBy { get; set; }

    // Completion
    public DateTime? CompletedAt { get; set; }
    public int? CompletedBy { get; set; }

    public virtual User? LockedByNavigation { get; set; }
    public virtual User? ApprovedByNavigation { get; set; }

    public virtual User? CompletedByNavigation { get; set; }

    public virtual ICollection<StockTakeTeamMember> StockTakeAssignments { get; set; } = new List<StockTakeTeamMember>();

}
