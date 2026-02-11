using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class User
{
    public int UserId { get; set; }

    public string Username { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public int RoleId { get; set; }

    public string? FullName { get; set; }

    public string? Email { get; set; }

    public string? RefreshToken { get; set; }

    public DateTime? RefreshTokenExpiry { get; set; }

    public string? PhoneNumber { get; set; }

    public bool Status { get; set; }

    public virtual ICollection<InventoryAdjustmentEntry> InventoryAdjustmentEntryApprovedByNavigations { get; set; } = new List<InventoryAdjustmentEntry>();

    public virtual ICollection<InventoryAdjustmentEntry> InventoryAdjustmentEntryCreatedByNavigations { get; set; } = new List<InventoryAdjustmentEntry>();

    public virtual ICollection<IssueSlip> IssueSlips { get; set; } = new List<IssueSlip>();

    public virtual ICollection<LossReport> LossReportApprovedByNavigations { get; set; } = new List<LossReport>();

    public virtual ICollection<LossReport> LossReportCreatedByNavigations { get; set; } = new List<LossReport>();

    public virtual ICollection<MaterialLossNorm> MaterialLossNorms { get; set; } = new List<MaterialLossNorm>();

    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public virtual ICollection<Receipt> Receipts { get; set; } = new List<Receipt>();

    public virtual Role Role { get; set; } = null!;

    public virtual ICollection<StockTake> StockTakeCompletedByNavigations { get; set; } = new List<StockTake>();

    public virtual ICollection<StockTake> StockTakeCreatedByNavigations { get; set; } = new List<StockTake>();

    public virtual ICollection<StockTakeDetail> StockTakeDetailCountedByNavigations { get; set; } = new List<StockTakeDetail>();

    public virtual ICollection<StockTakeDetail> StockTakeDetailResolvedByNavigations { get; set; } = new List<StockTakeDetail>();

    public virtual ICollection<StockTake> StockTakeLockedByNavigations { get; set; } = new List<StockTake>();

    public virtual ICollection<StockTakeSignature> StockTakeSignatures { get; set; } = new List<StockTakeSignature>();

    public virtual ICollection<StockTakeTeamMember> StockTakeTeamMembers { get; set; } = new List<StockTakeTeamMember>();

    public virtual ICollection<TransferOrder> TransferOrderAssignedToNavigations { get; set; } = new List<TransferOrder>();

    public virtual ICollection<TransferOrder> TransferOrderCreatedByNavigations { get; set; } = new List<TransferOrder>();
    public virtual ICollection<StockTake> StockTakesCreatedBy { get; set; } = new HashSet<StockTake>();
    public virtual ICollection<StockTake> StockTakesLockedBy { get; set; } = new HashSet<StockTake>();
    public virtual ICollection<StockTake> StockTakesCompletedBy { get; set; } = new HashSet<StockTake>();

}
