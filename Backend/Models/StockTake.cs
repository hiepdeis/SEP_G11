using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class StockTake
{
    public int StockTakeId { get; set; }

    
    public string? Title { get; set; }           // optional display title
    public string? Note { get; set; }

    public int? WarehouseId { get; set; }

    // Planning window (audit plan)
    public DateTime? PlannedStartDate { get; set; }
    public DateTime? PlannedEndDate { get; set; }

    
    

    public int? CreatedBy { get; set; }
    public DateTime? CreatedAt { get; set; }

    // Workflow status: Planned / Assigned / Locked / InProgress / WaitingApproval / Completed / etc.
    public string? Status { get; set; }

    // Locking (close book)
    public DateTime? LockedAt { get; set; }
    public int? LockedBy { get; set; }

    // Approval
    public DateTime? ApprovedAt { get; set; }
    public int? ApprovedBy { get; set; }

    // Completion
    public DateTime? CompletedAt { get; set; }
    public int? CompletedBy { get; set; }

    public virtual User? CreatedByNavigation { get; set; }
    public virtual User? LockedByNavigation { get; set; }
    public virtual User? ApprovedByNavigation { get; set; }
    public virtual User? CompletedByNavigation { get; set; }

    public virtual Warehouse? Warehouse { get; set; }

    public virtual ICollection<StockTakeDetail> StockTakeDetails { get; set; } = new List<StockTakeDetail>();

    // NEW: team members assigned to this stocktake
    public virtual ICollection<StockTakeTeamMember> StockTakeAssignments { get; set; } = new List<StockTakeTeamMember>();
}
