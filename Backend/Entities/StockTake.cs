
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Entities;

public partial class StockTake
{
    public int StockTakeId { get; set; }

    public int WarehouseId { get; set; }

    public DateTime? CheckDate { get; set; }

    public int CreatedBy { get; set; }

    public string? Status { get; set; }

    public string? Title { get; set; }

    public DateTime? PlannedStartDate { get; set; }

    public DateTime? PlannedEndDate { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? LockedAt { get; set; }

    public int? LockedBy { get; set; }

    public DateTime? CompletedAt { get; set; }

    public int? CompletedBy { get; set; }

    public string? Notes { get; set; }

 
    public virtual User CreatedByNavigation { get; set; } = null!;

 
    public virtual User? LockedByNavigation { get; set; }


    public virtual User? CompletedByNavigation { get; set; }
   

    

    public virtual ICollection<InventoryAdjustmentEntry> InventoryAdjustmentEntries { get; set; } = new List<InventoryAdjustmentEntry>();

    
    public virtual ICollection<StockTakeDetail> StockTakeDetails { get; set; } = new List<StockTakeDetail>();

    public virtual ICollection<StockTakeSignature> StockTakeSignatures { get; set; } = new List<StockTakeSignature>();

    public virtual ICollection<StockTakeTeamMember> StockTakeTeamMembers { get; set; } = new List<StockTakeTeamMember>();

    public virtual Warehouse Warehouse { get; set; } = null!;
}
