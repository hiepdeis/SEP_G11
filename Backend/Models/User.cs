using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class User
{
    public int UserId { get; set; }

    public string? Username { get; set; }

    public string Email { get; set; } = null!;

    public string? FullName { get; set; }

    public string? PasswordHash { get; set; }

    public int RoleId { get; set; }

    public string? RefreshToken { get; set; }

    public DateTime? RefreshTokenExpiry { get; set; }

    public string? PhoneNumber { get; set; }

    public bool Status { get; set; }

    public virtual Role Role { get; set; } = null!;

    public virtual ICollection<IssueSlip> IssueSlips { get; set; } = new List<IssueSlip>();

    public virtual ICollection<MaterialLossNorm> MaterialLossNorms { get; set; } = new List<MaterialLossNorm>();

    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public virtual ICollection<Receipt> Receipts { get; set; } = new List<Receipt>();

    public virtual ICollection<StockTake> StockTakes { get; set; } = new List<StockTake>();

    public virtual ICollection<TransferOrder> TransferOrderAssignedToNavigations { get; set; } = new List<TransferOrder>();

    public virtual ICollection<TransferOrder> TransferOrderCreatedByNavigations { get; set; } = new List<TransferOrder>();
}