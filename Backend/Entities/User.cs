using System;
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

    [InverseProperty("CreatedByNavigation")]
    public virtual ICollection<StockTake> StockTakes { get; set; } = new List<StockTake>();

    [InverseProperty("AssignedToNavigation")]
    public virtual ICollection<TransferOrder> TransferOrderAssignedToNavigations { get; set; } = new List<TransferOrder>();

    [InverseProperty("CreatedByNavigation")]
    public virtual ICollection<TransferOrder> TransferOrderCreatedByNavigations { get; set; } = new List<TransferOrder>();
}
