using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Entities;

[Index("Code", Name = "UQ__Projects__A25C5AA71AE31F84", IsUnique = true)]
public partial class Project
{
    [Key]
    [Column("ProjectID")]
    public int ProjectId { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string Code { get; set; } = null!;

    [StringLength(255)]
    public string Name { get; set; } = null!;

    [Column(TypeName = "datetime")]
    public DateTime? StartDate { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? EndDate { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? Budget { get; set; }

    [StringLength(20)]
    [Unicode(false)]
    public string? Status { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal? BudgetUsed { get; set; }

    [NotMapped]
    public decimal? BudgetRemaining => Budget.HasValue && BudgetUsed.HasValue
    ? Budget - BudgetUsed
    : null;

    [InverseProperty("Project")]
    public virtual ICollection<IssueSlip> IssueSlips { get; set; } = new List<IssueSlip>();

    [InverseProperty("Project")]
    public virtual ICollection<MaterialLossNorm> MaterialLossNorms { get; set; } = new List<MaterialLossNorm>();

    [InverseProperty("Project")]
    public virtual ICollection<PurchaseRequest> PurchaseRequests { get; set; } = new List<PurchaseRequest>();

    [InverseProperty("Project")]
    public virtual ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();
}
