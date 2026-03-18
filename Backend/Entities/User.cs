
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

[Index("Username", Name = "UQ__Users__536C85E41DEBB7A3", IsUnique = true)]
public partial class User
{
    [Key]
    [Column("UserID")]
    public int UserId { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string Username { get; set; } = null!;

    [StringLength(255)]
    [Unicode(false)]
    public string PasswordHash { get; set; } = null!;

    [Column("RoleID")]
    public int RoleId { get; set; }

    [StringLength(100)]
    public string? FullName { get; set; }

    [StringLength(100)]
    [Unicode(false)]
    public string? Email { get; set; }

    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }
    public string? PhoneNumber { get; set; }
    public bool Status { get; set; }
    public virtual ICollection<InventoryAdjustmentEntry> InventoryAdjustmentEntryApprovedByNavigations { get; set; } = new List<InventoryAdjustmentEntry>();

    public virtual ICollection<InventoryAdjustmentEntry> InventoryAdjustmentEntryCreatedByNavigations { get; set; } = new List<InventoryAdjustmentEntry>();


    [InverseProperty("CreatedByNavigation")]
    public virtual ICollection<IssueSlip> IssueSlips { get; set; } = new List<IssueSlip>();

    [InverseProperty("ApprovedByNavigation")]
    public virtual ICollection<LossReport> LossReportApprovedByNavigations { get; set; } = new List<LossReport>();

    [InverseProperty("CreatedByNavigation")]
    public virtual ICollection<LossReport> LossReportCreatedByNavigations { get; set; } = new List<LossReport>();

    [InverseProperty("CreatedByNavigation")]
    public virtual ICollection<MaterialLossNorm> MaterialLossNorms { get; set; } = new List<MaterialLossNorm>();

    [InverseProperty("User")]
    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    [InverseProperty("CreatedByNavigation")]
    public virtual ICollection<Receipt> Receipts { get; set; } = new List<Receipt>();

    [ForeignKey("RoleId")]
    [InverseProperty("Users")]
    public virtual Role Role { get; set; } = null!;

    [InverseProperty(nameof(StockTake.CreatedByNavigation))]
    public virtual ICollection<StockTake> StockTakeCreatedByNavigations { get; set; } = new List<StockTake>();

    

    [InverseProperty(nameof(StockTake.CompletedByNavigation))]
    public virtual ICollection<StockTake> StockTakeCompletedByNavigations { get; set; } = new List<StockTake>();


    public virtual ICollection<StockTakeDetail> StockTakeDetailCountedByNavigations { get; set; } = new List<StockTakeDetail>();

    public virtual ICollection<StockTakeDetail> StockTakeDetailResolvedByNavigations { get; set; } = new List<StockTakeDetail>();



    public virtual ICollection<StockTakeSignature> StockTakeSignatures { get; set; } = new List<StockTakeSignature>();

    public virtual ICollection<StockTakeTeamMember> StockTakeTeamMembers { get; set; } = new List<StockTakeTeamMember>();

    [InverseProperty("AssignedToNavigation")]
    public virtual ICollection<TransferOrder> TransferOrderAssignedToNavigations { get; set; } = new List<TransferOrder>();

    [InverseProperty("CreatedByNavigation")]
    public virtual ICollection<TransferOrder> TransferOrderCreatedByNavigations { get; set; } = new List<TransferOrder>();

    [InverseProperty("CreatedByNavigation")]
    public virtual ICollection<WarehouseCard> WarehouseCards { get; set; } = new List<WarehouseCard>();
    [InverseProperty(nameof(StockTakeLock.LockedByNavigation))]
    public virtual ICollection<StockTakeLock> StockTakeLockLockedByNavigations { get; set; } = new List<StockTakeLock>();

    [InverseProperty(nameof(StockTakeLock.UnlockedByNavigation))]
    public virtual ICollection<StockTakeLock> StockTakeLockUnlockedByNavigations { get; set; } = new List<StockTakeLock>();

    [InverseProperty("CheckedByNavigation")]
    public virtual ICollection<QCCheck> QCChecks { get; set; } = new List<QCCheck>();

    [InverseProperty("CreatedByNavigation")]
    public virtual ICollection<IncidentReport> IncidentReportsCreated { get; set; } = new List<IncidentReport>();

    [InverseProperty("ResolvedByNavigation")]
    public virtual ICollection<IncidentReport> IncidentReportsResolved { get; set; } = new List<IncidentReport>();

}
